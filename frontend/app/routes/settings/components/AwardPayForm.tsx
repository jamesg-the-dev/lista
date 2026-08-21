import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from '@tanstack/react-form';
import { CheckIcon, TriangleAlertIcon } from 'lucide-react';

import { Checkbox } from '~/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '~/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '~/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';

import type { AwardDto, AwardPayTabValue, DayOfWeekName, PayPeriod } from '../types';
import { DAY_OF_WEEK_ITEMS, PAY_PERIOD_ITEMS, PENALTY_TYPE_ITEMS } from '../types';
import { SectionHeader } from './form-ui';

// Owned by AwardPayTab.tsx (which also owns the save mutation and the
// below-minimum-super confirm dialog) — same split as VenueProfileForm.tsx.
export type AwardPayTabFormApi = ReactFormExtendedApi<
  AwardPayTabValue,
  FormValidateOrFn<AwardPayTabValue> | undefined,
  FormValidateOrFn<AwardPayTabValue> | undefined,
  FormAsyncValidateOrFn<AwardPayTabValue> | undefined,
  FormValidateOrFn<AwardPayTabValue> | undefined,
  FormAsyncValidateOrFn<AwardPayTabValue> | undefined,
  FormValidateOrFn<AwardPayTabValue> | undefined,
  FormAsyncValidateOrFn<AwardPayTabValue> | undefined,
  FormValidateOrFn<AwardPayTabValue> | undefined,
  FormAsyncValidateOrFn<AwardPayTabValue> | undefined,
  FormAsyncValidateOrFn<AwardPayTabValue> | undefined,
  unknown
>;

interface AwardPayFormProps {
  form: AwardPayTabFormApi;
  awards: AwardDto[];
  statutoryMinimumSuperPercent: number;
}

export default function AwardPayForm({
  form,
  awards,
  statutoryMinimumSuperPercent,
}: AwardPayFormProps) {
  const awardItems = awards.map(a => ({
    value: a.id,
    label: `${a.name} (${a.awardCode})`,
  }));

  return (
    <section>
      <SectionHeader
        title="Award & pay configuration"
        subtitle="Every change is versioned — saving takes effect from today and never rewrites past pay periods."
      />
      <FieldGroup>
        <form.Subscribe selector={state => state.values}>
          {values => {
            const selectedAward = awards.find(a => a.id === values.awardId);
            const casualLoadingMinimum =
              selectedAward?.minimumCasualLoadingPercent ?? null;
            const meetsCasualLoadingMinimum =
              casualLoadingMinimum === null ||
              values.casualLoadingPercent >= casualLoadingMinimum;

            return (
              <div className="grid grid-cols-2 gap-3">
                <Field className="col-span-2">
                  <FieldLabel htmlFor="award-select">Applicable award</FieldLabel>
                  <Select
                    items={awardItems}
                    value={values.awardId}
                    onValueChange={value =>
                      value !== null && form.setFieldValue('awardId', value)
                    }
                  >
                    <SelectTrigger id="award-select" className="w-full">
                      <SelectValue placeholder="Select an award…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {awardItems.map(item => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="casual-loading">Casual loading</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="casual-loading"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={values.casualLoadingPercent}
                      onChange={e =>
                        form.setFieldValue(
                          'casualLoadingPercent',
                          Number(e.target.value) || 0,
                        )
                      }
                    />
                    <InputGroupAddon>
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                      {meetsCasualLoadingMinimum ? (
                        <CheckIcon className="text-success" />
                      ) : (
                        <TriangleAlertIcon className="text-destructive" />
                      )}
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    {casualLoadingMinimum === null
                      ? 'This award has no reference rate data yet.'
                      : `Award minimum: ${casualLoadingMinimum}% — can't be saved lower.`}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="super-rate">Superannuation guarantee</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="super-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={values.superannuationRatePercent}
                      onChange={e => {
                        form.setFieldValue(
                          'superannuationRatePercent',
                          Number(e.target.value) || 0,
                        );
                        // Any edit invalidates a prior "save anyway" confirm —
                        // it was only ever a confirmation of the value that
                        // was on screen at the time, not a blanket waiver.
                        form.setFieldValue('confirmBelowMinimumSuper', false);
                      }}
                    />
                    <InputGroupAddon>
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                      {values.superannuationRatePercent >=
                      statutoryMinimumSuperPercent ? (
                        <CheckIcon className="text-success" />
                      ) : (
                        <TriangleAlertIcon className="text-destructive" />
                      )}
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    {values.superannuationRatePercent >= statutoryMinimumSuperPercent
                      ? `Meets the ${statutoryMinimumSuperPercent}% statutory minimum.`
                      : `Below the ${statutoryMinimumSuperPercent}% statutory minimum — saving will ask for confirmation.`}
                  </FieldDescription>
                </Field>
              </div>
            );
          }}
        </form.Subscribe>

        <form.Field name="penaltyToggles">
          {field => (
            <FieldSet>
              <FieldLegend variant="label">Penalty rates</FieldLegend>
              <FieldDescription>
                Applies to the labour cost dashboard and payroll export — leave a penalty
                disabled if this venue never trades those hours.
              </FieldDescription>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {PENALTY_TYPE_ITEMS.map(item => (
                  <label key={item.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={field.state.value[item.value]}
                      onCheckedChange={checked =>
                        field.handleChange({
                          ...field.state.value,
                          [item.value]: checked === true,
                        })
                      }
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
            </FieldSet>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="payPeriod">
            {field => (
              <Field>
                <FieldLabel>Pay period</FieldLabel>
                <ToggleGroup
                  variant="outline"
                  value={[field.state.value]}
                  onValueChange={next =>
                    next[0] && field.handleChange(next[0] as PayPeriod)
                  }
                >
                  {PAY_PERIOD_ITEMS.map(item => (
                    <ToggleGroupItem key={item.value} value={item.value}>
                      {item.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
            )}
          </form.Field>

          <form.Field name="payPeriodCutoffDay">
            {field => (
              <Field>
                <FieldLabel htmlFor="pay-period-cutoff">Pay run cut-off day</FieldLabel>
                <Select
                  items={DAY_OF_WEEK_ITEMS}
                  value={field.state.value}
                  onValueChange={value =>
                    value !== null && field.handleChange(value as DayOfWeekName)
                  }
                >
                  <SelectTrigger id="pay-period-cutoff" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DAY_OF_WEEK_ITEMS.map(item => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>
        </div>
      </FieldGroup>
    </section>
  );
}
