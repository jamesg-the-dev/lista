import { Outlet, redirect } from "react-router";

import { AppSidebar } from "~/components/shared/AppSidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { currentAccountQueryOptions } from "~/lib/account/hooks";
import { queryClient } from "~/lib/query-client";
import { supabase } from "~/lib/supabase-client";
import { useVenueContextStore } from "~/lib/venue-context";

// Runs before any authenticated route renders (SSR is disabled for this app
// — see react-router.config.ts — so this is the first and only chance to
// gate on auth). Ensures /api/account/me has resolved and is sitting in the
// TanStack Query cache before content loads, so every descendant's
// useCurrentAccount() call reads it synchronously instead of re-fetching.
export async function clientLoader() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect("/login");
  }

  let account;
  try {
    account = await queryClient.ensureQueryData(currentAccountQueryOptions);
  } catch {
    throw redirect("/login");
  }

  // Default the active venue to the first one on the account. There's no
  // per-manager "default venue" preference yet (see CLAUDE.md's TODO under
  // § Screens & build order), so "first in the list" is a placeholder for
  // that. Also re-defaults if the stored venue id isn't one of this
  // account's venues (e.g. a stale id from a previous session/org).
  const { activeVenueId, setActiveVenueId } = useVenueContextStore.getState();
  const hasValidActiveVenue = account.venues.some((v) => v.venueId === activeVenueId);
  if (!hasValidActiveVenue && account.venues.length > 0) {
    setActiveVenueId(account.venues[0].venueId);
  }
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
