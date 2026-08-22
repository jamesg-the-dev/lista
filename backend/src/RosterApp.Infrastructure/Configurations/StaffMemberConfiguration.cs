using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RosterApp.Domain.Staffing;
using RosterApp.Domain.ValueObjects;

namespace RosterApp.Infrastructure.Configurations;

public sealed class StaffMemberConfiguration : IEntityTypeConfiguration<StaffMember>
{
    public void Configure(EntityTypeBuilder<StaffMember> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.OrganisationId).IsRequired();
        builder.Property(s => s.Name).IsRequired().HasMaxLength(200);
        builder.Property(s => s.Email).IsRequired().HasMaxLength(320);

        // PhoneNumber always normalizes to E.164 (max 16 chars: '+' plus up
        // to 15 digits) before it reaches here — see PhoneNumber.Create.
        var phoneNumberComparer = new ValueComparer<PhoneNumber>(
            (left, right) => left!.Value == right!.Value,
            phone => phone.Value.GetHashCode(),
            phone => PhoneNumber.Create(phone.Value, "AU"));

        builder.Property(s => s.Phone)
            .HasConversion(
                phone => phone.Value,
                value => PhoneNumber.Create(value, "AU"),
                phoneNumberComparer)
            .IsRequired()
            .HasMaxLength(16);

        builder.Property(s => s.EmploymentType).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.Classification).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.SupabaseUserId).HasMaxLength(100);

        // DateOfBirth has no default — every pre-existing row is backfilled
        // in the StaffRolesSettings migration (see its Up method) since the
        // column is required going forward but didn't exist before this
        // build-order step (see StaffMember.DateOfBirth's doc comment).
        builder.Property(s => s.DateOfBirth).IsRequired();

        builder.Property(s => s.PermissionLevel)
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(PermissionLevel.Staff);

        builder.Property(s => s.IsActive).IsRequired().HasDefaultValue(true);

        builder.HasIndex(s => s.PrimaryRoleId);

        builder
            .HasOne<Role>()
            .WithMany()
            .HasForeignKey(s => s.PrimaryRoleId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.OwnsOne(s => s.PayRateOverride, override_ =>
        {
            override_.Property(o => o.OverrideHourlyRate).HasColumnName("OverrideHourlyRate").HasPrecision(8, 2);
            override_.Property(o => o.Reason).HasColumnName("OverrideReason").HasMaxLength(500);
            override_.Property(o => o.EffectiveFromUtc).HasColumnName("OverrideEffectiveFromUtc");
            override_.Property(o => o.SetByStaffMemberId).HasColumnName("OverrideSetByStaffMemberId");
        });

        // DB-level backstop for the async uniqueness check in
        // CreateStaffMemberCommandValidator/UpdateStaffMemberCommandValidator
        // — scoped per-organisation, not globally, so two unrelated
        // tenants can't collide on the same email/phone. Phone's index is
        // partial (only rows with a phone) so it stays correct if Phone
        // ever becomes optional later; Phone is required today, so this is
        // currently equivalent to a full unique index.
        builder.HasIndex(s => new { s.OrganisationId, s.Email }).IsUnique();
        builder.HasIndex(s => new { s.OrganisationId, s.Phone })
            .IsUnique()
            .HasFilter("\"Phone\" IS NOT NULL");

        // Global (not per-organisation) uniqueness — one Supabase Auth
        // account belongs to at most one StaffMember. Partial so unlinked
        // rows (the common case until a staff member activates the app)
        // don't collide on NULL.
        builder.HasIndex(s => s.SupabaseUserId)
            .IsUnique()
            .HasFilter("\"SupabaseUserId\" IS NOT NULL");

        // Postgres-level backstop for PhoneNumber's E.164 invariant, in
        // case a write ever bypasses the domain/validator layer.
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_StaffMembers_Phone_E164",
            "\"Phone\" ~ '^\\+[1-9]\\d{6,14}$'"));

        // Owned child table (same pattern as Shift.AwardBreakdown), not a
        // native Postgres array — see StaffMemberVenueAssignment's doc
        // comment for why. Indexed on VenueId for the reverse lookup
        // GetStaffForVenueQuery needs.
        builder.OwnsMany(s => s.VenueAssignments, assignment =>
        {
            assignment.ToTable("StaffMemberVenueAssignments");
            assignment.WithOwner().HasForeignKey("StaffMemberId");
            assignment.HasKey("StaffMemberId", "VenueId");
            assignment.HasIndex(a => a.VenueId);
        });
    }
}
