import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { useAddAvailabilityException, useRemoveAvailabilityException } from '../hooks';
import { TIME_BLOCK_META, type AvailabilityException, type TimeBlock } from '../types';
import { EmptyNote } from './EmptyNote';
import { DAY_LABELS, type DayOfWeek } from '~/lib/date-types';
import { Button } from '~/components/ui/button';
import { XIcon } from 'lucide-react';
import { useForm } from '@tanstack/react-form';
import { Field, FieldLabel } from '~/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Checkbox } from '~/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';

const DAY_ITEMS = DAY_LABELS.map((label, i) => ({ value: String(i), label }));

export function AvailabilitySection({
  staffId,
  exceptions,
}: {
  staffId: string;
  exceptions: AvailabilityException[];
}) {
  const addMutation = useAddAvailabilityException(staffId);
  const removeMutation = useRemoveAvailabilityException(staffId);

  const form = useForm({
    defaultValues: { dayOfWeek: 0 as DayOfWeek, allDay: true, blocks: [] as TimeBlock[] },
    onSubmit: async ({ value }) => {
      await addMutation.mutateAsync({
        dayOfWeek: value.dayOfWeek,
        blocks: value.allDay ? 'all_day' : value.blocks,
      });
      form.reset();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Standing availability</CardTitle>
        <CardDescription>
          Days/blocks this staff member is NOT available. Anything not listed here is
          assumed available.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2">
          {exceptions.length === 0 && (
            <EmptyNote text="No standing exceptions — assumed available every day." />
          )}
          {exceptions.map(ex => (
            <div
              key={ex.id}
              className="border-border flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span className="text-sm">
                <strong>{DAY_LABELS[ex.dayOfWeek]}</strong>{' '}
                {ex.blocks === 'all_day'
                  ? '— unavailable all day'
                  : `— unavailable ${ex.blocks.map(b => TIME_BLOCK_META[b].label).join(', ')}`}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeMutation.mutate(ex.id)}
                disabled={removeMutation.isPending}
              >
                <XIcon size={14} />
              </Button>
            </div>
          ))}
        </div>
        <div className="border-border flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <form.Subscribe selector={state => state.values}>
            {values => (
              <>
                <Field className="w-auto">
                  <FieldLabel htmlFor="availability-day">Day</FieldLabel>
                  <Select
                    items={DAY_ITEMS}
                    value={String(values.dayOfWeek)}
                    onValueChange={v =>
                      form.setFieldValue('dayOfWeek', Number(v) as DayOfWeek)
                    }
                  >
                    <SelectTrigger id="availability-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {DAY_ITEMS.map(item => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field orientation="horizontal" className="w-auto pb-2.5">
                  <Checkbox
                    id="availability-all-day"
                    checked={values.allDay}
                    onCheckedChange={checked =>
                      form.setFieldValue('allDay', checked === true)
                    }
                  />
                  <FieldLabel
                    htmlFor="availability-all-day"
                    className="text-xs font-normal"
                  >
                    All day
                  </FieldLabel>
                </Field>
                {!values.allDay && (
                  <ToggleGroup
                    className="pb-1"
                    variant="outline"
                    multiple
                    value={values.blocks}
                    onValueChange={v => form.setFieldValue('blocks', v as TimeBlock[])}
                  >
                    {(Object.keys(TIME_BLOCK_META) as TimeBlock[]).map(b => (
                      <ToggleGroupItem key={b} value={b}>
                        {TIME_BLOCK_META[b].label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => form.handleSubmit()}
                  disabled={
                    addMutation.isPending ||
                    (!values.allDay && values.blocks.length === 0)
                  }
                >
                  Add exception
                </Button>
              </>
            )}
          </form.Subscribe>
        </div>
      </CardContent>
    </Card>
  );
}
