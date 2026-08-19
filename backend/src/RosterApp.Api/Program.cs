var builder = WebApplication.CreateBuilder(args);

// TODO: builder.Services.AddDbContext<RosterDbContext>(opts =>
//     opts.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));
//   Connection string points at Supabase's Postgres instance in all environments;
//   local dev can point at a local Postgres or a Supabase dev project.

// TODO: builder.Services.AddMediatR(cfg =>
//     cfg.RegisterServicesFromAssembly(typeof(RosterApp.Application.AssemblyMarker).Assembly));

// TODO: register MediatR pipeline behaviors here (in this order):
//   1. Tenant-scoping behavior (resolves org/venue from auth context, applies to all queries/commands)
//   2. Permission/authorization behavior
//   3. Audit interceptor (append-only audit trail on state-changing commands)
//   4. Validation behavior

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
