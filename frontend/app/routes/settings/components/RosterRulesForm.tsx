import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from '@tanstack/react-form';
import { LockIcon } from 'lucide-react';

import { Field, FieldDescription, FieldGroup, FieldLabel } from '~/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '~/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';

import type { RosterRulesTabValue } from '../types';
import { MIN_REST_BETWEEN_SHIFTS_FLOOR_HOURS } from '../types';
import { SectionHeader } from './form-ui';

// Owned by RosterRulesTab.tsx (which also owns the save mutation) — same
// split as AwardPayForm.tsx / AwardPayTab.tsx.
export type RosterRulesTabFormApi = ReactFormExtendedApi<
  RosterRulesTabValue,
  FormValidateOrFn<RosterRulesTabValue> | undefined,
  FormValidateOrFn<RosterRulesTabValue> | undefined,
  FormAsyncValidateOrFn<RosterRulesTabValue> | undefined,
  FormValidateOrFn<RosterRulesTabValue> | undefined,
  FormAsyncValidateOrFn<RosterRulesTabValue> | undefined,
  FormValidateOrFn<RosterRulesTabValue> | undefined,
  FormAsyncValidateOrFn<RosterRulesTabValue> | undefined,
  FormValidateOrFn<RosterRulesTabValue> | undefined,
  FormAsyncValidateOrFn<RosterRulesTabValue> | undefined,
  FormAsyncValidateOrFn<RosterRulesTabValue> | undefined,
  unknown
>;

interface RosterRulesFormProps {
  form: RosterRulesTabFormApi;
}

export default function RosterRulesForm({ form }: RosterRulesFormProps) {
  return (
    <section>
      <SectionHeader
        title="Shift length & overtime"
        subtitle="Venue policy, layered on top of the award — flagged as a warning on the affected shift, not blocked, if breached."
      />
      <FieldGroup>
        <form.Subscribe selector={state => state.values}>
          {values => (
            <div className="grid grid-cols-2 gap-3">
              <Field
                data-invalid={values.maxShiftLengthHours < values.minShiftLengthHours}
              >
                <FieldLabel htmlFor="min-shift-length">Minimum shift length</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="min-shift-length"
                    type="number"
                    min="0"
                    step="0.5"
                    value={values.minShiftLengthHours}
                    onChange={e =>
                      form.setFieldValue(
                        'minShiftLengthHours',
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>hrs</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>

              <Field
                data-invalid={values.maxShiftLengthHours < values.minShiftLengthHours}
              >
                <FieldLabel htmlFor="max-shift-length">Maximum shift length</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="max-shift-length"
                    type="number"
                    min="0"
                    step="0.5"
                    aria-invalid={values.maxShiftLengthHours < values.minShiftLengthHours}
                    value={values.maxShiftLengthHours}
                    onChange={e =>
                      form.setFieldValue(
                        'maxShiftLengthHours',
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>hrs</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {values.maxShiftLengthHours < values.minShiftLengthHours && (
                  <FieldDescription>Can't be less than the minimum.</FieldDescription>
                )}
              </Field>
            </div>
          )}
        </form.Subscribe>

        <form.Field name="minRestBetweenShiftsHours">
          {field => (
            <Field>
              <FieldLabel htmlFor="min-rest" className="flex items-center gap-1.5">
                Minimum rest between shifts
                <Tooltip>
                  <TooltipTrigger
                    render={<LockIcon size={13} className="text-muted-foreground" />}
                  />
                  <TooltipContent>
                    Legal minimum under the hospitality award — can't be set lower.
                  </TooltipContent>
                </Tooltip>
              </FieldLabel>
              <InputGroup className="max-w-48">
                <InputGroupInput
                  id="min-rest"
                  type="number"
                  min={MIN_REST_BETWEEN_SHIFTS_FLOOR_HOURS}
                  step="0.5"
                  value={field.state.value}
                  onChange={e =>
                    field.handleChange(
                      Math.max(
                        MIN_REST_BETWEEN_SHIFTS_FLOOR_HOURS,
                        Number(e.target.value) || MIN_REST_BETWEEN_SHIFTS_FLOOR_HOURS,
                      ),
                    )
                  }
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>hrs</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Hard rule — a roster that breaches this can't be published.
              </FieldDescription>
            </Field>
          )}
        </form.Field>

        <form.Field name="weeklyOvertimeThresholdHours">
          {field => (
            <Field>
              <FieldLabel htmlFor="overtime-threshold">
                Weekly overtime threshold
              </FieldLabel>
              <InputGroup className="max-w-48">
                <InputGroupInput
                  id="overtime-threshold"
                  type="number"
                  min="0"
                  step="0.5"
                  value={field.state.value}
                  onChange={e => field.handleChange(Number(e.target.value) || 0)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>hrs</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Hours worked above this per week are flagged as overtime-eligible for the
                labour cost dashboard and payroll export.
              </FieldDescription>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </section>
  );
}
