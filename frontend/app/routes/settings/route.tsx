import {
  Bell,
  Building2,
  ChevronDownIcon,
  FileSpreadsheet,
  MapPinned,
  PiggyBank,
  ShieldCheck,
  Wallet,
  Users,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { cn } from '~/lib/utils';
import { useVenueContextStore } from '~/lib/venue-context';

import { useVenues } from './hooks';

const SETTINGS_NAV_ITEMS = [
  { to: 'venue-profile', label: 'Venue Profile', icon: Building2 },
  { to: 'award-pay', label: 'Award & Pay', icon: Wallet },
  { to: 'roster-rules', label: 'Roster Rules', icon: ShieldCheck },
  { to: 'staff-roles', label: 'Staff & Roles', icon: Users },
] as const;

// Visible so the nav communicates the settings section's full scope, but not
// yet routed or clickable — see CLAUDE.md § Screens & build order, steps 4-7.
const COMING_SOON_NAV_ITEMS = [
  { label: 'Notifications', icon: Bell },
  { label: 'Labour & Budgeting', icon: PiggyBank },
  { label: 'Payroll Export', icon: FileSpreadsheet },
  { label: 'GPS Clock-in', icon: MapPinned },
] as const;

export default function SettingsLayout() {
  const { activeVenueId, setActiveVenueId } = useVenueContextStore();
  const venuesQuery = useVenues();
  const venues = venuesQuery.data ?? [];
  const activeVenue = venues.find(v => v.id === activeVenueId);

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full flex-col font-sans">
      <header className="border-border bg-card sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          {venues.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="bg-muted h-auto gap-2 rounded-lg px-3 py-2"
                  />
                }
              >
                <span className="bg-foreground h-2 w-2 shrink-0 rounded-full" />
                <div className="text-left">
                  <p className="font-sans text-sm leading-tight font-semibold uppercase">
                    {activeVenue?.name ?? 'Loading venue…'}
                  </p>
                </div>
                <ChevronDownIcon
                  size={14}
                  className="text-muted-foreground ml-1 shrink-0"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-muted w-64">
                {venues.map(v => (
                  <DropdownMenuItem
                    key={v.id}
                    onClick={() => setActiveVenueId(v.id)}
                    className="justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{v.name}</p>
                    </div>
                    {v.id === activeVenueId && (
                      <span className="bg-foreground h-1.5 w-1.5 rounded-full" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <div className={cn(venues.length > 1 && 'border-border border-l pl-4')}>
            <p className="font-sans text-sm font-semibold">Settings</p>
            <p className="text-muted-foreground text-xs">
              Business profile, pay rules and compliance for this venue
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 items-start gap-8 px-6 py-6">
        <nav className="sticky top-20 w-56 shrink-0">
          <ul className="flex flex-col gap-0.5">
            {SETTINGS_NAV_ITEMS.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <Separator className="my-3" />

          <ul className="flex flex-col gap-0.5">
            {COMING_SOON_NAV_ITEMS.map(item => (
              <li key={item.label}>
                <span className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[10px] tracking-wide uppercase">
                    Soon
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
