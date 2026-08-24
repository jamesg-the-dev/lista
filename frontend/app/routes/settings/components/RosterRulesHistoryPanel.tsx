import { ChevronDownIcon } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';

import { useRosterComplianceConfigurationHistory } from '../hooks';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Read-only audit view — collapsed by default, same treatment as
// ConfigurationHistoryPanel.tsx (Award & Pay's equivalent).
export default function RosterRulesHistoryPanel({ venueId }: { venueId: string }) {
  const historyQuery = useRosterComplianceConfigurationHistory(venueId);

  return (
    <Collapsible>
      <CollapsibleTrigger className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase">
        Configuration history
        <ChevronDownIcon size={14} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        {historyQuery.isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {historyQuery.isSuccess && historyQuery.data.length === 0 && (
          <p className="text-muted-foreground text-sm">No changes recorded yet.</p>
        )}

        {historyQuery.isSuccess && historyQuery.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective from</TableHead>
                <TableHead>Effective to</TableHead>
                <TableHead>Shift length</TableHead>
                <TableHead>Min rest</TableHead>
                <TableHead>Overtime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.data.map(config => (
                <TableRow key={config.id}>
                  <TableCell className="tabular-nums">
                    {formatDate(config.effectiveFromUtc)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {config.effectiveToUtc
                      ? formatDate(config.effectiveToUtc)
                      : 'Present'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {(config.minShiftLengthMinutes / 60).toFixed(1)}–
                    {(config.maxShiftLengthMinutes / 60).toFixed(1)} hrs
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {(config.minRestBetweenShiftsMinutes / 60).toFixed(1)} hrs
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {(config.weeklyOvertimeThresholdMinutes / 60).toFixed(1)} hrs
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
