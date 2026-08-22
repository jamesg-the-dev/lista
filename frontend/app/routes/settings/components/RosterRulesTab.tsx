import { useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';

import {
  useActiveRosterComplianceConfiguration,
  useUpdateRosterComplianceConfiguration,
  useVenueProfile,
} from '../hooks';
import type { RosterComplianceConfigurationDto } from '../types';
import { blankRosterRulesTabValue, toRosterRulesTabValue } from '../types';
import MealBreakRuleList from './MealBreakRuleList';
import MinorRosterRuleCard from './MinorRosterRuleCard';
import PublicHolidayList from './PublicHolidayList';
import RosterRulesForm from './RosterRulesForm';
import RosterRulesHistoryPanel from './RosterRulesHistoryPanel';

export default function RosterRulesTab({ venueId }: { venueId: string }) {
  const profileQuery = useVenueProfile(venueId);
  const configQuery = useActiveRosterComplianceConfiguration(venueId);
  const updateMutation = useUpdateRosterComplianceConfiguration(venueId);

  const form = useForm({
    defaultValues: blankRosterRulesTabValue(),
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync(value);
    },
  });

  // Sync the form once the config query has resolved (including the "no
  // config yet" null case) — same "adjust state during render" pattern as
  // AwardPayTab.tsx, keyed on venueId rather than a loaded entity's own id
  // since there may be no entity yet.
  const [syncedVenueId, setSyncedVenueId] = useState<string | null>(null);
  const resetFromConfig = (config: RosterComplianceConfigurationDto | null) => {
    setSyncedVenueId(venueId);
    form.reset(toRosterRulesTabValue(config));
  };
  if (configQuery.isSuccess && syncedVenueId !== venueId) {
    resetFromConfig(configQuery.data);
  }

  const loadError = profileQuery.error ?? configQuery.error;
  const isLoading = profileQuery.isLoading || configQuery.isLoading;
  const isError = profileQuery.isError || configQuery.isError;
  const isReady =
    !isLoading && !isError && syncedVenueId === venueId && !!profileQuery.data;
  const isSaving = updateMutation.isPending;
  const venueState = profileQuery.data!.address.state;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roster Rules & Compliance</CardTitle>
        <CardDescription>
          Hard rules (legal minimums) can't be overridden. Soft rules warn and let a
          manager override with a reason when a roster is built.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertTitle>Couldn't load this venue's roster rules</AlertTitle>
            <AlertDescription>
              {loadError instanceof Error ? loadError.message : 'Something went wrong.'}
            </AlertDescription>
          </Alert>
        )}

        {isReady && (
          <div className="flex flex-col gap-6">
            {updateMutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>Couldn't save changes</AlertTitle>
                <AlertDescription>
                  {updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : 'Something went wrong.'}
                </AlertDescription>
              </Alert>
            )}

            <RosterRulesForm form={form} />

            <Separator />

            <MealBreakRuleList form={form} />

            <Separator />

            <MinorRosterRuleCard form={form} />

            <Separator />

            <PublicHolidayList venueId={venueId} state={venueState} />

            <Separator />

            <RosterRulesHistoryPanel venueId={venueId} />
          </div>
        )}
      </CardContent>

      {isReady && (
        <CardFooter className="justify-end gap-2 border-t">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => resetFromConfig(configQuery.data ?? null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="font-semibold"
            disabled={isSaving}
            onClick={() => form.handleSubmit()}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
