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

interface NewRoleDialogProps {
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When set, this is a re-map of an existing role rather than a new one —
  // the backend has no "rename a role" command (RoleController only exposes
  // create/deactivate, see FEATURE_SETTINGS_STAFF_ROLES.md §5's CQRS
  // table), so name/colour become read-only and only the award
  // classification select is actually submitted (SetRoleAwardMappingCommand).
  existingRole?: Role;
}

// This is the single most important UI moment in the whole Staff & Roles
// screen (§7): the award classification select sits directly under the name
// field and is required, with the info line making the "why" explicit —
// operationalising "every role must map to an award classification before
// it can be used on a published roster." Three fields read together at
// submit time (name, colour, classification) — qualifies for TanStack Form
// per CLAUDE.md §4's first bullet, even though this dialog stays
// self-contained rather than splitting into a separate field component,
// since nothing else needs to render these fields.
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
        : (await createRoleMutation.mutateAsync({
            displayName: value.displayName,
            colorTag: value.colorTag,
          })).id;

      await setMappingMutation.mutateAsync({
        roleId,
        awardClassificationId: value.awardClassificationId,
      });

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
                <FieldLabel htmlFor="role-name">Role name</FieldLabel>
                <Input
                  id="role-name"
                  value={field.state.value}
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
                      className="size-8 rounded-full p-0"
                    >
                      <span className={`block size-4 rounded-full ${swatch.twClass}`} />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
            )}
          </form.Field>

          <form.Field name="awardClassificationId">
            {field => (
              <Field>
                <FieldLabel htmlFor="role-classification">
                  Award classification (required)
                </FieldLabel>
                {!awardId ? (
                  <FieldDescription>
                    Configure this venue's award in Award &amp; Pay before mapping roles.
                  </FieldDescription>
                ) : (
                  <Select
                    items={classifications.map(c => ({ value: c.id, label: c.name }))}
                    value={field.state.value || null}
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
                  Every role must map to an award classification before it can be used on
                  a published roster.
                </FieldDescription>
              </Field>
            )}
          </form.Field>
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <form.Subscribe
            selector={state => [state.values.displayName, state.values.awardClassificationId]}
          >
            {([displayName, awardClassificationId]) => (
              <Button
                onClick={() => form.handleSubmit()}
                disabled={isSaving || !displayName.trim() || !awardClassificationId}
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
