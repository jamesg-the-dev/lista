using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RosterApp.Application.Account;
using RosterApp.Application.Common;
using RosterApp.Application.Rostering;
using RosterApp.Infrastructure.Account;
using RosterApp.Infrastructure.Auditing;
using RosterApp.Infrastructure.AwardCalculator;
using RosterApp.Infrastructure.Persistence;
using RosterApp.Infrastructure.Rostering;

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
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IAwardRateCalculator, HospitalityGeneralAwardRateCalculator>();

        return services;
    }
}
