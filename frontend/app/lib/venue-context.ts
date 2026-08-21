import { create } from 'zustand';

interface VenueContextState {
  activeVenueId: string;
  setActiveVenueId: (venueId: string) => void;
}

// The active venue a manager has switched into. Read by the venue switcher
// and by any query key that scopes to a venue — see CLAUDE.md
// § State management & data layer, bucket 2 (cross-cutting client state).
//
// Starts empty rather than defaulting to a specific venue: AppLayout's
// clientLoader sets this to the first venue on the current account
// (useCurrentAccount().venues[0]) once the account has loaded, since that's
// the only place a real venue id is known. See CLAUDE.md's TODO under
// § Screens & build order for the plan to make this a per-manager
// preference instead of always "the first venue".
export const useVenueContextStore = create<VenueContextState>(set => ({
  activeVenueId: '',
  setActiveVenueId: venueId => set({ activeVenueId: venueId }),
}));
