import { useForm } from '@tanstack/react-form';

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';

import {
  useActiveAwardConfiguration,
  useAwardClassifications,
  useCreateRole,
  useSetRoleAwardMapping,
} from '../hooks';
import { ROLE_COLOR_SWATCHES } from '../types';
import type { Role } from '../types';
import { Icon, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';

interface NewRoleDialogProps {
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRole?: Role;
}

export default function NewRoleDialog({
  venueId,
  open,
  onOpenChange,
  existingRole,
}: NewRoleDialogProps) {
  const activeAwardQuery = useActiveAwardConfiguration(venueId);
  const awardId = activeAwardQuery.data?.awardId;
  const classificationsQuery = useAwardClassifications(awardId);
  const createRoleMutation = useCreateRole(venueId);
  const setMappingMutation = useSetRoleAwardMapping(venueId);

  const isSaving = createRoleMutation.isPending || setMappingMutation.isPending;
  const saveError = createRoleMutation.error ?? setMappingMutation.error;

  const form = useForm({
    defaultValues: {
      displayName: existingRole?.displayName ?? '',
      colorTag: existingRole?.colorTag ?? ROLE_COLOR_SWATCHES[0].value,
      awardClassificationId: existingRole?.mappedAwardClassificationId ?? '',
    },
    onSubmit: async ({ value }) => {
      const roleId = existingRole
        ? existingRole.id
        : (
            await createRoleMutation.mutateAsync({
              displayName: value.displayName,
              colorTag: value.colorTag,
            })
          ).id;

      if (value.awardClassificationId) {
        await setMappingMutation.mutateAsync({
          roleId,
          awardClassificationId: value.awardClassificationId,
        });
      }

      onOpenChange(false);
      form.reset();
    },
  });

  const classifications = classificationsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingRole ? 'Edit award mapping' : 'New role'}</DialogTitle>
          <DialogDescription>
            {existingRole
              ? `Change which award classification "${existingRole.displayName}" is paid under.`
              : 'Roles are venue-defined display labels — how your team actually talks about jobs.'}
          </DialogDescription>
        </DialogHeader>

        {saveError && (
          <Alert variant="destructive">
            <AlertTitle>Couldn't save this role</AlertTitle>
            <AlertDescription>
              {saveError instanceof Error ? saveError.message : 'Something went wrong.'}
            </AlertDescription>
          </Alert>
        )}

        <FieldGroup>
          <form.Field name="displayName">
            {field => (
              <Field>
                <FieldLabel htmlFor="role-name">
                  Role name<span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="role-name"
                  value={field.state.value}
                  required
                  onChange={e => field.handleChange(e.target.value)}
                  placeholder="Cellar Hand"
                  disabled={!!existingRole}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="colorTag">
            {field => (
              <Field>
                <FieldLabel>Colour tag</FieldLabel>
                <ToggleGroup
                  variant="outline"
                  value={[field.state.value]}
                  onValueChange={next => {
                    const value = next[0];
                    if (value) field.handleChange(value);
                  }}
                  disabled={!!existingRole}
                >
                  {ROLE_COLOR_SWATCHES.map(swatch => (
                    <ToggleGroupItem
                      key={swatch.value}
                      value={swatch.value}
                      aria-label={swatch.value}
                      className={`*:focus-visible:ring-ring rounded-full ${swatch.twClass} ${field.state.value === swatch.value ? 'ring-ring ring-1 ring-offset-1' : ''} size-6 min-h-6 min-w-6 p-0 *:focus-visible:ring-1 *:focus-visible:ring-offset-1`}
                    >
                      <span
                        className={`block size-full rounded-full ${swatch.twClass}`}
                      />
                    </ToggleGroupItem>
                  ))}
                  {/* TODO hook the color picker up when ready */}
                  {/* <Tooltip>
                    <TooltipTrigger
                      render={
                        <FieldLabel
                          htmlFor="color-picker"
                          className="border-border text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background size-6 min-h-6 min-w-6 cursor-pointer rounded-full border p-0 *:focus-visible:ring-1 *:focus-visible:ring-offset-1"
                        >
                          <Plus />
                        </FieldLabel>
                      }
                    />
                    <TooltipContent>Add colour</TooltipContent>
                  </Tooltip> */}
                </ToggleGroup>
                {/* <Input type="color" id="color-picker" className="sr-only" /> */}
              </Field>
            )}
          </form.Field>

          {(awardId || existingRole) && (
            <form.Field name="awardClassificationId">
              {field => (
                <Field>
                  <FieldLabel htmlFor="role-classification">
                    Award classification
                    {existingRole && <span className="text-destructive">*</span>}
                  </FieldLabel>
                  {!awardId ? (
                    <FieldDescription>
                      Configure this venue's award in Award &amp; Pay, then come back here
                      to map this role to a classification.
                    </FieldDescription>
                  ) : (
                    <Select
                      items={classifications.map(c => ({ value: c.id, label: c.name }))}
                      value={field.state.value || null}
                      required={!!existingRole}
                      onValueChange={value => value !== null && field.handleChange(value)}
                    >
                      <SelectTrigger id="role-classification">
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {classifications.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                  <FieldDescription>
                    Every role must map to an award classification before it can be used
                    on a published roster.
                  </FieldDescription>
                </Field>
              )}
            </form.Field>
          )}
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <form.Subscribe
            selector={state => [
              state.values.displayName,
              state.values.awardClassificationId,
            ]}
          >
            {([displayName, awardClassificationId]) => (
              <Button
                onClick={() => form.handleSubmit()}
                disabled={
                  isSaving ||
                  !displayName.trim() ||
                  (!!existingRole && !awardClassificationId)
                }
              >
                {isSaving ? 'Saving…' : existingRole ? 'Save mapping' : 'Create role'}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
