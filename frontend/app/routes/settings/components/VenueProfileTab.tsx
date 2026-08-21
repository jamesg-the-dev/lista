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

import { useUpdateVenueProfile, useUpdateVenueTradingHours, useVenueProfile } from '../hooks';
import type { VenueProfile, VenueProfileTabValue } from '../types';
import { toVenueProfileTabValue } from '../types';
import TradingHoursEditor from './TradingHoursEditor';
import VenueProfileForm from './VenueProfileForm';

function blankFormValue(): VenueProfileTabValue {
  return {
    name: '',
    abn: '',
    addressLine1: '',
    addressLine2: '',
    suburb: '',
    state: 'VIC',
    postcode: '',
    timezone: 'Australia/Melbourne',
    tradingHours: [],
  };
}

export default function VenueProfileTab({ venueId }: { venueId: string }) {
  const profileQuery = useVenueProfile(venueId);
  const updateProfileMutation = useUpdateVenueProfile(venueId);
  const updateTradingHoursMutation = useUpdateVenueTradingHours(venueId);

  const form = useForm({
    defaultValues: blankFormValue(),
    onSubmit: async ({ value }) => {
      await Promise.all([
        updateProfileMutation.mutateAsync(value),
        updateTradingHoursMutation.mutateAsync(value.tradingHours),
      ]);
    },
  });

  // Sync the form once the profile has loaded, following React's "adjust
  // state during render" pattern instead of an Effect — same approach as
  // StaffProfile.tsx's syncedStaffId.
  const [syncedVenueId, setSyncedVenueId] = useState<string | null>(null);
  const resetFromProfile = (profile: VenueProfile) => {
    setSyncedVenueId(profile.id);
    form.reset(toVenueProfileTabValue(profile));
  };
  if (profileQuery.data && profileQuery.data.id !== syncedVenueId) {
    resetFromProfile(profileQuery.data);
  }

  const isSaving = updateProfileMutation.isPending || updateTradingHoursMutation.isPending;
  const saveError = updateProfileMutation.error ?? updateTradingHoursMutation.error;
  const isReady = !profileQuery.isLoading && !profileQuery.isError && !!syncedVenueId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Venue Profile</CardTitle>
        <CardDescription>
          Core business details for rosters, payroll exports and compliance calculations.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {profileQuery.isLoading && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {profileQuery.isError && (
          <Alert variant="destructive">
            <AlertTitle>Couldn't load this venue's profile</AlertTitle>
            <AlertDescription>
              {profileQuery.error instanceof Error
                ? profileQuery.error.message
                : 'Something went wrong.'}
            </AlertDescription>
          </Alert>
        )}

        {isReady && (
          <div className="flex flex-col gap-6">
            {saveError && (
              <Alert variant="destructive">
                <AlertTitle>Couldn't save changes</AlertTitle>
                <AlertDescription>
                  {saveError instanceof Error ? saveError.message : 'Something went wrong.'}
                </AlertDescription>
              </Alert>
            )}

            <VenueProfileForm form={form} />
            <Separator />
            <TradingHoursEditor form={form} />
          </div>
        )}
      </CardContent>

      {isReady && (
        <CardFooter className="justify-end gap-2 border-t">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => profileQuery.data && resetFromProfile(profileQuery.data)}
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
