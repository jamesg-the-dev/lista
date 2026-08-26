import { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { toast } from '~/components/ui/toast';
import { getApiErrorMessage } from '~/lib/api-client';

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

  useEffect(() => {
    if (saveMutation.isError) {
      toast.add({
        title: "Couldn't save this profile",
        description: getApiErrorMessage(saveMutation.error),
        type: 'error',
      });
    }
  }, [saveMutation.isError, saveMutation.error]);

  const form = useForm({
    defaultValues: blankStaffMemberForm(defaultVenueId),
    onSubmit: async ({ value }) => {
      const dto = await saveMutation.mutateAsync({ id: null, ...value });
      onCreated(dto.id);
    },
  });

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full flex-col font-sans">
      <header className="border-border bg-card sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeftIcon size={14} />
            Back
          </Button>
          <div className="border-border min-w-0 border-l pl-4">
            <p className="text-muted-foreground font-sans text-xs font-semibold tracking-widest uppercase">
              Add staff member
            </p>
            <p className="truncate text-base font-medium">New staff member</p>
          </div>
        </div>
        <form.Subscribe selector={state => state.values.dateOfBirth.getTime() === 0}>
          {dateOfBirthUnset => (
            <Button
              variant="default"
              className="font-semibold"
              onClick={() => form.handleSubmit()}
              disabled={saveMutation.isPending || dateOfBirthUnset}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          )}
        </form.Subscribe>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
          <StaffMemberForm form={form} venues={venues} />

          <p className="text-muted-foreground text-xs italic">
            Save this profile first to add standing availability or leave requests.
          </p>
        </div>
      </main>
    </div>
  );
}
