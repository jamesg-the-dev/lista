import { PlusIcon, XIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '~/components/ui/input-group';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';

import type { MealBreakRuleRow } from '../types';
import { blankMealBreakRuleRow } from '../types';
import type { RosterRulesTabFormApi } from './RosterRulesForm';
import { SectionHeader } from './form-ui';

interface MealBreakRuleListProps {
  form: RosterRulesTabFormApi;
}

// Same repeatable-row interaction pattern as TradingHoursEditor.tsx, per
// FEATURE_SETTINGS_ROSTER_RULES_COMPLIANCE.md §7's MealBreakRuleList spec.
export default function MealBreakRuleList({ form }: MealBreakRuleListProps) {
  return (
    <section>
      <SectionHeader
        title="Meal breaks"
        subtitle="After this many hours worked, a break of this length is required for shift-length calculations."
      />
      <form.Field name="mealBreakRules">
        {field => {
          const rules = field.state.value;
          const update = (next: MealBreakRuleRow[]) => field.handleChange(next);

          return (
            <div className="flex flex-col gap-2">
              {rules.map(rule => (
                <div
                  key={rule.key}
                  className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <span className="text-muted-foreground text-xs">After</span>
                  <InputGroup className="h-9 w-24 rounded-lg">
                    <InputGroupInput
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={rule.afterHoursWorked}
                      onChange={e =>
                        update(
                          rules.map(r =>
                            r.key === rule.key
                              ? { ...r, afterHoursWorked: Number(e.target.value) || 0 }
                              : r,
                          ),
                        )
                      }
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>hrs</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <span className="text-muted-foreground text-xs">worked →</span>
                  <InputGroup className="h-9 w-24 rounded-lg">
                    <InputGroupInput
                      type="number"
                      min="1"
                      step="5"
                      value={rule.breakDurationMinutes}
                      onChange={e =>
                        update(
                          rules.map(r =>
                            r.key === rule.key
                              ? {
                                  ...r,
                                  breakDurationMinutes: Number(e.target.value) || 0,
                                }
                              : r,
                          ),
                        )
                      }
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>min</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>

                  <ToggleGroup
                    variant="outline"
                    size="sm"
                    value={[rule.isPaid ? 'paid' : 'unpaid']}
                    onValueChange={next => {
                      const value = next[0];
                      if (value) {
                        update(
                          rules.map(r =>
                            r.key === rule.key ? { ...r, isPaid: value === 'paid' } : r,
                          ),
                        );
                      }
                    }}
                  >
                    <ToggleGroupItem value="paid">Paid</ToggleGroupItem>
                    <ToggleGroupItem value="unpaid">Unpaid</ToggleGroupItem>
                  </ToggleGroup>

                  {rules.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => update(rules.filter(r => r.key !== rule.key))}
                    >
                      <XIcon size={14} />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => update([...rules, blankMealBreakRuleRow()])}
              >
                <PlusIcon data-icon="inline-start" size={14} />
                Add another break rule
              </Button>
            </div>
          );
        }}
      </form.Field>
    </section>
  );
}
