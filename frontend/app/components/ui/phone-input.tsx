import * as React from 'react';
import { ChevronsUpDownIcon } from 'lucide-react';
import * as RPNInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';

import { cn } from '~/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '~/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';

type PhoneInputProps = Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'ref'> &
  Omit<RPNInput.Props<typeof RPNInput.default>, 'onChange'> & {
    onChange?: (value: RPNInput.Value) => void;
    ref?: React.Ref<React.ComponentRef<typeof RPNInput.default>>;
  };

function PhoneInput({ className, onChange, ref, ...props }: PhoneInputProps) {
  return (
    <RPNInput.default
      ref={ref}
      className={cn('flex', className)}
      autoComplete="tel"
      inputMode="tel"
      flagComponent={FlagComponent}
      countrySelectComponent={CountrySelect}
      inputComponent={PhoneNumberField}
      containerComponent={PhoneInputContainer}
      smartCaret={false}
      onChange={value => onChange?.(value ?? ('' as RPNInput.Value))}
      {...props}
    />
  );
}

function PhoneInputContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return <InputGroup className={className} {...props} />;
}

function PhoneNumberField({ className, ...props }: React.ComponentProps<'input'>) {
  return <InputGroupInput className={className} {...props} />;
}

type CountrySelectOption = {
  label: string;
  value: RPNInput.Country;
  divider?: boolean;
};

type CountrySelectProps = {
  disabled?: boolean;
  readOnly?: boolean;
  value?: RPNInput.Country;
  onChange: (value?: RPNInput.Country) => void;
  options: CountrySelectOption[];
};

function CountrySelect({
  disabled,
  readOnly,
  value,
  onChange,
  options,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectableOptions = options.filter(
    (option): option is CountrySelectOption & { value: RPNInput.Country } =>
      Boolean(option.value) && !option.divider,
  );

  return (
    <InputGroupAddon className="pl-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <InputGroupButton
              variant="ghost"
              size="sm"
              disabled={disabled || readOnly}
              aria-label="Select country"
              className="gap-1 px-1.5"
            >
              <FlagComponent
                country={value ?? ('ZZ' as RPNInput.Country)}
                countryName={value ?? 'International'}
              />
              <ChevronsUpDownIcon className="opacity-50" />
            </InputGroupButton>
          }
        />
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {selectableOptions.map(option => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    data-checked={option.value === value}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <FlagComponent country={option.value} countryName={option.label} />
                    <span className="flex-1 truncate">{option.label}</span>
                    <span className="text-muted-foreground">
                      {`+${RPNInput.getCountryCallingCode(option.value)}`}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </InputGroupAddon>
  );
}

function FlagComponent({ country, countryName }: RPNInput.FlagProps) {
  const Flag = flags[country];

  return (
    <span className="flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded-sm hover:bg-transparent">
      {Flag ? <Flag title={countryName} /> : null}
    </span>
  );
}

/** Wraps `isValidPhoneNumber` for use as a TanStack Form field validator — see § Forms in CLAUDE.md. */
function isPhoneNumberValid(value: string | undefined): value is RPNInput.Value {
  if (!value) {
    return false;
  }
  return RPNInput.isValidPhoneNumber(value);
}

export { PhoneInput, isPhoneNumberValid };
export type { PhoneInputProps };
