using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace RosterApp.Infrastructure;

/// <summary>
/// Used only by `dotnet ef` at design time (migrations add/remove/script).
/// Builds DbContextOptions directly instead of spinning up the full Api
/// host — the host's DI container also wires up auth, MediatR handlers,
/// etc. that have nothing to do with authoring a migration and shouldn't
/// need to resolve cleanly just to run this tooling. Reads the same
/// "ConnectionStrings:Postgres" config key as DependencyInjection.cs, from
/// the Api project's appsettings.json. The base path is resolved from this
/// source file's own compile-time location (not the current directory,
/// which `dotnet ef` sets inconsistently depending on where/how it's
/// invoked) so it works regardless of which directory `dotnet ef` is run
/// from.
/// </summary>
public sealed class RosterDbContextFactory : IDesignTimeDbContextFactory<RosterDbContext>
{
    public RosterDbContext CreateDbContext(string[] args)
    {
        var apiProjectPath = GetApiProjectPath();
        var environment = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ?? "Development";

        var configuration = new ConfigurationBuilder()
            .SetBasePath(apiProjectPath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString =
            configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException(
                $"Connection string \"Postgres\" not found in {Path.Combine(apiProjectPath, "appsettings.json")}."
            );

        var optionsBuilder = new DbContextOptionsBuilder<RosterDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new RosterDbContext(optionsBuilder.Options);
    }

    private static string GetApiProjectPath([CallerFilePath] string sourceFilePath = "")
    {
        var infrastructureProjectDir = Path.GetDirectoryName(sourceFilePath)!;
        var srcDir = Path.GetDirectoryName(infrastructureProjectDir)!;
        return Path.Combine(srcDir, "RosterApp.Api");
    }
}
