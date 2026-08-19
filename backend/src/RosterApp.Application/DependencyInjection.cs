using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using RosterApp.Application.Common;
using RosterApp.Application.Rostering;

namespace RosterApp.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(AssemblyMarker).Assembly);

            // Locked pipeline order: tenant-scoping -> authorization -> audit -> validation.
            cfg.AddOpenBehavior(typeof(TenantScopingBehavior<,>));
            cfg.AddOpenBehavior(typeof(AuthorizationBehavior<,>));
            cfg.AddOpenBehavior(typeof(AuditBehavior<,>));
            cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });

        services.AddValidatorsFromAssembly(typeof(AssemblyMarker).Assembly);

        return services;
    }
}
