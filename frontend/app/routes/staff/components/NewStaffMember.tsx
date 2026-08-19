import { useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "~/components/ui/button";

import { useSaveStaffMember } from "../hooks";
import type { Venue } from "../types";
import StaffMemberForm, {
  blankStaffMemberForm,
} from "./StaffMemberForm";
import type { StaffMemberFormValue } from "./StaffMemberForm";

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
    saveMutation.mutate(
      { id: null, ...form },
      { onSuccess: (dto) => onCreated(dto.id) },
    );
  }

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
              Add staff member
            </p>
            <p className="text-base font-medium truncate">
              New staff member
            </p>
          </div>
        </div>
        <Button
          variant="default"
          size="lg"
          className="font-semibold"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
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

          <p
            className="text-xs italic"
            style={{ color: "var(--muted-foreground)" }}
          >
            Save this profile first to add standing availability or leave
            requests.
          </p>
        </div>
      </main>
    </div>
  );
}
