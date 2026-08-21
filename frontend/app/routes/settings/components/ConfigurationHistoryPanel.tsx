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

import { useAwardConfigurationHistory } from '../hooks';
import type { AwardConfigurationDto, AwardDto } from '../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Read-only audit view — collapsed by default so it doesn't compete for
// attention with the actual configuration form above it (per the spec's
// mockup). Deliberately lightweight: a plain Table, not a paginated data
// grid, since this list only grows one row per save.
export default function ConfigurationHistoryPanel({
  venueId,
  awards,
}: {
  venueId: string;
  awards: AwardDto[];
}) {
  const historyQuery = useAwardConfigurationHistory(venueId);

  const awardName = (config: AwardConfigurationDto) =>
    awards.find(a => a.id === config.awardId)?.name ?? config.awardId;

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
                <TableHead>Award</TableHead>
                <TableHead>Effective from</TableHead>
                <TableHead>Effective to</TableHead>
                <TableHead>Casual loading</TableHead>
                <TableHead>Super</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.data.map(config => (
                <TableRow key={config.id}>
                  <TableCell>{awardName(config)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(config.effectiveFromUtc)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {config.effectiveToUtc
                      ? formatDate(config.effectiveToUtc)
                      : 'Present'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {config.casualLoadingPercent}%
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {config.superannuationRatePercent}%
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
