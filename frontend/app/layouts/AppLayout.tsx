import { Outlet, redirect } from "react-router";

import { AppSidebar } from "~/components/shared/AppSidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { currentAccountQueryOptions } from "~/lib/account/hooks";
import { queryClient } from "~/lib/query-client";
import { supabase } from "~/lib/supabase-client";

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

  try {
    await queryClient.ensureQueryData(currentAccountQueryOptions);
  } catch {
    throw redirect("/login");
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
