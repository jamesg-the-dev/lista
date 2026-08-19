import { useState } from "react";
import { ArrowLeftIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";

import {
  useAddAvailabilityException,
  useCreateLeaveRequest,
  useRemoveAvailabilityException,
  useSaveStaffMember,
  useStaffMember,
  useUpdateLeaveRequestStatus,
} from "../hooks";
import { DAY_LABELS, TIME_BLOCK_META } from "../types";
import type {
  AvailabilityException,
  DayOfWeek,
  LeaveRequest,
  LeaveRequestStatus,
  TimeBlock,
  Venue,
} from "../types";
import { FieldLabel, SectionHeader, inputStyle } from "./form-ui";
import StaffMemberForm, { toStaffMemberFormValue } from "./StaffMemberForm";
import type { StaffMemberFormValue } from "./StaffMemberForm";

interface StaffProfileProps {
  staffId: string;
  venues: Venue[];
  onBack: () => void;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="text-xs italic" style={{ color: "var(--muted-foreground)" }}>
      {text}
    </p>
  );
}

function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center"
      style={{
        borderColor: "var(--destructive)",
        background: "var(--destructive-tint)",
      }}
    >
      <p
        className="text-sm font-medium"
        style={{ color: "var(--destructive)" }}
      >
        Couldn't load this profile
      </p>
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
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
    label: "Requested",
    color: "var(--muted-foreground)",
    tint: "var(--muted)",
  },
  approved: {
    label: "Approved",
    color: "var(--success)",
    tint: "var(--success-tint)",
  },
  declined: {
    label: "Declined",
    color: "var(--destructive)",
    tint: "var(--destructive-tint)",
  },
};

