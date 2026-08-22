using MediatR;
using RosterApp.Application.Common;
using RosterApp.Domain.Staffing;

namespace RosterApp.Application.Tests.Common;

public class AuthorizationBehaviorTests
{
    private static readonly Guid CallerId = Guid.NewGuid();
    private static readonly Guid OtherStaffMemberId = Guid.NewGuid();

    [Fact]
    public async Task unauthenticated_caller_is_rejected_regardless_of_the_requests_own_policy()
    {
        var behavior = new AuthorizationBehavior<NoMinimumRequest, string>(
            new FakeTenantContext { IsAuthenticated = false });

        await Assert.ThrowsAsync<ForbiddenAccessException>(
            () => behavior.Handle(new NoMinimumRequest(), Next, CancellationToken.None));
    }

    [Fact]
    public async Task request_with_no_minimum_tier_passes_for_any_authenticated_caller()
    {
        var behavior = new AuthorizationBehavior<NoMinimumRequest, string>(
            new FakeTenantContext { IsAuthenticated = true, PermissionLevel = null });

        var result = await behavior.Handle(new NoMinimumRequest(), Next, CancellationToken.None);

        Assert.Equal("ok", result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(PermissionLevel.Staff)]
    public async Task flat_minimum_tier_rejects_a_caller_below_the_threshold(PermissionLevel? callerLevel)
    {
        var behavior = new AuthorizationBehavior<RequiresManagerRequest, string>(
            new FakeTenantContext { IsAuthenticated = true, PermissionLevel = callerLevel });

        await Assert.ThrowsAsync<ForbiddenAccessException>(
            () => behavior.Handle(new RequiresManagerRequest(), Next, CancellationToken.None));
    }

    [Theory]
    [InlineData(PermissionLevel.Manager)]
    [InlineData(PermissionLevel.Owner)]
    public async Task flat_minimum_tier_allows_a_caller_at_or_above_the_threshold(PermissionLevel callerLevel)
    {
        var behavior = new AuthorizationBehavior<RequiresManagerRequest, string>(
            new FakeTenantContext { IsAuthenticated = true, PermissionLevel = callerLevel });

        var result = await behavior.Handle(new RequiresManagerRequest(), Next, CancellationToken.None);

        Assert.Equal("ok", result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(PermissionLevel.Staff)]
    public async Task self_or_tier_allows_the_resource_owner_regardless_of_their_own_tier(PermissionLevel? callerLevel)
    {
        var behavior = new AuthorizationBehavior<SelfOrSupervisorRequest, string>(
            new FakeTenantContext { IsAuthenticated = true, StaffMemberId = CallerId, PermissionLevel = callerLevel });

        var result = await behavior.Handle(
            new SelfOrSupervisorRequest(CallerId), Next, CancellationToken.None);

        Assert.Equal("ok", result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(PermissionLevel.Staff)]
    public async Task self_or_tier_rejects_a_too_low_tier_acting_on_someone_else(PermissionLevel? callerLevel)
    {
        var behavior = new AuthorizationBehavior<SelfOrSupervisorRequest, string>(
            new FakeTenantContext { IsAuthenticated = true, StaffMemberId = CallerId, PermissionLevel = callerLevel });

        await Assert.ThrowsAsync<ForbiddenAccessException>(
            () => behavior.Handle(new SelfOrSupervisorRequest(OtherStaffMemberId), Next, CancellationToken.None));
    }

    [Theory]
    [InlineData(PermissionLevel.Supervisor)]
    [InlineData(PermissionLevel.Manager)]
    [InlineData(PermissionLevel.Owner)]
    public async Task self_or_tier_allows_a_high_enough_tier_acting_on_someone_else(PermissionLevel callerLevel)
    {
        var behavior = new AuthorizationBehavior<SelfOrSupervisorRequest, string>(
            new FakeTenantContext { IsAuthenticated = true, StaffMemberId = CallerId, PermissionLevel = callerLevel });

        var result = await behavior.Handle(
            new SelfOrSupervisorRequest(OtherStaffMemberId), Next, CancellationToken.None);

        Assert.Equal("ok", result);
    }

    private static Task<string> Next() => Task.FromResult("ok");

    private sealed record NoMinimumRequest : IRequest<string>, IRequiresPermissionLevel
    {
        public PermissionLevel? MinimumPermissionLevel => null;
    }

    private sealed record RequiresManagerRequest : IRequest<string>, IRequiresPermissionLevel
    {
        public PermissionLevel? MinimumPermissionLevel => PermissionLevel.Manager;
    }

    private sealed record SelfOrSupervisorRequest(Guid TargetStaffMemberId) : IRequest<string>, IPermitsSelfOrMinimumLevel
    {
        public PermissionLevel MinimumPermissionLevelForOthers => PermissionLevel.Supervisor;
    }

    private sealed class FakeTenantContext : ICurrentTenantContext
    {
        public bool IsAuthenticated { get; set; }
        public Guid OrganisationId { get; set; }
        public IReadOnlyCollection<Guid> AccessibleVenueIds { get; set; } = [];
        public Guid? StaffMemberId { get; set; }
        public PermissionLevel? PermissionLevel { get; set; }
        public string? SupabaseUserId { get; set; }
        public string? Email { get; set; }
    }
}
