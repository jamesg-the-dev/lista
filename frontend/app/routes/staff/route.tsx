import { useNavigate } from 'react-router';
import StaffList from './components/StaffList';
import { Button } from '~/components/ui/button';
import { ChevronDownIcon, PlusIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '~/components/ui/dropdown-menu';
import { useVenueContextStore } from '~/lib/venue-context';
import { useVenues } from './hooks';
import { usePageTitle } from '~/lib/utils';
import { Separator } from '~/components/ui/separator';

export default function StaffRoute() {
  const navigate = useNavigate();
  usePageTitle('Staff');
  const { activeVenueId, setActiveVenueId } = useVenueContextStore();

  const venuesQuery = useVenues();

  const activeVenue = venuesQuery.data?.find(v => v.id === activeVenueId);

  const venues = venuesQuery.data ?? [];

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full flex-col font-sans">
      <header className="border-border bg-card sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          {venues.length > 1 && (
            <>
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
              <Separator orientation="vertical" />
            </>
          )}

          <div>
            <p className="font-sans text-sm font-semibold">Staff & availability</p>
            <p className="text-muted-foreground text-xs">
              Profiles, pay tiers and leave for this venue
            </p>
          </div>
        </div>

        <Button
          variant="default"
          className="font-semibold"
          onClick={() => navigate('/staff/new')}
        >
          <PlusIcon size={14} />
          Add staff member
        </Button>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-2">
          <StaffList />
        </div>
      </main>
    </div>
  );
}
