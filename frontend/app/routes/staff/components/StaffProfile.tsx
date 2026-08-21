import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { ArrowLeftIcon, XIcon } from 'lucide-react';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Field, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import { Textarea } from '~/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';

import {
  useAddAvailabilityException,
  useCreateLeaveRequest,
  useRemoveAvailabilityException,
  useSaveStaffMember,
  useStaffMember,
  useUpdateLeaveRequestStatus,
} from '../hooks';
import { DAY_LABELS, TIME_BLOCK_META } from '../types';
import type {
  AvailabilityException,
  DayOfWeek,
  LeaveRequest,
  LeaveRequestStatus,
  TimeBlock,
  Venue,
} from '../types';
import { SectionHeader } from './form-ui';
import StaffMemberForm, {
  blankStaffMemberForm,
  toStaffMemberFormValue,
} from './StaffMemberForm';

const DAY_ITEMS = DAY_LABELS.map((label, i) => ({ value: String(i), label }));

interface StaffProfileProps {
  staffId: string;
  venues: Venue[];
  onBack: () => void;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
      {text}
    </p>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center"
      style={{
        borderColor: 'var(--destructive)',
        background: 'var(--destructive-tint)',
      }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--destructive)' }}>
        Couldn't load this profile
      </p>
      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {message}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

const STATUS_META: Record<
  LeaveRequestStatus,
  { label: string; color: string; tint: string }
> = {
  requested: {
    label: 'Requested',
    color: 'var(--muted-foreground)',
    tint: 'var(--muted)',
  },
  approved: {
    label: 'Approved',
    color: 'var(--success)',
    tint: 'var(--success-tint)',
  },
  declined: {
    label: 'Declined',
    color: 'var(--destructive)',
    tint: 'var(--destructive-tint)',
  },
};

function StatusBadge({ status }: { status: LeaveRequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge color={meta.color} style={{ background: meta.tint }}>
      {meta.label}
    </Badge>
  );
}

function AvailabilitySection({
  staffId,
  exceptions,
}: {
  staffId: string;
  exceptions: AvailabilityException[];
}) {
  const addMutation = useAddAvailabilityException(staffId);
  const removeMutation = useRemoveAvailabilityException(staffId);

  const form = useForm({
    defaultValues: { dayOfWeek: 0 as DayOfWeek, allDay: true, blocks: [] as TimeBlock[] },
    onSubmit: async ({ value }) => {
      await addMutation.mutateAsync({
        dayOfWeek: value.dayOfWeek,
        blocks: value.allDay ? 'all_day' : value.blocks,
      });
      form.reset();
    },
  });

  return (
    <section>
      <SectionHeader
        title="Standing availability"
        subtitle="Days/blocks this staff member is NOT available. Anything not listed here is assumed available."
      />
      <div className="mb-4 flex flex-col gap-2">
        {exceptions.length === 0 && (
          <EmptyNote text="No standing exceptions — assumed available every day." />
        )}
        {exceptions.map(ex => (
          <div
            key={ex.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-sm">
              <strong>{DAY_LABELS[ex.dayOfWeek]}</strong>{' '}
              {ex.blocks === 'all_day'
                ? '— unavailable all day'
                : `— unavailable ${ex.blocks.map(b => TIME_BLOCK_META[b].label).join(', ')}`}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeMutation.mutate(ex.id)}
              disabled={removeMutation.isPending}
            >
              <XIcon size={14} />
            </Button>
          </div>
        ))}
      </div>
      <div
        className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <form.Subscribe selector={state => state.values}>
          {values => (
            <>
              <Field className="w-auto">
                <FieldLabel htmlFor="availability-day">Day</FieldLabel>
                <Select
                  items={DAY_ITEMS}
                  value={String(values.dayOfWeek)}
                  onValueChange={v =>
                    form.setFieldValue('dayOfWeek', Number(v) as DayOfWeek)
                  }
                >
                  <SelectTrigger id="availability-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DAY_ITEMS.map(item => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field orientation="horizontal" className="w-auto pb-2.5">
                <Checkbox
                  id="availability-all-day"
                  checked={values.allDay}
                  onCheckedChange={checked =>
                    form.setFieldValue('allDay', checked === true)
                  }
                />
                <FieldLabel
                  htmlFor="availability-all-day"
                  className="text-xs font-normal"
                >
                  All day
                </FieldLabel>
              </Field>
              {!values.allDay && (
                <ToggleGroup
                  className="pb-1"
                  variant="outline"
                  multiple
                  value={values.blocks}
                  onValueChange={v => form.setFieldValue('blocks', v as TimeBlock[])}
                >
                  {(Object.keys(TIME_BLOCK_META) as TimeBlock[]).map(b => (
                    <ToggleGroupItem key={b} value={b}>
                      {TIME_BLOCK_META[b].label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
              <Button
                size="sm"
                className="ml-auto"
                onClick={() => form.handleSubmit()}
                disabled={
                  addMutation.isPending || (!values.allDay && values.blocks.length === 0)
                }
              >
                Add exception
              </Button>
            </>
          )}
        </form.Subscribe>
      </div>
    </section>
  );
}

function LeaveRequestsSection({
  staffId,
  leaveRequests,
}: {
  staffId: string;
  leaveRequests: LeaveRequest[];
}) {
  const createMutation = useCreateLeaveRequest(staffId);
  const statusMutation = useUpdateLeaveRequestStatus(staffId);

  const form = useForm({
    defaultValues: { startDate: '', endDate: '', reason: '' },
    onSubmit: async ({ value }) => {
      if (!value.startDate || !value.endDate) return;
      await createMutation.mutateAsync({
        startDate: new Date(`${value.startDate}T00:00:00Z`),
        endDate: new Date(`${value.endDate}T00:00:00Z`),
        reason: value.reason.trim() || null,
      });
      form.reset();
    },
  });

  return (
    <section>
      <SectionHeader
        title="Leave requests"
        subtitle="One-off leave. Approve or decline a request below — no wider workflow yet."
      />
      <div className="mb-4 flex flex-col gap-2">
        {leaveRequests.length === 0 && <EmptyNote text="No leave requests yet." />}
        {leaveRequests.map(lr => (
          <div
            key={lr.id}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {formatDate(lr.startDate)} – {formatDate(lr.endDate)}
              </p>
              {lr.reason && (
                <p
                  className="truncate text-xs"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {lr.reason}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={lr.status} />
              {lr.status === 'requested' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        leaveRequestId: lr.id,
                        status: 'approved',
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        leaveRequestId: lr.id,
                        status: 'declined',
                      })
                    }
                  >
                    Decline
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div
        className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <form.Subscribe selector={state => state.values}>
          {values => (
            <>
              <Field className="w-auto">
                <FieldLabel htmlFor="leave-start">Start</FieldLabel>
                <Input
                  id="leave-start"
                  type="date"
                  value={values.startDate}
                  onChange={e => form.setFieldValue('startDate', e.target.value)}
                />
              </Field>
              <Field className="w-auto">
                <FieldLabel htmlFor="leave-end">End</FieldLabel>
                <Input
                  id="leave-end"
                  type="date"
                  value={values.endDate}
                  onChange={e => form.setFieldValue('endDate', e.target.value)}
                />
              </Field>
              <Field className="min-w-[180px] flex-1">
                <FieldLabel htmlFor="leave-reason">Reason (optional)</FieldLabel>
                <Textarea
                  id="leave-reason"
                  rows={1}
                  value={values.reason}
                  onChange={e => form.setFieldValue('reason', e.target.value)}
                  placeholder="e.g. Annual leave"
                />
              </Field>
              <Button
                size="sm"
                onClick={() => form.handleSubmit()}
                disabled={
                  createMutation.isPending || !values.startDate || !values.endDate
                }
              >
                Request leave
              </Button>
            </>
          )}
        </form.Subscribe>
      </div>
    </section>
  );
}

export default function StaffProfile({ staffId, venues, onBack }: StaffProfileProps) {
  const staffQuery = useStaffMember(staffId);
  const saveMutation = useSaveStaffMember();

  const form = useForm({
    defaultValues: blankStaffMemberForm(''),
    onSubmit: async ({ value }) => {
      await saveMutation.mutateAsync({ id: staffId, ...value });
    },
  });
  // Reset the form when the loaded staff record changes, following React's
  // "adjust state during render" pattern instead of an Effect — avoids an
  // extra render pass just to sync from query data.
  const [syncedStaffId, setSyncedStaffId] = useState<string | null>(null);
  if (staffQuery.data && staffQuery.data.id !== syncedStaffId) {
    setSyncedStaffId(staffQuery.data.id);
    form.reset(toStaffMemberFormValue(staffQuery.data));
  }

  const staff = staffQuery.data;

  const themeStyle = {
    background: 'var(--background)',
    color: 'var(--foreground)',
  } as const;

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
              Staff profile
            </p>
            <p className="truncate text-base font-medium">{staff?.name ?? '…'}</p>
          </div>
        </div>
        <Button
          variant="default"
          size="lg"
          className="font-semibold"
          onClick={() => form.handleSubmit()}
          disabled={
            saveMutation.isPending ||
            staffQuery.isLoading ||
            staffQuery.isError ||
            !syncedStaffId
          }
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
          {staffQuery.isLoading && <Skeleton className="h-64 rounded-lg" />}

          {staffQuery.isError && (
            <ErrorBlock
              message={
                staffQuery.error instanceof Error
                  ? staffQuery.error.message
                  : 'Something went wrong.'
              }
              onRetry={() => staffQuery.refetch()}
            />
          )}

          {!staffQuery.isLoading && !staffQuery.isError && staff && syncedStaffId && (
            <>
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

              <StaffMemberForm form={form} venues={venues} />

              <AvailabilitySection staffId={staffId} exceptions={staff.unavailability} />
              <LeaveRequestsSection
                staffId={staffId}
                leaveRequests={staff.leaveRequests}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
