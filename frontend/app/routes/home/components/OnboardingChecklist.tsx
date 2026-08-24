import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Users,
} from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';
import { Textarea } from '~/components/ui/textarea';

import {
  useBulkInviteStaff,
  useDismissOnboardingChecklist,
  useSetOnboardingStepStatus,
  useSkipAddStaffWithPlaceholders,
} from '../hooks';
import { useOnboardingStore } from '../store';
import { ONBOARDING_STEP_KEYS, allStepsResolved, completedStepCount } from '../types';
import type { OnboardingStepKey, OnboardingStepStatus } from '../types';

interface OnboardingStepItem {
  key: OnboardingStepKey;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: OnboardingStepStatus;
  actionLabel: string;
  onAction: () => void;
  actionPending?: boolean;
  actionDisabled?: boolean;
  onSkip?: () => void;
  skipPending?: boolean;
  renderBody?: () => React.ReactNode;
}

function StaticOnboardingItem({ item }: { item: OnboardingStepItem }) {
  const isResolved = item.status === 'completed';

  return (
    <div className="border-border flex items-center gap-2 rounded-md border px-5 py-4">
      {isResolved ? (
        <CheckCircle2 color="green" className="text-primary size-4 shrink-0" />
      ) : (
        <CircleDashed className="text-muted-foreground size-4 shrink-0" />
      )}
      <span>{item.title}</span>
      {item.status === 'skipped' && (
        <span className="text-muted-foreground text-xs font-normal">(Skipped)</span>
      )}
    </div>
  );
}

function OnboardingAccordionItem({ item }: { item: OnboardingStepItem }) {
  const isResolved = item.status !== 'pending';

  return (
    <AccordionItem value={item.key} className="border-border rounded-md border">
      <AccordionTrigger className="items-center px-5 py-4 hover:no-underline">
        <span className="flex items-center gap-2">
          <CircleDashed className="text-muted-foreground size-4 shrink-0" />
          <span>{item.title}</span>
          {item.status === 'skipped' && (
            <span className="text-muted-foreground text-xs font-normal">(Skipped)</span>
          )}
        </span>
      </AccordionTrigger>

      {isResolved ? null : (
        <AccordionContent className="px-5 pb-5">
          {item.renderBody ? (
            item.renderBody()
          ) : (
            <div className="bg-muted flex flex-col items-center justify-center gap-2 rounded-md px-5 py-4 text-center">
              {item.icon}
              <span className="text-muted-foreground max-w-xs text-sm">
                {item.description}
              </span>
              <div className="mt-3 flex gap-2">
                {item.onSkip && (
                  <Button
                    variant="ghost"
                    disabled={item.skipPending}
                    onClick={item.onSkip}
                  >
                    Skip for now
                  </Button>
                )}
                <Button
                  disabled={item.actionPending || item.actionDisabled}
                  onClick={item.onAction}
                >
                  {item.actionPending ? 'Working…' : item.actionLabel}
                </Button>
              </div>
            </div>
          )}
        </AccordionContent>
      )}
    </AccordionItem>
  );
}