function StatusBadge({ status }: { status: LeaveRequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="text-xs font-sans font-medium px-2 py-1 rounded flex-shrink-0"
      style={{ color: meta.color, background: meta.tint }}
    >
      {meta.label}
    </span>
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
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(0);
  const [allDay, setAllDay] = useState(true);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);

  function toggleBlock(block: TimeBlock) {
    setBlocks((b) =>
      b.includes(block) ? b.filter((x) => x !== block) : [...b, block],
    );
  }

  function handleAdd() {
    addMutation.mutate(
      { dayOfWeek, blocks: allDay ? "all_day" : blocks },
      {
        onSuccess: () => {
          setBlocks([]);
          setAllDay(true);
        },
      },
    );
  }

  return (
    <section>
      <SectionHeader
        title="Standing availability"
        subtitle="Days/blocks this staff member is NOT available. Anything not listed here is assumed available."
      />
      <div className="flex flex-col gap-2 mb-4">
        {exceptions.length === 0 && (
          <EmptyNote text="No standing exceptions — assumed available every day." />
        )}
        {exceptions.map((ex) => (
          <div
            key={ex.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="text-sm">
              <strong>{DAY_LABELS[ex.dayOfWeek]}</strong>{" "}
              {ex.blocks === "all_day"
                ? "— unavailable all day"
                : `— unavailable ${ex.blocks.map((b) => TIME_BLOCK_META[b].label).join(", ")}`}
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
        style={{ borderColor: "var(--border)" }}
      >
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Day</FieldLabel>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value) as DayOfWeek)}
            className="rounded-lg border px-3 py-2 text-sm font-sans font-medium outline-none"
            style={inputStyle}
          >
            {DAY_LABELS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs pb-2.5">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          All day
        </label>
        {!allDay && (
          <div className="flex gap-1.5 pb-1">
            {(Object.keys(TIME_BLOCK_META) as TimeBlock[]).map((b) => {
              const active = blocks.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBlock(b)}
                  className="text-xs font-sans font-medium px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: active ? "var(--foreground)" : "var(--muted)",
                    color: active
                      ? "var(--background)"
                      : "var(--muted-foreground)",
                  }}
                >
                  {TIME_BLOCK_META[b].label}
                </button>
              );
            })}
          </div>
        )}
        <Button
          size="sm"
          className="ml-auto"
          onClick={handleAdd}
          disabled={addMutation.isPending || (!allDay && blocks.length === 0)}
        >
          Add exception
        </Button>
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  function handleCreate() {
    if (!startDate || !endDate) return;
    createMutation.mutate(
      {
        startDate: new Date(`${startDate}T00:00:00Z`),
        endDate: new Date(`${endDate}T00:00:00Z`),
        reason: reason.trim() || null,
      },
      {
        onSuccess: () => {
          setStartDate("");
          setEndDate("");
          setReason("");
        },
      },
    );
  }

  return (
    <section>
      <SectionHeader
        title="Leave requests"
        subtitle="One-off leave. Approve or decline a request below — no wider workflow yet."
      />
      <div className="flex flex-col gap-2 mb-4">
        {leaveRequests.length === 0 && (
          <EmptyNote text="No leave requests yet." />
        )}
        {leaveRequests.map((lr) => (
          <div
            key={lr.id}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {formatDate(lr.startDate)} – {formatDate(lr.endDate)}
              </p>
              {lr.reason && (
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {lr.reason}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={lr.status} />
              {lr.status === "requested" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        leaveRequestId: lr.id,
                        status: "approved",
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
                        status: "declined",
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
        style={{ borderColor: "var(--border)" }}
      >
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Start</FieldLabel>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm font-sans font-medium tabular-nums outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>End</FieldLabel>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm font-sans font-medium tabular-nums outline-none"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
          <FieldLabel>Reason (optional)</FieldLabel>
          <Textarea
            rows={1}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Annual leave"
          />
        </label>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={createMutation.isPending || !startDate || !endDate}
        >
          Request leave
        </Button>
      </div>
    </section>
  );
}

export default function StaffProfile({
  staffId,
  venues,
  onBack,
}: StaffProfileProps) {
  const staffQuery = useStaffMember(staffId);
  const saveMutation = useSaveStaffMember();

  const [form, setForm] = useState<StaffMemberFormValue | null>(null);
  // Reset the form when the loaded staff record changes, following React's
  // "adjust state during render" pattern instead of an Effect — avoids an
  // extra render pass just to sync from query data.
  const [syncedStaffId, setSyncedStaffId] = useState<string | null>(null);
  if (staffQuery.data && staffQuery.data.id !== syncedStaffId) {
    setSyncedStaffId(staffQuery.data.id);
    setForm(toStaffMemberFormValue(staffQuery.data));
  }

  function handleSave() {
    if (!form) return;
    saveMutation.mutate({ id: staffId, ...form });
  }

  const staff = staffQuery.data;

  const themeStyle = {
    background: "var(--background)",
    color: "var(--foreground)",
  } as const;

  return (
    <div
      className="min-h-screen w-full flex flex-col font-sans"
      style={themeStyle}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-4 border-b"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeftIcon size={14} />
            Back
          </Button>
          <div
            className="pl-4 border-l min-w-0"
            style={{ borderColor: "var(--border)" }}
          >
            <p
              className="font-sans font-semibold text-xs uppercase tracking-widest"
              style={{ color: "var(--muted-foreground)" }}
            >
              Staff profile
            </p>
            <p className="text-base font-medium truncate">
              {staff?.name ?? "…"}
            </p>
          </div>
        </div>
        <Button
          variant="default"
          size="lg"
          className="font-semibold"
          onClick={handleSave}
          disabled={
            saveMutation.isPending ||
            staffQuery.isLoading ||
            staffQuery.isError ||
            !form
          }
        >
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          {staffQuery.isLoading && (
            <div
              className="h-64 rounded-lg border animate-pulse"
              style={{
                borderColor: "var(--border)",
                background: "var(--muted)",
              }}
            />
          )}

          {staffQuery.isError && (
            <ErrorBlock
              message={
                staffQuery.error instanceof Error
                  ? staffQuery.error.message
                  : "Something went wrong."
              }
              onRetry={() => staffQuery.refetch()}
            />
          )}

          {!staffQuery.isLoading && !staffQuery.isError && staff && form && (
            <>
              {saveMutation.isError && (
                <div
                  className="rounded-lg border px-4 py-3 text-sm"
                  style={{
                    borderColor: "var(--destructive)",
                    background: "var(--destructive-tint)",
                    color: "var(--destructive)",
                  }}
                >
                  {saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : "Couldn't save this profile."}
                </div>
              )}

              <StaffMemberForm value={form} onChange={setForm} venues={venues} />

              <AvailabilitySection
                staffId={staffId}
                exceptions={staff.unavailability}
              />
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
