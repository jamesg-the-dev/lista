import { useState } from 'react';
import type { FormEvent } from 'react';
import { PencilIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Spinner } from '~/components/ui/spinner';

import { currency, getBudgetStatus } from '../types';
import type { BudgetStatus, BudgetSummary } from '../types';

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
  { dot: string; text: string; container: string; deltaBg: string }
> = {
  no_target: {
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
    container: 'border-border bg-muted',
    deltaBg: 'bg-transparent',
  },
  under: {
    dot: 'bg-success',
    text: 'text-success',
    container: 'border-border bg-success-tint',
    deltaBg: 'bg-success-tint',
  },
  near: {
    dot: 'bg-destructive',
    text: 'text-destructive',
    container: 'border-destructive bg-muted',
    deltaBg: 'bg-transparent',
  },
  over: {
    dot: 'bg-destructive',
    text: 'text-destructive',
    container: 'border-border bg-destructive-tint',
    deltaBg: 'bg-destructive-tint',
  },
};

const STATUS_LABEL: Record<BudgetStatus, string> = {
  no_target: 'No budget set',
  under: 'Under budget',
  near: 'Near budget',
  over: 'Over budget',
};

export function BudgetBar({ summary, onSaveTarget, savingTarget }: BudgetBarProps) {
  const weeklyTotal = summary?.totalCost ?? 0;
  const target = summary?.forecastSalesTarget ?? null;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(target != null ? String(target) : '');

  const status = getBudgetStatus(weeklyTotal, target);
  const style = STATUS_STYLE[status];
  const delta = target != null ? target - weeklyTotal : null;

  function openPopover(open: boolean) {
    if (open) setDraftValue(target != null ? String(target) : '');
    setPopoverOpen(open);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draftValue.trim();
    onSaveTarget(trimmed === '' ? null : Number(trimmed));
    setPopoverOpen(false);
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${style.container}`}
    >
      <span className={`live-dot h-1.5 w-1.5 rounded-full ${style.dot}`} />
      <div className="flex flex-col leading-tight">
        <span className="font-sans text-lg font-semibold tabular-nums">
          {currency(weeklyTotal)}
        </span>
        <span
          className={`font-sans text-[10px] font-medium tracking-wide uppercase ${style.text}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      {delta !== null && (
        <span
          className={`rounded px-1.5 py-0.5 font-sans text-xs font-medium tabular-nums ${style.text} ${style.deltaBg}`}
        >
          {delta < 0 ? '−' : '+'}
          {currency(Math.abs(delta))}
        </span>
      )}

      <Popover open={popoverOpen} onOpenChange={openPopover}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Set weekly budget target"
            />
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
                  onChange={e => setDraftValue(e.target.value)}
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
