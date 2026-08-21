import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';

import { useSaveStaffMember } from '../hooks';
import type { Venue } from '../types';
import StaffMemberForm, { blankStaffMemberForm } from './StaffMemberForm';
import type { StaffMemberFormValue } from './StaffMemberForm';

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
  const [form, setForm] = useState<StaffMemberFormValue>(() =>
    blankStaffMemberForm(defaultVenueId),
  );
  const saveMutation = useSaveStaffMember();

  function handleSave() {
    saveMutation.mutate({ id: null, ...form }, { onSuccess: dto => onCreated(dto.id) });
  }

  const themeStyle: CSSProperties = {
    background: 'var(--background)',
    color: 'var(--foreground)',
  };

  return (
    <div className="flex min-h-screen w-full flex-col font-sans" style={themeStyle}>
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-6 py-4"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeftIcon size={14} />
            Back
          </Button>
          <div className="min-w-0 border-l pl-4" style={{ borderColor: 'var(--border)' }}>
            <p
              className="font-sans text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Add staff member
            </p>
            <p className="truncate text-base font-medium">New staff member</p>
          </div>
        </div>
        <Button
          variant="default"
          size="lg"
          className="font-semibold"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
          {saveMutation.isError && (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{
                borderColor: 'var(--destructive)',
                background: 'var(--destructive-tint)',
                color: 'var(--destructive)',
              }}
            >
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : "Couldn't save this profile."}
            </div>
          )}

          <StaffMemberForm value={form} onChange={setForm} venues={venues} />

          <p className="text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
            Save this profile first to add standing availability or leave requests.
          </p>
        </div>
      </main>
    </div>
  );
}
