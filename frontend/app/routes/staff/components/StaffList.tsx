import type { CSSProperties } from "react";
import { useNavigate } from "react-router";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useVenueContextStore } from "~/lib/venue-context";

import { useStaffMembers, useVenues } from "../hooks";
import { CLASSIFICATION_META, EMPLOYMENT_TYPE_META } from "../types";
import type { StaffMember } from "../types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

function StaffRow({
  staff,
  onSelect,
}: {
  staff: StaffMember;
  onSelect: () => void;
}) {
  const classification = CLASSIFICATION_META[staff.classification];
  const employmentType = EMPLOYMENT_TYPE_META[staff.employmentType];
  return (
    <Button
      variant="outline"
      onClick={onSelect}
      className="h-auto w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-sans font-bold text-sm flex-shrink-0"
          style={{ background: "var(--muted)", color: "var(--foreground)" }}
        >
          {initials(staff.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{staff.name}</p>
          <p
            className="text-xs truncate"
            style={{ color: "var(--muted-foreground)" }}
          >
            {classification.label} · {classification.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className="text-xs font-sans font-medium tabular-nums px-2 py-1 rounded"
          style={{
            background: "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          {employmentType.label}
        </span>
        <ChevronRightIcon
          size={16}
          style={{ color: "var(--muted-foreground)" }}
        />
      </div>
    </Button>
  );
}

function StaffListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[60px] rounded-lg border animate-pulse"
          style={{ borderColor: "var(--border)", background: "var(--muted)" }}
        />
      ))}
    </div>
  );
}

function ErrorState({
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
        Couldn't load staff for this venue
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center"
      style={{ borderColor: "var(--border)" }}
    >
      <UsersIcon size={20} style={{ color: "var(--muted-foreground)" }} />
      <p className="text-sm font-medium">No staff assigned to this venue yet</p>
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        Add a staff member to start building this venue's roster.
      </p>
      <Button variant="default" size="sm" onClick={onAdd}>
        Add staff member
      </Button>
    </div>
  );
}

export default function StaffList() {
  const navigate = useNavigate();
  const { activeVenueId, setActiveVenueId } = useVenueContextStore();

  const venuesQuery = useVenues();
  const staffQuery = useStaffMembers(activeVenueId);

  const activeVenue = venuesQuery.data?.find((v) => v.id === activeVenueId);

  const themeStyle: CSSProperties = {
    background: "var(--background)",
    color: "var(--foreground)",
  };

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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-auto gap-2 rounded-lg px-3 py-2"
                  style={{ background: "var(--muted)" }}
                />
              }
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "var(--foreground)" }}
              />
              <div className="text-left">
                <p className="font-sans font-semibold text-sm uppercase leading-tight">
                  {activeVenue?.name ?? "Loading venue…"}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {activeVenue?.suburb ?? ""}
                </p>
              </div>
              <ChevronDownIcon
                size={14}
                className="ml-1 flex-shrink-0"
                style={{ color: "var(--muted-foreground)" }}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64"
              style={{
                background: "var(--muted)",
                borderColor: "var(--border)",
              }}
            >
              {(venuesQuery.data ?? []).map((v) => (
                <DropdownMenuItem
                  key={v.id}
                  onClick={() => setActiveVenueId(v.id)}
                  className="justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{v.name}</p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {v.suburb}
                    </p>
                  </div>
                  {v.id === activeVenueId && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--foreground)" }}
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div
            className="hidden md:block pl-4 border-l"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="font-sans font-semibold text-sm">
              Staff & availability
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Profiles, pay tiers and leave for this venue
            </p>
          </div>
        </div>

        <Button
          variant="default"
          size="lg"
          className="font-semibold"
          onClick={() => navigate("/staff/new")}
        >
          <PlusIcon size={14} />
          Add staff member
        </Button>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          {staffQuery.isLoading && <StaffListSkeleton />}
          {staffQuery.isError && (
            <ErrorState
              message={
                staffQuery.error instanceof Error
                  ? staffQuery.error.message
                  : "Something went wrong."
              }
              onRetry={() => staffQuery.refetch()}
            />
          )}
          {staffQuery.isSuccess && staffQuery.data.length === 0 && (
            <EmptyState onAdd={() => navigate("/staff/new")} />
          )}
          {staffQuery.isSuccess &&
            staffQuery.data.map((staff) => (
              <StaffRow
                key={staff.id}
                staff={staff}
                onSelect={() => navigate(`/staff/${staff.id}`)}
              />
            ))}
        </div>
      </main>
    </div>
  );
}
