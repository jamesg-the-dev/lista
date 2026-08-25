using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RosterApp.Application.Account;
using RosterApp.Application.AwardConfig;
using RosterApp.Application.Common;
using RosterApp.Application.LabourCost;
using RosterApp.Application.Rostering;
using RosterApp.Application.RosterCompliance;
using RosterApp.Application.Staffing;
using RosterApp.Application.Tenancy;
using RosterApp.Application.Timekeeping;
using RosterApp.Infrastructure.Account;
using RosterApp.Infrastructure.Auditing;
using RosterApp.Infrastructure.AwardCalculator;
using RosterApp.Infrastructure.AwardConfig;
using RosterApp.Infrastructure.ComplianceValidator;
using RosterApp.Infrastructure.LabourCost;
using RosterApp.Infrastructure.Persistence;
using RosterApp.Infrastructure.Rostering;
using RosterApp.Infrastructure.RosterCompliance;
using RosterApp.Infrastructure.Staffing;
using RosterApp.Infrastructure.Tenancy;
using RosterApp.Infrastructure.Timekeeping;

namespace RosterApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<AuditSaveChangesInterceptor>();

        services.AddDbContext<RosterDbContext>((sp, options) =>
            options.UseNpgsql(configuration.GetConnectionString("Postgres"))
                .AddInterceptors(sp.GetRequiredService<AuditSaveChangesInterceptor>()));

        services.AddScoped<IAccountLookup, AccountLookup>();
        services.AddScoped<IShiftRepository, ShiftRepository>();
        services.AddScoped<IRosterLookup, RosterLookup>();
        services.AddScoped<IBudgetSummaryLookup, BudgetSummaryLookup>();
        services.AddScoped<ISwapRequestRepository, SwapRequestRepository>();
        services.AddScoped<ISwapRequestLookup, SwapRequestLookup>();
        services.AddScoped<ILabourCostLookup, LabourCostLookup>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<HospitalityGeneralAwardRateCalculator>();
        services.AddScoped<FastFoodIndustryAwardRateCalculator>();
        services.AddScoped<RestaurantIndustryAwardRateCalculator>();
        services.AddScoped<IAwardRateCalculatorFactory, AwardRateCalculatorFactory>();
        services.AddScoped<IAwardCalculationRateLookup, AwardCalculationRateLookup>();
        services.AddScoped<IRosterComplianceValidator, HospitalityGeneralAwardComplianceValidator>();
        services.AddScoped<IVenueRepository, VenueRepository>();
        services.AddScoped<IVenueLookup, VenueLookup>();
        services.AddScoped<IOrganisationRepository, OrganisationRepository>();

        services.AddScoped<IAwardConfigurationRepository, AwardConfigurationRepository>();
        services.AddScoped<IAwardConfigurationLookup, AwardConfigurationLookup>();
        services.AddScoped<IAwardReferenceDataLookup, AwardReferenceDataLookup>();
        services.AddScoped<IRoleAwardMappingRepository, RoleAwardMappingRepository>();
        services.AddScoped<IRoleAwardMappingLookup, RoleAwardMappingLookup>();

        services.AddScoped<IRosterComplianceConfigurationRepository, RosterComplianceConfigurationRepository>();
        services.AddScoped<IRosterComplianceConfigurationLookup, RosterComplianceConfigurationLookup>();
        services.AddScoped<IPublicHolidayLookup, PublicHolidayLookup>();
        services.AddScoped<IVenueHolidayOverrideRepository, VenueHolidayOverrideRepository>();
        services.AddScoped<IVenueHolidayOverrideLookup, VenueHolidayOverrideLookup>();
        services.AddScoped<IRosterComplianceThresholdsLookup, RosterComplianceThresholdsLookup>();

        services.AddScoped<IStaffMemberRepository, StaffMemberRepository>();
        services.AddScoped<IStandingUnavailabilityRepository, StandingUnavailabilityRepository>();
        services.AddScoped<ILeaveRequestRepository, LeaveRequestRepository>();
        services.AddScoped<IStaffLookup, StaffLookup>();
        services.AddScoped<IStaffAvailabilityChecker, StaffAvailabilityChecker>();
        services.AddScoped<IStaffUniquenessChecker, StaffUniquenessChecker>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IRoleLookup, RoleLookup>();
        services.AddScoped<IRoleUniquenessChecker, RoleUniquenessChecker>();

        services.AddScoped<ITimeEntryRepository, TimeEntryRepository>();
        services.AddScoped<ITimeEntryLookup, TimeEntryLookup>();

        return services;
    }
}
