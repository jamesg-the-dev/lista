import { Outlet } from "react-router";

import { AppSidebar } from "~/components/shared/AppSidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

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
