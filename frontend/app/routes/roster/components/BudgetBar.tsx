import { useState } from "react";
import type { FormEvent } from "react";
import { PencilIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Spinner } from "~/components/ui/spinner";

import { currency, getBudgetStatus } from "../types";
import type { BudgetStatus, BudgetSummary } from "../types";

interface BudgetBarProps {
  summary: BudgetSummary | undefined;
  onSaveTarget: (value: number | null) => void;
  savingTarget: boolean;
}

// Live/on-budget vs near/over-budget is a functional signal, kept to the
// two theme-independent signal colors from CLAUDE.md's color philosophy
// (--success / --destructive) rather than inventing a third "warning" hue —
// "near" is distinguished by intensity (outline vs solid), not a new color.
const STATUS_STYLE: Record<
  BudgetStatus,
  { dot: string; text: string; chipBg: string; chipBorder: string | null }
> = {
  no_target: {
    dot: "var(--muted-foreground)",
    text: "var(--muted-foreground)",
    chipBg: "transparent",
    chipBorder: "var(--border)",
  },
  under: {
    dot: "var(--success)",
    text: "var(--success)",
    chipBg: "var(--success-tint)",
    chipBorder: null,
  },
  near: {
    dot: "var(--destructive)",
    text: "var(--destructive)",
    chipBg: "transparent",
    chipBorder: "var(--destructive)",
  },
  over: {
    dot: "var(--destructive)",
    text: "var(--destructive)",
    chipBg: "var(--destructive-tint)",
    chipBorder: null,
  },
};

const STATUS_LABEL: Record<BudgetStatus, string> = {
  no_target: "No budget set",
  under: "Under budget",
  near: "Near budget",
  over: "Over budget",
};

export function BudgetBar({ summary, onSaveTarget, savingTarget }: BudgetBarProps) {
  const weeklyTotal = summary?.totalCost ?? 0;
  const target = summary?.forecastSalesTarget ?? null;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(target != null ? String(target) : "");

  const status = getBudgetStatus(weeklyTotal, target);
  const style = STATUS_STYLE[status];
  const delta = target != null ? target - weeklyTotal : null;

  function openPopover(open: boolean) {
    if (open) setDraftValue(target != null ? String(target) : "");
    setPopoverOpen(open);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draftValue.trim();
    onSaveTarget(trimmed === "" ? null : Number(trimmed));
    setPopoverOpen(false);
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
      style={{
        borderColor: style.chipBorder ?? "var(--border)",
        background: style.chipBg === "transparent" ? "var(--muted)" : style.chipBg,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full live-dot"
        style={{ background: style.dot }}
      />
      <div className="flex flex-col leading-tight">
        <span className="font-sans font-semibold text-lg tabular-nums">
          {currency(weeklyTotal)}
        </span>
        <span
          className="text-[10px] font-sans font-medium uppercase tracking-wide"
          style={{ color: style.text }}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      {delta !== null && (
        <span
          className="text-xs font-sans font-medium tabular-nums px-1.5 py-0.5 rounded"
          style={{
            color: style.text,
            background:
              status === "over"
                ? "var(--destructive-tint)"
                : status === "under"
                  ? "var(--success-tint)"
                  : "transparent",
          }}
        >
          {delta < 0 ? "−" : "+"}
          {currency(Math.abs(delta))}
        </span>
      )}

      <Popover open={popoverOpen} onOpenChange={openPopover}>
        <PopoverTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Set weekly budget target" />
          }
        >
          <PencilIcon />
        </PopoverTrigger>
        <PopoverContent align="end">
          <PopoverHeader>
            <PopoverTitle>Weekly labour budget</PopoverTitle>
          </PopoverHeader>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field>
              <FieldLabel htmlFor="budget-target">Target for this venue</FieldLabel>
              <InputGroup>
                <InputGroupAddon>$</InputGroupAddon>
                <InputGroupInput
                  id="budget-target"
                  type="number"
                  min="0"
                  step="50"
                  inputMode="decimal"
                  placeholder="No target set"
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                />
              </InputGroup>
              <FieldDescription>
                Leave blank to hide colour-coding and show the running total only.
              </FieldDescription>
            </Field>
            <Button type="submit" disabled={savingTarget}>
              {savingTarget && <Spinner data-icon="inline-start" />}
              Save target
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
