import type { ChangeEvent } from 'react';

import { Input } from '~/components/ui/input';

import { CLASSIFICATION_META, EMPLOYMENT_TYPE_META } from '../types';
import type { AwardClassification, EmploymentType, StaffMember, Venue } from '../types';
import { FieldLabel, SectionHeader, inputStyle } from './form-ui';

// Fields shared by the "add staff member" and "edit staff profile" screens —
// name/contact details and the fields that drive IAwardRateCalculator and
// IRosterComplianceValidator. Standing availability and leave requests are
// NOT part of this shape — they only make sense once a staff record exists,
// so they stay owned by StaffProfile.tsx.
export interface StaffMemberFormValue {
  name: string;
  email: string;
  phone: string;
  employmentType: EmploymentType;
  classification: AwardClassification;
  maxWeeklyHours: number;
  venueIds: string[];
}

export function blankStaffMemberForm(defaultVenueId: string): StaffMemberFormValue {
  return {
    name: '',
    email: '',
    phone: '',
    employmentType: 'casual',
    classification: 'level_1',
    maxWeeklyHours: 20,
    venueIds: defaultVenueId ? [defaultVenueId] : [],
  };
}

export function toStaffMemberFormValue(staff: StaffMember): StaffMemberFormValue {
  return {
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    employmentType: staff.employmentType,
    classification: staff.classification,
    maxWeeklyHours: staff.maxWeeklyHours,
    venueIds: staff.venueIds,
  };
}

interface StaffMemberFormProps {
  value: StaffMemberFormValue;
  onChange: (value: StaffMemberFormValue) => void;
  venues: Venue[];
}

export default function StaffMemberForm({
  value,
  onChange,
  venues,
}: StaffMemberFormProps) {
  function set<K extends keyof StaffMemberFormValue>(
    key: K,
    fieldValue: StaffMemberFormValue[K],
  ) {
    onChange({ ...value, [key]: fieldValue });
  }

  function toggleVenue(venueId: string) {
    set(
      'venueIds',
      value.venueIds.includes(venueId)
        ? value.venueIds.filter(id => id !== venueId)
        : [...value.venueIds, venueId],
    );
  }

  return (
    <section>
      <SectionHeader
        title="Profile"
        subtitle="Name, contact details and the fields that drive award pay and compliance checks."
      />
      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="col-span-2 flex flex-col gap-1.5">
          <FieldLabel>Name</FieldLabel>
          <Input
            value={value.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set('name', e.target.value)}
            placeholder="Full name"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            value={value.email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set('email', e.target.value)}
            placeholder="name@example.com"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Phone</FieldLabel>
          <Input
            value={value.phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set('phone', e.target.value)}
            placeholder="04xx xxx xxx"
          />
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Employment type</FieldLabel>
          <select
            value={value.employmentType}
            onChange={e => set('employmentType', e.target.value as EmploymentType)}
            className="rounded-lg border px-3 py-2 font-sans text-sm font-medium outline-none"
            style={inputStyle}
          >
            {(Object.keys(EMPLOYMENT_TYPE_META) as EmploymentType[]).map(et => (
              <option key={et} value={et}>
                {EMPLOYMENT_TYPE_META[et].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Max weekly hours</FieldLabel>
          <input
            type="number"
            min="0"
            step="1"
            value={value.maxWeeklyHours}
            onChange={e => set('maxWeeklyHours', Number(e.target.value) || 0)}
            className="rounded-lg border px-3 py-2 font-sans text-sm font-medium tabular-nums outline-none"
            style={inputStyle}
          />
        </label>
      </div>

      <label className="mb-3 flex flex-col gap-1.5">
        <FieldLabel>Pay tier / classification (MA000009)</FieldLabel>
        <select
          value={value.classification}
          onChange={e => set('classification', e.target.value as AwardClassification)}
          className="rounded-lg border px-3 py-2 font-sans text-sm font-medium outline-none"
          style={inputStyle}
        >
          {(Object.keys(CLASSIFICATION_META) as AwardClassification[]).map(c => (
            <option key={c} value={c}>
              {CLASSIFICATION_META[c].label} — {CLASSIFICATION_META[c].description}
            </option>
          ))}
        </select>
        <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          Levels shown are illustrative for demo purposes — not authoritative payroll
          advice.
        </span>
      </label>

      <div>
        <FieldLabel>Venue(s) assigned</FieldLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {venues.map(v => {
            const active = value.venueIds.includes(v.id);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => toggleVenue(v.id)}
                className="rounded-lg px-2.5 py-1.5 font-sans text-xs font-medium"
                style={{
                  background: active ? 'var(--foreground)' : 'var(--muted)',
                  color: active ? 'var(--background)' : 'var(--muted-foreground)',
                }}
              >
                {v.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
