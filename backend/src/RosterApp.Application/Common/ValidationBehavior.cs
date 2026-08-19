using FluentValidation;
using MediatR;

namespace RosterApp.Application.Common;

/// <summary>
/// Fourth and final pipeline stage. Runs all registered FluentValidation
/// validators for TRequest and throws FluentValidation.ValidationException
/// if any fail — this is a distinct concern from IRosterComplianceValidator
/// (Phase 3), which attaches warnings to a successful response instead of
/// throwing. Don't conflate the two.
/// </summary>
public sealed class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (validators.Any())
        {
            var context = new ValidationContext<TRequest>(request);

            var failures = (await Task.WhenAll(validators.Select(v => v.ValidateAsync(context, cancellationToken))))
                .SelectMany(result => result.Errors)
                .Where(failure => failure is not null)
                .ToList();

            if (failures.Count > 0)
            {
                throw new ValidationException(failures);
            }
        }

        return await next();
    }
}
