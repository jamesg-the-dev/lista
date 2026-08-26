import { useEffect, useState } from 'react';
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { toast } from '~/components/ui/toast';
import { getApiErrorMessage } from '~/lib/api-client';

import {
  useActiveAwardConfiguration,
  useAvailableAwards,
  useRolesForVenue,
  useUpdateAwardConfiguration,
} from '../hooks';
import type { AwardConfigurationDto } from '../types';
import { blankAwardPayTabValue, toAwardPayTabValue } from '../types';
import AwardPayForm from './AwardPayForm';
import ConfigurationHistoryPanel from './ConfigurationHistoryPanel';
import RoleAwardMappingTable from './RoleAwardMappingTable';

// Mirrors backend's RosterApp.Domain.AwardConfig.SuperannuationGuarantee
// .CurrentStatutoryMinimumPercent — used only as a fallback before this venue
// has ever saved a config (GetActiveAwardConfigurationQuery returns null, so
// there's no AwardConfigurationDto.statutoryMinimumSuperannuationPercent to
// read yet). Once a config exists, the backend's own figure is used instead
// — see statutoryMinimumSuperPercent below.
const FALLBACK_STATUTORY_MINIMUM_SUPER_PERCENT = 12.0;

export default function AwardPayTab({ venueId }: { venueId: string }) {
  const awardsQuery = useAvailableAwards();
  const configQuery = useActiveAwardConfiguration(venueId);
  const updateMutation = useUpdateAwardConfiguration(venueId);
  const rolesQuery = useRolesForVenue(venueId);

  const form = useForm({
    defaultValues: blankAwardPayTabValue(),
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync(value);
    },
  });

  // Sync the form once the config query has resolved (including the "no
  // config yet" null case) — same "adjust state during render" pattern as
  // VenueProfileTab.tsx, keyed on venueId rather than a loaded entity's own
  // id since there may be no entity yet.
  const [syncedVenueId, setSyncedVenueId] = useState<string | null>(null);
  const resetFromConfig = (config: AwardConfigurationDto | null) => {
    setSyncedVenueId(venueId);
    form.reset(toAwardPayTabValue(config));
  };
  if (configQuery.isSuccess && syncedVenueId !== venueId) {
    resetFromConfig(configQuery.data);
  }

  const [showBelowMinimumConfirm, setShowBelowMinimumConfirm] = useState(false);

  const statutoryMinimumSuperPercent =
    configQuery.data?.statutoryMinimumSuperannuationPercent ??
    FALLBACK_STATUTORY_MINIMUM_SUPER_PERCENT;

  // Below-minimum super is a soft block (see UpdateAwardConfigurationCommand)
  // — ask for an explicit confirm dialog instead of submitting straight away
  // when the current value is below the minimum and hasn't been confirmed.
  const attemptSave = () => {
    const values = form.state.values;
    const belowMinimum = values.superannuationRatePercent < statutoryMinimumSuperPercent;
    if (belowMinimum && !values.confirmBelowMinimumSuper) {
      setShowBelowMinimumConfirm(true);
      return;
    }
    form.handleSubmit();
  };

  const loadError = awardsQuery.error ?? configQuery.error;
  const isLoading = awardsQuery.isLoading || configQuery.isLoading;
  const isError = awardsQuery.isError || configQuery.isError;
  const isReady = !isLoading && !isError && syncedVenueId === venueId;
  const isSaving = updateMutation.isPending;

  useEffect(() => {
    if (updateMutation.isError) {
      toast.add({
        title: "Couldn't save changes",
        description: getApiErrorMessage(updateMutation.error),
        type: 'error',
      });
    }
  }, [updateMutation.isError, updateMutation.error]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Award & Pay Configuration</CardTitle>
        <CardDescription>
          Versioned award rates and pay rules — payroll recalculation for a past pay
          period always uses the config that was active on that date, never today's.
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
            <AlertTitle>Couldn't load this venue's award configuration</AlertTitle>
            <AlertDescription>
              {loadError instanceof Error ? loadError.message : 'Something went wrong.'}
            </AlertDescription>
          </Alert>
        )}

        {isReady && (
          <div className="flex flex-col gap-6">
            {(rolesQuery.data ?? []).some(
              r => r.isActive && !r.mappedAwardClassificationId,
            ) && (
              <Alert variant="destructive">
                <AlertTitle>
                  {
                    (rolesQuery.data ?? []).filter(
                      r => r.isActive && !r.mappedAwardClassificationId,
                    ).length
                  }{' '}
                  role(s) are not yet mapped to an award classification.
                </AlertTitle>
              </Alert>
            )}

            <AwardPayForm
              form={form}
              awards={awardsQuery.data ?? []}
              statutoryMinimumSuperPercent={statutoryMinimumSuperPercent}
            />

            <Separator />

            <RoleAwardMappingTable
              venueId={venueId}
              awardId={configQuery.data?.awardId}
            />

            <Separator />

            <ConfigurationHistoryPanel
              venueId={venueId}
              awards={awardsQuery.data ?? []}
            />
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
            onClick={attemptSave}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </CardFooter>
      )}

      <Dialog open={showBelowMinimumConfirm} onOpenChange={setShowBelowMinimumConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Super rate is below the statutory minimum</DialogTitle>
            <DialogDescription>
              {statutoryMinimumSuperPercent}% is the current statutory minimum super
              guarantee. Some legacy-contract exemptions are legitimate, but saving a
              lower rate should be a deliberate choice — confirm you want to proceed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                form.setFieldValue('confirmBelowMinimumSuper', true);
                setShowBelowMinimumConfirm(false);
                form.handleSubmit();
              }}
            >
              Save anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