export default function OnboardingChecklist({ venueId }: { venueId: string }) {
  const navigate = useNavigate();
  const status = useOnboardingStore();
  const setStepStatus = useSetOnboardingStepStatus(venueId);
  const dismissChecklist = useDismissOnboardingChecklist(venueId);
  const bulkInvite = useBulkInviteStaff(venueId);
  const skipAddStaffWithPlaceholders = useSkipAddStaffWithPlaceholders(venueId);

  const [inviteEmails, setInviteEmails] = useState('');

  const [openKey, setOpenKey] = useState<OnboardingStepKey | null>(
    () => ONBOARDING_STEP_KEYS.find(key => status[key] === 'pending') ?? null,
  );

  function advancePast(key: OnboardingStepKey) {
    const currentIndex = ONBOARDING_STEP_KEYS.indexOf(key);
    const nextPending = ONBOARDING_STEP_KEYS.slice(currentIndex + 1).find(
      k => useOnboardingStore.getState()[k] === 'pending',
    );
    setOpenKey(nextPending ?? null);
  }

  async function handleSendInvites() {
    const emails = inviteEmails
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    await bulkInvite.mutateAsync(emails);
    setStepStatus.mutate({ step: 'addStaff', status: 'completed' });
    setInviteEmails('');
    advancePast('addStaff');
  }

  function skip(key: OnboardingStepKey) {
    setStepStatus.mutate({ step: key, status: 'skipped' });
    advancePast(key);
  }

  function skipAddStaff() {
    skipAddStaffWithPlaceholders.mutate();
    advancePast('addStaff');
  }

  function goToRoster() {
    setStepStatus.mutate({ step: 'buildFirstRoster', status: 'completed' });
    navigate('/roster');
  }

  const steps: OnboardingStepItem[] = [
    {
      key: 'venueProfile',
      title: 'Venue Profile',
      description:
        'Trading days/hours, venue location and state — this determines the award and public holiday rules that apply.',
      icon: <Building2 className="size-6 shrink-0" />,
      status: status.venueProfile,
      actionLabel: 'Set up venue profile',
      onAction: () => navigate('/settings/venue-profile?onboarding=1'),
      onSkip: () => skip('venueProfile'),
      skipPending: setStepStatus.isPending,
    },
    {
      key: 'awardPaySetup',
      title: 'Award & Pay Setup',
      description:
        "We'll handle the award math for you — confirm the suggested award or adjust it, so every shift's pay is transparent and correct.",
      icon: <Banknote className="size-6 shrink-0" />,
      status: status.awardPaySetup,
      actionLabel: 'Review award & pay',
      onAction: () => navigate('/settings/award-pay?onboarding=1'),
      onSkip: () => skip('awardPaySetup'),
      skipPending: setStepStatus.isPending,
    },
    {
      key: 'addStaff',
      title: 'Add Staff',
      description:
        'Paste one email per line to invite your team, or add people individually.',
      icon: <Users className="size-6 shrink-0" />,
      status: status.addStaff,
      actionLabel: 'Send invites',
      onAction: handleSendInvites,
      actionPending: bulkInvite.isPending,
      actionDisabled: inviteEmails.trim().length === 0,
      onSkip: skipAddStaff,
      skipPending: skipAddStaffWithPlaceholders.isPending,
      renderBody: () => (
        <div className="bg-muted flex flex-col gap-3 rounded-md px-5 py-4">
          <Textarea
            placeholder={'jamie@example.com\nkai@example.com'}
            rows={3}
            value={inviteEmails}
            onChange={e => setInviteEmails(e.target.value)}
          />
          <Button
            type="button"
            variant="link"
            className="w-fit px-0"
            onClick={() => navigate('/staff/new')}
          >
            Or add one staff member individually
          </Button>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={skipAddStaffWithPlaceholders.isPending}
              onClick={skipAddStaff}
            >
              Skip for now
            </Button>
            <Button
              disabled={bulkInvite.isPending || inviteEmails.trim().length === 0}
              onClick={handleSendInvites}
            >
              {bulkInvite.isPending ? 'Sending…' : 'Send invites'}
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'buildFirstRoster',
      title: 'Build First Roster',
      description:
        status.addStaff === 'skipped'
          ? "Jump into the roster builder for this fortnight — we've added a couple of example staff so there's something to work with."
          : 'Jump into the roster builder for this fortnight.',
      icon: <CalendarDays className="size-6 shrink-0" />,
      status: status.buildFirstRoster,
      actionLabel: 'Build first roster',
      onAction: goToRoster,
    },
  ];

  const completedCount = completedStepCount(status);
  const resolved = allStepsResolved(status);
  const progress = Math.round((completedCount / ONBOARDING_STEP_KEYS.length) * 100);

  return (
    <div className="bg-background flex justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Get your venue set up</CardTitle>
            <CardDescription>
              Follow the steps below to get to a published roster as fast as possible —
              every step is skippable except the last.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="space-y-2">
              <p className="text-sm">
                {completedCount} of {ONBOARDING_STEP_KEYS.length} complete
              </p>
              <Progress value={progress} />
            </div>

            <Accordion
              value={openKey ? [openKey] : []}
              onValueChange={value =>
                setOpenKey((value[0] as OnboardingStepKey | undefined) ?? null)
              }
              className="space-y-3"
            >
              {steps.map(step => {
                return step.status === 'pending' ? (
                  <OnboardingAccordionItem key={step.key} item={step} />
                ) : (
                  <StaticOnboardingItem key={step.key} item={step} />
                );
              })}
            </Accordion>

            {resolved && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  disabled={dismissChecklist.isPending}
                  onClick={() => dismissChecklist.mutate()}
                >
                  Dismiss checklist
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
