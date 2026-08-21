import { ClockIcon, PlusIcon, XIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';

import { DAY_LABELS, blankSession } from '../types';
import type { TradingHourSession } from '../types';
import type { VenueProfileTabFormApi } from './VenueProfileForm';
import { SectionHeader } from './form-ui';

const TIME_INPUT_CLASSES =
  'appearance-none tabular-nums [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none';

interface TradingHoursEditorProps {
  form: VenueProfileTabFormApi;
}

export default function TradingHoursEditor({ form }: TradingHoursEditorProps) {
  return (
    <section>
      <SectionHeader
        title="Trading hours"
        subtitle="Warns managers in the roster builder when a shift is scheduled outside normal operating hours."
      />
      <form.Field name="tradingHours">
        {field => {
          const sessions = field.state.value;
          const update = (next: TradingHourSession[]) => field.handleChange(next);

          return (
            <div className="flex flex-col gap-2">
              {DAY_LABELS.map((label, dayOfWeek) => {
                const daySessions = sessions.filter(s => s.dayOfWeek === dayOfWeek);
                const openSessions = daySessions.filter(s => !s.isClosed);
                const isClosed = openSessions.length === 0;

                const setClosed = (closed: boolean) => {
                  const rest = sessions.filter(s => s.dayOfWeek !== dayOfWeek);
                  update([...rest, blankSession(dayOfWeek, closed)]);
                };

                return (
                  <div key={dayOfWeek} className="border-border rounded-lg border px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-9 shrink-0 text-sm font-semibold">{label}</span>

                      <label className="flex shrink-0 items-center gap-1.5">
                        <Checkbox
                          checked={isClosed}
                          onCheckedChange={checked => setClosed(checked === true)}
                        />
                        <span className="text-muted-foreground text-xs">Closed</span>
                      </label>

                      {!isClosed && (
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          {openSessions.map(session => (
                            <TradingHourSessionFields
                              key={session.key}
                              session={session}
                              showLabel={openSessions.length > 1}
                              canRemove={openSessions.length > 1}
                              onChange={next =>
                                update(sessions.map(s => (s.key === session.key ? next : s)))
                              }
                              onRemove={() =>
                                update(sessions.filter(s => s.key !== session.key))
                              }
                            />
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => update([...sessions, blankSession(dayOfWeek, false)])}
                          >
                            <PlusIcon data-icon="inline-start" size={14} />
                            Add session
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }}
      </form.Field>
    </section>
  );
}

function TradingHourSessionFields({
  session,
  showLabel,
  canRemove,
  onChange,
  onRemove,
}: {
  session: TradingHourSession;
  showLabel: boolean;
  canRemove: boolean;
  onChange: (next: TradingHourSession) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5">
      {showLabel && (
        <Input
          value={session.sessionLabel}
          onChange={e => onChange({ ...session, sessionLabel: e.target.value })}
          placeholder="Lunch"
          className="h-9 w-24"
        />
      )}

      <InputGroup className="h-9 w-32 rounded-lg">
        <InputGroupInput
          type="time"
          step="60"
          value={session.openTime}
          onChange={e => onChange({ ...session, openTime: e.target.value })}
          className={TIME_INPUT_CLASSES}
        />
        <InputGroupAddon>
          <ClockIcon size={14} />
        </InputGroupAddon>
      </InputGroup>

      <span className="text-muted-foreground text-xs">–</span>

      <InputGroup className="h-9 w-32 rounded-lg">
        <InputGroupInput
          type="time"
          step="60"
          value={session.closeTime}
          onChange={e => onChange({ ...session, closeTime: e.target.value })}
          className={TIME_INPUT_CLASSES}
        />
        <InputGroupAddon>
          <ClockIcon size={14} />
        </InputGroupAddon>
      </InputGroup>

      <label className="flex items-center gap-1.5">
        <Checkbox
          checked={session.crossesMidnight}
          onCheckedChange={checked => onChange({ ...session, crossesMidnight: checked === true })}
        />
        <span className="text-muted-foreground text-xs">Crosses midnight</span>
      </label>

      {canRemove && (
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
          <XIcon size={14} />
        </Button>
      )}
    </div>
  );
}
