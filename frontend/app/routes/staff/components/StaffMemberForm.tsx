import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from '@tanstack/react-form';

import { DatePickerSimple } from '~/components/ui/date-picker';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';

import { CLASSIFICATION_META, EMPLOYMENT_TYPE_META } from '../types';
import type {
  AwardClassification,
  EmploymentType,
  PermissionLevel,
  StaffMember,
  Venue,
} from '../types';
import { SectionHeader } from './form-ui';

// Fields shared by the "add staff member" and "edit staff profile" screens —
// name/contact details and the fields that drive IAwardRateCalculator and
// IRosterComplianceValidator. Standing availability and leave requests are
// NOT part of this shape — they only make sense once a staff record exists,
// so they stay owned by StaffProfile.tsx.
//
// permissionLevel and primaryRoleId are carried through (read on edit,
// defaulted on create) but deliberately NOT rendered as fields here —
// they're edited from Settings → Staff & Roles instead (StaffEditDrawer),
// which is where Role data and the permission-tier picker actually live.
// This form still needs to round-trip both values so saving a profile edit
// here doesn't silently wipe out a permission level or role assignment set
// from that other screen.
export interface StaffMemberFormValue {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  employmentType: EmploymentType;
  classification: AwardClassification;
  maxWeeklyHours: number;
  venueIds: string[];
  permissionLevel: PermissionLevel;
  primaryRoleId: string | null;
}

export function blankStaffMemberForm(defaultVenueId: string): StaffMemberFormValue {
  return {
    name: '',
    email: '',
    phone: '',
    dateOfBirth: new Date(0), // deliberately invalid placeholder — the date picker forces an explicit choice before submit
    employmentType: 'casual',
    classification: 'level_1',
    maxWeeklyHours: 20,
    venueIds: defaultVenueId ? [defaultVenueId] : [],
    permissionLevel: 'staff',
    primaryRoleId: null,
  };
}

export function toStaffMemberFormValue(staff: StaffMember): StaffMemberFormValue {
  return {
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    dateOfBirth: staff.dateOfBirth,
    employmentType: staff.employmentType,
    classification: staff.classification,
    maxWeeklyHours: staff.maxWeeklyHours,
    venueIds: staff.venueIds,
    permissionLevel: staff.permissionLevel,
    primaryRoleId: staff.primaryRoleId,
  };
}

const EMPLOYMENT_TYPE_ITEMS = (Object.keys(EMPLOYMENT_TYPE_META) as EmploymentType[]).map(
  value => ({ value, label: EMPLOYMENT_TYPE_META[value].label }),
);

const CLASSIFICATION_ITEMS = (
  Object.keys(CLASSIFICATION_META) as AwardClassification[]
).map(value => ({
  value,
  label: `${CLASSIFICATION_META[value].label} — ${CLASSIFICATION_META[value].description}`,
}));

// The form instance is owned by the screen that also owns the save mutation
// (NewStaffMember.tsx / StaffProfile.tsx) so the header Save button can
// trigger form.handleSubmit() — this component only renders fields against
// it, per TanStack Form's documented pattern of splitting a form across
// components (https://ui.shadcn.com/docs/forms/tanstack-form).
type StaffMemberFormApi = ReactFormExtendedApi<
  StaffMemberFormValue,
  FormValidateOrFn<StaffMemberFormValue> | undefined,
  FormValidateOrFn<StaffMemberFormValue> | undefined,
  FormAsyncValidateOrFn<StaffMemberFormValue> | undefined,
  FormValidateOrFn<StaffMemberFormValue> | undefined,
  FormAsyncValidateOrFn<StaffMemberFormValue> | undefined,
  FormValidateOrFn<StaffMemberFormValue> | undefined,
  FormAsyncValidateOrFn<StaffMemberFormValue> | undefined,
  FormValidateOrFn<StaffMemberFormValue> | undefined,
  FormAsyncValidateOrFn<StaffMemberFormValue> | undefined,
  FormAsyncValidateOrFn<StaffMemberFormValue> | undefined,
  unknown
>;

interface StaffMemberFormProps {
  form: StaffMemberFormApi;
  venues: Venue[];
}

export default function StaffMemberForm({ form, venues }: StaffMemberFormProps) {
  return (
    <section>
      <SectionHeader
        title="Profile"
        subtitle="Name, contact details and the fields that drive award pay and compliance checks."
      />
      <FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <form.Field name="name">
            {field => (
              <Field className="col-span-2">
                <FieldLabel htmlFor="staff-name">Name</FieldLabel>
                <Input
                  id="staff-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  placeholder="Full name"
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="email">
            {field => (
              <Field>
                <FieldLabel htmlFor="staff-email">Email</FieldLabel>
                <Input
                  id="staff-email"
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  placeholder="name@example.com"
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="phone">
            {field => (
              <Field>
                <FieldLabel htmlFor="staff-phone">Phone</FieldLabel>
                <Input
                  id="staff-phone"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  placeholder="04xx xxx xxx"
                />
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="dateOfBirth">
          {field => (
            <DatePickerSimple
              id="staff-date-of-birth"
              label="Date of birth"
              value={field.state.value.getTime() === 0 ? undefined : field.state.value}
              onChange={date => date && field.handleChange(date)}
              className="max-w-xs"
            />
          )}
        </form.Field>
        <FieldDescription className="-mt-2">
          Collected for compliance — minor rostering rules (max hours, latest finish time)
          apply automatically below 18, not for marketing.
        </FieldDescription>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="employmentType">
            {field => (
              <Field>
                <FieldLabel htmlFor="staff-employment-type">Employment type</FieldLabel>
                <Select
                  items={EMPLOYMENT_TYPE_ITEMS}
                  value={field.state.value}
                  onValueChange={value => value !== null && field.handleChange(value)}
                >
                  <SelectTrigger id="staff-employment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {EMPLOYMENT_TYPE_ITEMS.map(item => (
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
          <form.Field name="maxWeeklyHours">
            {field => (
              <Field>
                <FieldLabel htmlFor="staff-max-hours">Max weekly hours</FieldLabel>
                <Input
                  id="staff-max-hours"
                  type="number"
                  min="0"
                  step="1"
                  value={field.state.value}
                  onChange={e => field.handleChange(Number(e.target.value) || 0)}
                />
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="classification">
          {field => (
            <Field>
              <FieldLabel htmlFor="staff-classification">
                Pay tier / classification (MA000009)
              </FieldLabel>
              <Select
                items={CLASSIFICATION_ITEMS}
                value={field.state.value}
                onValueChange={value => value !== null && field.handleChange(value)}
              >
                <SelectTrigger id="staff-classification">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CLASSIFICATION_ITEMS.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Levels shown are illustrative for demo purposes — not authoritative
                payroll advice.
              </FieldDescription>
            </Field>
          )}
        </form.Field>

        <form.Field name="venueIds">
          {field => (
            <Field>
              <FieldLabel>Venue(s) assigned</FieldLabel>
              <ToggleGroup
                multiple
                variant="outline"
                value={field.state.value}
                onValueChange={field.handleChange}
              >
                {venues.map(v => (
                  <ToggleGroupItem key={v.id} value={v.id}>
                    {v.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </section>
  );
}
