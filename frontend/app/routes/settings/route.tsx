import { ChevronDownIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useVenueContextStore } from '~/lib/venue-context';

import AwardPayTab from './components/AwardPayTab';
import RosterRulesTab from './components/RosterRulesTab';
import StaffRolesTab from './components/StaffRolesTab';
import VenueProfileTab from './components/VenueProfileTab';
import { useVenues } from './hooks';

// Settings → Venue Profile / Award & Pay / Roster Rules / Staff & Roles, per
// docs/features/feature-order.md. All four sections now have a backend (see
// docs/features/FEATURE_SETTINGS_VENUE_PROFILE.md,
// FEATURE_SETTINGS_AWARD_PAY_CONFIG.md,
// FEATURE_SETTINGS_ROSTER_RULES_COMPLIANCE.md and
// FEATURE_SETTINGS_STAFF_ROLES.md).
const SETTINGS_TABS = [
  { value: 'venue-profile', label: 'Venue Profile' },
  { value: 'award-pay', label: 'Award & Pay' },
  { value: 'roster-rules', label: 'Roster Rules' },
  { value: 'staff-roles', label: 'Staff & Roles' },
] as const;

export default function SettingsRoute() {
  const { activeVenueId, setActiveVenueId } = useVenueContextStore();
  const venuesQuery = useVenues();
  const activeVenue = venuesQuery.data?.find(v => v.id === activeVenueId);

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full flex-col font-sans">
      <header className="border-border bg-card sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
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
              {(venuesQuery.data ?? []).map(v => (
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
          <div className="border-border hidden border-l pl-4 md:block">
            <p className="font-sans text-sm font-semibold">Settings</p>
            <p className="text-muted-foreground text-xs">
              Business profile, pay rules and compliance for this venue
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <Tabs defaultValue="venue-profile">
            <TabsList>
              {SETTINGS_TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="venue-profile" className="mt-6">
              {activeVenueId && <VenueProfileTab venueId={activeVenueId} />}
            </TabsContent>

            <TabsContent value="award-pay" className="mt-6">
              {activeVenueId && <AwardPayTab venueId={activeVenueId} />}
            </TabsContent>

            <TabsContent value="roster-rules" className="mt-6">
              {activeVenueId && <RosterRulesTab venueId={activeVenueId} />}
            </TabsContent>

            <TabsContent value="staff-roles" className="mt-6">
              {activeVenueId && <StaffRolesTab venueId={activeVenueId} />}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
