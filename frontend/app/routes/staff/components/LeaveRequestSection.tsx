import type { LeaveRequest, LeaveRequestStatus } from '../types';
import { useCreateLeaveRequest, useUpdateLeaveRequestStatus } from '../hooks';
import { useForm } from '@tanstack/react-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Field, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { EmptyNote } from './EmptyNote';
import { Badge } from '~/components/ui/badge';

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_META: Record<LeaveRequestStatus, { label: string; className: string }> = {
  requested: { label: 'Requested', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approved', className: 'bg-success-tint text-success' },
  declined: { label: 'Declined', className: 'bg-destructive-tint text-destructive' },
};

function StatusBadge({ status }: { status: LeaveRequestStatus }) {
  const meta = STATUS_META[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function LeaveRequestsSection({
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
    <Card>
      <CardHeader>
        <CardTitle>Leave requests</CardTitle>
        <CardDescription>
          One-off leave. Approve or decline a request below — no wider workflow yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2">
          {leaveRequests.length === 0 && <EmptyNote text="No leave requests yet." />}
          {leaveRequests.map(lr => (
            <div
              key={lr.id}
              className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {formatDate(lr.startDate)} – {formatDate(lr.endDate)}
                </p>
                {lr.reason && (
                  <p className="text-muted-foreground truncate text-xs">{lr.reason}</p>
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
        <div className="border-border flex flex-wrap items-end gap-3 rounded-lg border p-3">
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
                <Field className="min-w-45 flex-1">
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
      </CardContent>
    </Card>
  );
}
