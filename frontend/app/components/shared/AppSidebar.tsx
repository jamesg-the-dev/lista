import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  LineChartIcon,
  UsersIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";

const navItems = [
  { title: "Roster", url: "/roster", icon: CalendarDaysIcon },
  { title: "Dashboard", url: "/dashboard", icon: LineChartIcon },
  { title: "Staff", url: "/staff", icon: UsersIcon },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { state, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleSidebar}
        className="absolute top-1/2 right-0 z-20 hidden size-6 -translate-y-1/2 translate-x-1/2 rounded-full bg-background p-0 shadow-sm active:not-aria-[haspopup]:-translate-y-1/2 md:flex"
      >
        <ChevronLeftIcon
          className={cn(
            "size-3.5 transition-transform",
            state === "collapsed" && "rotate-180"
          )}
        />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
      <SidebarHeader>
        <span className="px-2 text-sm font-semibold group-data-[collapsible=icon]:hidden">
          Hospo Roster
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      render={<NavLink to={item.url} />}
                      isActive={pathname === item.url}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
