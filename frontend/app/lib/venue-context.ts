import { create } from "zustand";

interface VenueContextState {
  activeVenueId: string;
  setActiveVenueId: (venueId: string) => void;
}

// The active venue a manager has switched into. Read by the venue switcher
// and by any query key that scopes to a venue — see CLAUDE.md
// § State management & data layer, bucket 2 (cross-cutting client state).
export const useVenueContextStore = create<VenueContextState>((set) => ({
  activeVenueId: "v1",
  setActiveVenueId: (venueId) => set({ activeVenueId: venueId }),
}));
