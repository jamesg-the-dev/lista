'use client';

import { DateTime } from 'luxon';
import * as React from 'react';

import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Field, FieldLabel } from '~/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';

interface DatePickerSimpleProps {
  id?: string;
  label?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  className?: string;
  required?: boolean;
}

export function DatePickerSimple({
  id = 'date-picker-simple',
  label = 'Date',
  value,
  onChange,
  className,
  required,
}: DatePickerSimpleProps) {
  const [internalDate, setInternalDate] = React.useState<Date>();
  const [open, setOpen] = React.useState(false);

  const date = value ?? internalDate;

  const handleSelect = (selected: Date | undefined) => {
    if (onChange) {
      onChange(selected);
    } else {
      setInternalDate(selected);
    }
    setOpen(false);
  };

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" id={id} className="justify-start font-normal">
              {date ? (
                DateTime.fromJSDate(date).toLocaleString(DateTime.DATE_FULL)
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            defaultMonth={date}
            captionLayout="dropdown"
            {...(required ? { required: true } : {})}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
