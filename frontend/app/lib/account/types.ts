// Wire + view-model types for GET /api/account/me
// (backend/src/RosterApp.Api/Controllers/AccountController.cs ->
// GetCurrentAccountQuery / AccountDto). Lives under app/lib rather than a
// route directory because account/session identity is a cross-route
// concern — see CLAUDE.md § State management & data layer.
//
// No enum or date fields on this DTO, so the wire and view-model shapes are
// identical; still aliased separately (not just re-exported) so a future
// backend change to this DTO doesn't silently change the view model too.

export interface AccountVenueDto {
  venueId: string;
  name: string;
}

export interface AccountDto {
  managerId: string;
  organisationId: string;
  name: string;
  email: string;
  venues: AccountVenueDto[];
}

export interface AccountVenue {
  venueId: string;
  name: string;
}

export interface Account {
  managerId: string;
  organisationId: string;
  name: string;
  email: string;
  venues: AccountVenue[];
}

export function mapAccount(dto: AccountDto): Account {
  return {
    managerId: dto.managerId,
    organisationId: dto.organisationId,
    name: dto.name,
    email: dto.email,
    venues: dto.venues.map(v => ({ venueId: v.venueId, name: v.name })),
  };
}
