import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from '@tanstack/react-form';
import { CheckIcon, XIcon } from 'lucide-react';

import { Field, FieldDescription, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

import {
  AU_TIMEZONE_ITEMS,
  AUSTRALIAN_STATES,
  STATE_DEFAULT_TIMEZONE,
  isValidAbn,
} from '../types';
import type { AustralianState, VenueProfileTabValue } from '../types';
import { SectionHeader } from './form-ui';

// The form instance is owned by VenueProfileTab.tsx (which also owns the
// save mutations), so the header Save button can trigger
// form.handleSubmit() — this component only renders fields against it, same
// split as staff/components/StaffMemberForm.tsx.
export type VenueProfileTabFormApi = ReactFormExtendedApi<
  VenueProfileTabValue,
  FormValidateOrFn<VenueProfileTabValue> | undefined,
  FormValidateOrFn<VenueProfileTabValue> | undefined,
  FormAsyncValidateOrFn<VenueProfileTabValue> | undefined,
  FormValidateOrFn<VenueProfileTabValue> | undefined,
  FormAsyncValidateOrFn<VenueProfileTabValue> | undefined,
  FormValidateOrFn<VenueProfileTabValue> | undefined,
  FormAsyncValidateOrFn<VenueProfileTabValue> | undefined,
  FormValidateOrFn<VenueProfileTabValue> | undefined,
  FormAsyncValidateOrFn<VenueProfileTabValue> | undefined,
  FormAsyncValidateOrFn<VenueProfileTabValue> | undefined,
  unknown
>;

interface VenueProfileFormProps {
  form: VenueProfileTabFormApi;
}

const STATE_ITEMS = AUSTRALIAN_STATES.map(value => ({ value, label: value }));

export default function VenueProfileForm({ form }: VenueProfileFormProps) {
  return (
    <section>
      <SectionHeader
        title="Business details"
        subtitle="Used on rosters, payroll exports and compliance calculations."
      />
      <FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <form.Field name="name">
            {field => (
              <Field className="col-span-2">
                <FieldLabel htmlFor="venue-name">Venue name</FieldLabel>
                <Input
                  id="venue-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  placeholder="The Public House"
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="abn">
            {field => {
              const showIndicator = field.state.value.trim().length > 0;
              const valid = isValidAbn(field.state.value);
              return (
                <Field className="col-span-2">
                  <FieldLabel htmlFor="venue-abn">ABN</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="venue-abn"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={e => field.handleChange(e.target.value)}
                      placeholder="12 345 678 901"
                    />
                    {showIndicator && (
                      <InputGroupAddon align="inline-end">
                        {valid ? (
                          <CheckIcon className="text-success" />
                        ) : (
                          <XIcon className="text-destructive" />
                        )}
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                </Field>
              );
            }}
          </form.Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="addressLine1">
            {field => (
              <Field className="col-span-2">
                <FieldLabel htmlFor="venue-address-line1">Address line 1</FieldLabel>
                <Input
                  id="venue-address-line1"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  placeholder="123 Chapel St"
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="addressLine2">
            {field => (
              <Field className="col-span-2">
                <FieldLabel htmlFor="venue-address-line2">Address line 2 (optional)</FieldLabel>
                <Input
                  id="venue-address-line2"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="suburb">
            {field => (
              <Field>
                <FieldLabel htmlFor="venue-suburb">Suburb</FieldLabel>
                <Input
                  id="venue-suburb"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  placeholder="Prahran"
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="state">
            {field => (
              <Field>
                <FieldLabel htmlFor="venue-state">State</FieldLabel>
                <Select
                  items={STATE_ITEMS}
                  value={field.state.value}
                  onValueChange={value => {
                    if (value === null) return;
                    const state = value as AustralianState;
                    field.handleChange(state);
                    form.setFieldValue('timezone', STATE_DEFAULT_TIMEZONE[state]);
                  }}
                >
                  <SelectTrigger id="venue-state" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {STATE_ITEMS.map(item => (
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

          <form.Field name="postcode">
            {field => (
              <Field>
                <FieldLabel htmlFor="venue-postcode">Postcode</FieldLabel>
                <Input
                  id="venue-postcode"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  placeholder="3181"
                />
              </Field>
            )}
          </form.Field>

          <Field>
            <FieldLabel htmlFor="venue-country">Country</FieldLabel>
            <Input id="venue-country" value="Australia" disabled />
          </Field>
        </div>

        <form.Field name="timezone">
          {field => (
            <Field>
              <FieldLabel htmlFor="venue-timezone">Timezone</FieldLabel>
              <Select
                items={AU_TIMEZONE_ITEMS}
                value={field.state.value}
                onValueChange={value => value !== null && field.handleChange(value)}
              >
                <SelectTrigger id="venue-timezone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {AU_TIMEZONE_ITEMS.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Defaults from state — override for venues near a border.
              </FieldDescription>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </section>
  );
}
