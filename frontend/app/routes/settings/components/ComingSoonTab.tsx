import { HourglassIcon } from 'lucide-react';

import { Card, CardContent } from '~/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty';

// Placeholder for the settings sections in docs/features/feature-order.md
// (steps 2-4) that don't have a backend yet — Award & Pay Config, Roster
// Rules & Compliance, Staff & Roles. Kept visible rather than hidden so the
// full settings shape is honest about what's coming, matching CLAUDE.md's
// build-order transparency.
export default function ComingSoonTab({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HourglassIcon />
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
