import { CheckCircle2, Circle } from 'lucide-react';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';

import type { OnboardingStepStatus } from '../types';

interface OnboardingCardProps {
  title: string;
  description: string;
  status: OnboardingStepStatus;
  primaryLabel: string;
  onPrimaryAction: () => void;
  primaryPending?: boolean;
  primaryDisabled?: boolean;
  onSkip?: () => void;
  skipPending?: boolean;
  children?: React.ReactNode;
}

export default function OnboardingCard({
  title,
  description,
  status,
  primaryLabel,
  onPrimaryAction,
  primaryPending,
  primaryDisabled,
  onSkip,
  skipPending,
  children,
}: OnboardingCardProps) {
  const isDone = status !== 'pending';

  return (
    <Card className={cn(isDone && 'bg-muted/40')}>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-start gap-3">
          {isDone ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          ) : (
            <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          )}
          <div>
            <CardTitle className={cn(isDone && 'text-muted-foreground')}>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
        {status === 'skipped' && <Badge variant="secondary">Skipped</Badge>}
        {status === 'completed' && <Badge variant="secondary">Done</Badge>}
      </CardHeader>

      {!isDone && children && <CardContent>{children}</CardContent>}

      {!isDone && (
        <CardFooter className="justify-end gap-2 border-t">
          {onSkip && (
            <Button type="button" variant="ghost" disabled={skipPending} onClick={onSkip}>
              Skip for now
            </Button>
          )}
          <Button
            type="button"
            className="font-semibold"
            disabled={primaryPending || primaryDisabled}
            onClick={onPrimaryAction}
          >
            {primaryPending ? 'Working…' : primaryLabel}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
