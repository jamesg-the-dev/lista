import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';

import { useUpdateVenueAvailabilitySettings, useVenueProfile } from '../hooks';
import { SELF_SERVICE_MODE_ITEMS } from '../types';
import type { SelfServiceMode } from '../types';
import { SectionHeader } from './form-ui';

// Venue-wide toggle (§2 AC5) — deliberately not per-staff, to keep the
// settings surface simple. Visually separated from the staff table above
// (its own bordered card) rather than implying it's part of that table,
// per §7's mockup.
export default function AvailabilitySettingsCard({ venueId }: { venueId: string }) {
  const venueQuery = useVenueProfile(venueId);
  const updateMutation = useUpdateVenueAvailabilitySettings(venueId);

  const settings = venueQuery.data?.availabilitySettings;
  const [draftNoticeDays, setDraftNoticeDays] = useState<string | null>(null);

  const noticeDays = draftNoticeDays ?? String(settings?.advanceNoticeDays ?? 7);

  const commitMode = (mode: SelfServiceMode) => {
    if (!settings) return;
    updateMutation.mutate({ selfServiceMode: mode, advanceNoticeDays: settings.advanceNoticeDays });
  };

  const commitNoticeDays = () => {
    if (!settings) return;
    const parsed = Number(draftNoticeDays);
    if (draftNoticeDays === null || Number.isNaN(parsed)) return;
    updateMutation.mutate({ selfServiceMode: settings.selfServiceMode, advanceNoticeDays: parsed });
    setDraftNoticeDays(null);
  };

  return (
    <section className="border-border rounded-lg border p-4">
      <SectionHeader
        title="Staff Availability Self-Service"
        subtitle="Whether staff can set their own availability/unavailability directly, or need manager approval."
      />

      {venueQuery.isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {settings && (
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Mode</FieldLabel>
            <ToggleGroup
              variant="outline"
              value={[settings.selfServiceMode]}
              onValueChange={next => {
                const value = next[0];
                if (value) commitMode(value as SelfServiceMode);
              }}
              disabled={updateMutation.isPending}
            >
              {SELF_SERVICE_MODE_ITEMS.map(item => (
                <ToggleGroupItem key={item.value} value={item.value}>
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription>
              {SELF_SERVICE_MODE_ITEMS.find(i => i.value === settings.selfServiceMode)?.description}
            </FieldDescription>
          </Field>

          <Field className="max-w-xs">
            <FieldLabel htmlFor="advance-notice-days">Minimum notice (days)</FieldLabel>
            <Input
              id="advance-notice-days"
              type="number"
              min="0"
              step="1"
              value={noticeDays}
              onChange={e => setDraftNoticeDays(e.target.value)}
              onBlur={commitNoticeDays}
              disabled={updateMutation.isPending}
            />
            <FieldDescription>
              Minimum notice staff must give for unavailability requests.
            </FieldDescription>
          </Field>
        </div>
      )}

      {updateMutation.isError && (
        <Alert variant="destructive" className="mt-3">
          <AlertTitle>Couldn't save availability settings</AlertTitle>
          <AlertDescription>
            {updateMutation.error instanceof Error
              ? updateMutation.error.message
              : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}
