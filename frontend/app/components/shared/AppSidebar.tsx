import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  LineChartIcon,
  UsersIcon,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '~/components/ui/sidebar';
import { NavUser } from './NavUser';
import { useCurrentAccount } from '~/lib/account/hooks';
import { Button } from '../ui/button';
import { cn } from '~/lib/utils';

const navItems = [
  { title: 'Roster', url: '/roster', icon: CalendarDaysIcon },
  { title: 'Dashboard', url: '/dashboard', icon: LineChartIcon },
  { title: 'Staff', url: '/staff', icon: UsersIcon },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const user = {
    ...useCurrentAccount().data!,
    avatar: '',
  };

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <span className="px-2 text-sm font-semibold group-data-[collapsible=icon]:hidden">
          Hospo Roster
        </span>
      </SidebarHeader>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleSidebar}
        className="bg-background absolute top-1/2 right-1.75 z-20 hidden size-6 translate-x-1/2 -translate-y-1/2 rounded-full p-0 shadow-sm active:not-aria-[haspopup]:-translate-y-1/2 md:flex"
      >
        <ChevronLeftIcon
          className={cn(
            'size-3.5 transition-transform',
            state === 'collapsed' && 'rotate-180',
          )}
        />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => {
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
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
