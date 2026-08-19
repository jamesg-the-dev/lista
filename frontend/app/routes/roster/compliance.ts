// Client-side stand-in for the backend's IRosterComplianceValidator (see
// CLAUDE.md § Backend stack decisions). The real validator is described as
// a pure function that takes a proposed shift plus the employee's adjacent
// shifts for the week and returns itemised violations — no repository
// dependency. This mirrors that shape directly rather than modelling
// compliance as a server-fetched resource keyed by venue/week: the input
// (in-progress shift edits) only exists client-side and changes on every
// edit, so a pure function is both the more faithful simulation and the one
// that can update live as the roster is built. api.ts's
// fetchComplianceViolations wraps this with an artificial delay to
// approximate what a real "save shift, get violations back" response would
// look like; the shift editor panel also calls it directly for the
// live preview before a shift is saved.
//
// Rule thresholds below are illustrative for UI/architecture purposes only —
// same disclaimer as the award-rate multipliers in types.ts. Not sourced
// from Fair Work's Pay Calculator or independently verified. See CLAUDE.md
// § Award compliance.

import { DateTime } from "luxon";

import type { ComplianceViolationDto, ShiftDto, StaffMemberDto } from "./types";
import { dateForDay, unmapSeverity, unmapViolationType } from "./types";

const MIN_REST_HOURS_WARNING = 10;
const MIN_REST_HOURS_BLOCKING = 8;
const MISSING_BREAK_THRESHOLD_HRS = 5;
const SPAN_OF_HOURS_THRESHOLD = 12;
const MAX_CONSECUTIVE_DAYS = 6;

const WARNING = unmapSeverity("warning");
const BLOCKING = unmapSeverity("blocking");

function shiftInterval(weekStart: DateTime, shift: ShiftDto) {
  const date = dateForDay(weekStart, shift.dayOfWeek);
  const start = DateTime.fromISO(`${date.toISODate()}T${shift.start}`);
  let end = DateTime.fromISO(`${date.toISODate()}T${shift.end}`);
  if (end <= start) end = end.plus({ days: 1 });
  return { start, end };
}

function violation(
  shiftId: string,
  type: ReturnType<typeof unmapViolationType>,
  severity: ReturnType<typeof unmapSeverity>,
  message: string,
): ComplianceViolationDto {
  return { id: `${shiftId}:${type}`, shiftId, type, severity, message };
}

export function evaluateComplianceViolations(
  weekStart: DateTime,
  shifts: ShiftDto[],
  staff: Pick<StaffMemberDto, "id">[],
): ComplianceViolationDto[] {
  const violations: ComplianceViolationDto[] = [];

  for (const member of staff) {
    const memberShifts = shifts
      .filter((s) => s.staffId === member.id)
      .map((shift) => ({ shift, ...shiftInterval(weekStart, shift) }))
      .sort((a, b) => a.start.toMillis() - b.start.toMillis());

    for (let i = 0; i < memberShifts.length; i++) {
      const { shift, start, end } = memberShifts[i];
      const grossHrs = end.diff(start, "hours").hours;

      if (grossHrs > MISSING_BREAK_THRESHOLD_HRS && shift.breakMins === 0) {
        violations.push(
          violation(
            shift.id,
            unmapViolationType("missing_break"),
            WARNING,
            `No unpaid break scheduled on a ${grossHrs.toFixed(1)}h shift.`,
          ),
        );
      }
      if (grossHrs > SPAN_OF_HOURS_THRESHOLD) {
        violations.push(
          violation(
            shift.id,
            unmapViolationType("span_of_hours_exceeded"),
            WARNING,
            `Shift spans ${grossHrs.toFixed(1)}h, exceeding the ${SPAN_OF_HOURS_THRESHOLD}h span-of-hours guideline.`,
          ),
        );
      }

      const next = memberShifts[i + 1];
      if (next) {
        const restHrs = next.start.diff(end, "hours").hours;
        if (restHrs < MIN_REST_HOURS_BLOCKING) {
          violations.push(
            violation(
              next.shift.id,
              unmapViolationType("insufficient_rest"),
              BLOCKING,
              `Only ${restHrs.toFixed(1)}h rest since the previous shift ends — below the ${MIN_REST_HOURS_BLOCKING}h minimum.`,
            ),
          );
        } else if (restHrs < MIN_REST_HOURS_WARNING) {
          violations.push(
            violation(
              next.shift.id,
              unmapViolationType("insufficient_rest"),
              WARNING,
              `${restHrs.toFixed(1)}h rest since the previous shift ends — under the ${MIN_REST_HOURS_WARNING}h recommended minimum.`,
            ),
          );
        }
      }
    }

    // Max consecutive calendar days worked within the week.
    const daysWorked = new Set(memberShifts.map((m) => m.shift.dayOfWeek));
    let run = 0;
    let runStartShiftId: string | null = null;
    for (let day = 0; day < 7; day++) {
      if (daysWorked.has(day)) {
        if (run === 0) {
          runStartShiftId =
            memberShifts.find((m) => m.shift.dayOfWeek === day)?.shift.id ?? null;
        }
        run++;
      } else {
        run = 0;
      }
      if (run === MAX_CONSECUTIVE_DAYS && runStartShiftId) {
        violations.push(
          violation(
            runStartShiftId,
            unmapViolationType("max_consecutive_days"),
            WARNING,
            `Scheduled ${MAX_CONSECUTIVE_DAYS}+ consecutive days this week.`,
          ),
        );
      }
    }
  }

  return violations;
}
