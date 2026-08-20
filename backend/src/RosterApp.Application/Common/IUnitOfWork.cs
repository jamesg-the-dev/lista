namespace RosterApp.Application.Common;

/// <summary>
/// Commits changes tracked by repositories in a single SaveChanges call.
/// Kept separate from repository interfaces so a command handler can stage
/// changes across more than one aggregate (once more than one exists in a
/// single transaction) without a repository owning the commit itself.
/// </summary>
public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
