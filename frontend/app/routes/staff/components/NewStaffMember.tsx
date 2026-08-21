import { useForm } from '@tanstack/react-form';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';

import { useSaveStaffMember } from '../hooks';
import type { Venue } from '../types';
import StaffMemberForm, { blankStaffMemberForm } from './StaffMemberForm';

interface NewStaffMemberProps {
  venues: Venue[];
  defaultVenueId: string;
  onBack: () => void;
  onCreated: (staffId: string) => void;
}

export default function NewStaffMember({
  venues,
  defaultVenueId,
  onBack,
  onCreated,
}: NewStaffMemberProps) {
  const saveMutation = useSaveStaffMember();

  const form = useForm({
    defaultValues: blankStaffMemberForm(defaultVenueId),
    onSubmit: async ({ value }) => {
      const dto = await saveMutation.mutateAsync({ id: null, ...value });
      onCreated(dto.id);
    },
  });

  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-sans text-foreground">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeftIcon size={14} />
            Back
          </Button>
          <div className="min-w-0 border-l border-border pl-4">
            <p className="font-sans text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Add staff member
            </p>
            <p className="truncate text-base font-medium">New staff member</p>
          </div>
        </div>
        <Button
          variant="default"
          size="lg"
          className="font-semibold"
          onClick={() => form.handleSubmit()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
          {saveMutation.isError && (
            <div className="rounded-lg border border-destructive bg-destructive-tint px-4 py-3 text-sm text-destructive">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : "Couldn't save this profile."}
            </div>
          )}

          <StaffMemberForm form={form} venues={venues} />

          <p className="text-xs text-muted-foreground italic">
            Save this profile first to add standing availability or leave requests.
          </p>
        </div>
      </main>
    </div>
  );
}
