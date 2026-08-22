using System.Reflection;
using MediatR;
using RosterApp.Application.Common;

namespace RosterApp.Application.Tests.Common;

/// <summary>
/// Enforces CLAUDE.md's Authorization &amp; permission policy rule: every
/// MediatR command/query in RosterApp.Application must implement exactly
/// one of IRequiresPermissionLevel or IPermitsSelfOrMinimumLevel. A new
/// command added without either interface (or with both) fails this test
/// — the failure means "you forgot to decide this command's access policy,"
/// not "the test is wrong." See AuthorizationBehavior for how these
/// interfaces are enforced at runtime.
/// </summary>
public class PermissionPolicyCoverageTests
{
    private static readonly Assembly ApplicationAssembly = typeof(AssemblyMarker).Assembly;

    [Fact]
    public void every_command_and_query_declares_exactly_one_permission_policy()
    {
        var violators = AllMediatRRequestTypes()
            .Select(type => new
            {
                Type = type,
                HasFlatPolicy = typeof(IRequiresPermissionLevel).IsAssignableFrom(type),
                HasSelfOrTierPolicy = typeof(IPermitsSelfOrMinimumLevel).IsAssignableFrom(type),
            })
            // Violates the rule if it implements neither (false == false) or both (true == true).
            .Where(x => x.HasFlatPolicy == x.HasSelfOrTierPolicy)
            .Select(x => x.Type.Name)
            .OrderBy(name => name)
            .ToList();

        Assert.True(
            violators.Count == 0,
            "Every MediatR command/query must implement exactly one of IRequiresPermissionLevel or "
                + "IPermitsSelfOrMinimumLevel (see CLAUDE.md's Authorization & permission policy section). "
                + $"Violating type(s): {string.Join(", ", violators)}"
        );
    }

    [Fact]
    public void the_reflection_scan_actually_found_commands_and_queries()
    {
        // Guards against AllMediatRRequestTypes() silently matching zero
        // types (e.g. a MediatR upgrade changing IRequest's shape), which
        // would make the coverage test above pass vacuously.
        Assert.True(
            AllMediatRRequestTypes().Count() > 50,
            "Expected to find the full set of MediatR commands/queries in RosterApp.Application — "
                + "found none or very few, which likely means the reflection scan itself is broken."
        );
    }

    private static IEnumerable<Type> AllMediatRRequestTypes() =>
        ApplicationAssembly
            .GetTypes()
            .Where(type => type is { IsClass: true, IsAbstract: false })
            .Where(ImplementsAMediatRRequestInterface);

    private static bool ImplementsAMediatRRequestInterface(Type type) =>
        type.GetInterfaces()
            .Any(i =>
                i == typeof(IRequest)
                || (i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IRequest<>))
            );
}
