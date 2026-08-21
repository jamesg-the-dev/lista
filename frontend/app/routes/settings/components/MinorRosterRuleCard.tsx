import { ClockIcon, ShieldIcon } from 'lucide-react';

import { Badge } from '~/components/ui/badge';
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '~/components/ui/input-group';

import type { RosterRulesTabFormApi } from './RosterRulesForm';

const TIME_INPUT_CLASSES =
  'appearance-none tabular-nums [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none';

interface MinorRosterRuleCardProps {
  form: RosterRulesTabFormApi;
}

// Always-on, compliance-critical section — visually distinguished with a
// heavier border and a "Legal requirement" badge rather than a new accent
// color, per docs/design-system.md's "color is reserved for signal (role
// identity, budget state)" rule; under-18 rostering limits aren't either of
// those two signals, so this stays on the neutral token set instead of
// introducing a third hue.
export default function MinorRosterRuleCard({ form }: MinorRosterRuleCardProps) {
  return (
    <section className="border-foreground/20 rounded-lg border-2 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-sans text-xs font-semibold tracking-widest uppercase">
            Under-18 staff rules
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Applied automatically to any staff member under 18 on the shift date — not a
            manual flag.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1">
          <ShieldIcon data-icon="inline-start" />
          Legal requirement
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <form.Field name="minorRules.maxDailyHours">
          {field => (
            <Field>
              <FieldLabel htmlFor="minor-max-daily">Max daily hours</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="minor-max-daily"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={field.state.value}
                  onChange={e => field.handleChange(Number(e.target.value) || 0)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>hrs</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          )}
        </form.Field>

        <form.Field name="minorRules.maxWeeklyHours">
          {field => (
            <Field>
              <FieldLabel htmlFor="minor-max-weekly">Max weekly hours</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="minor-max-weekly"
                  type="number"
                  min="0"
                  max="168"
                  step="0.5"
                  value={field.state.value}
                  onChange={e => field.handleChange(Number(e.target.value) || 0)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>hrs</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          )}
        </form.Field>

        <form.Field name="minorRules.earliestStartTime">
          {field => (
            <Field>
              <FieldLabel htmlFor="minor-earliest-start">Earliest start</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="minor-earliest-start"
                  type="time"
                  step="60"
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  className={TIME_INPUT_CLASSES}
                />
                <InputGroupAddon>
                  <ClockIcon size={14} />
                </InputGroupAddon>
              </InputGroup>
            </Field>
          )}
        </form.Field>

        <form.Field name="minorRules.latestFinishTime">
          {field => (
            <Field>
              <FieldLabel htmlFor="minor-latest-finish">Latest finish</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="minor-latest-finish"
                  type="time"
                  step="60"
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  className={TIME_INPUT_CLASSES}
                />
                <InputGroupAddon>
                  <ClockIcon size={14} />
                </InputGroupAddon>
              </InputGroup>
            </Field>
          )}
        </form.Field>
      </div>

      <FieldDescription className="mt-3">
        Guardian consent capture is handled on the staff profile, not here.
      </FieldDescription>
    </section>
  );
}
