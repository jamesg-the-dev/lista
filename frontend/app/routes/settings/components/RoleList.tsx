import { useState } from 'react';
import { AlertTriangleIcon, PlusIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';

import { useDeactivateRole, useRolesForVenue } from '../hooks';
import { ROLE_COLOR_SWATCHES } from '../types';
import type { Role } from '../types';
import { SectionHeader } from './form-ui';
import NewRoleDialog from './NewRoleDialog';

function swatchClass(colorTag: string | null): string {
  return ROLE_COLOR_SWATCHES.find(s => s.value === colorTag)?.twClass ?? 'bg-muted-foreground';
}

export default function RoleList({ venueId }: { venueId: string }) {
  const rolesQuery = useRolesForVenue(venueId);
  const deactivateMutation = useDeactivateRole(venueId);

  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | Role>('closed');

  const roles = rolesQuery.data ?? [];

  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <SectionHeader
          title="Roles"
          subtitle="Every role must map to an award classification before it can be used on a published roster."
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogMode('create')}
        >
          <PlusIcon data-icon="inline-start" size={14} />
          New Role
        </Button>
      </div>

      {rolesQuery.isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {rolesQuery.isError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn't load roles for this venue</AlertTitle>
          <AlertDescription>
            {rolesQuery.error instanceof Error
              ? rolesQuery.error.message
              : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      )}

      {rolesQuery.isSuccess && roles.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No roles yet — create one to start assigning staff and rostering shifts under it.
        </p>
      )}

      {roles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {roles.map(role => (
            <div
              key={role.id}
              className="border-border flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`size-2.5 shrink-0 rounded-full ${swatchClass(role.colorTag)}`} />
                <span className="truncate text-sm font-medium">{role.displayName}</span>
                {role.mappedAwardClassificationName ? (
                  <Badge variant="outline" className="text-muted-foreground shrink-0">
                    Mapped: {role.mappedAwardClassificationName}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="shrink-0">
                    <AlertTriangleIcon data-icon="inline-start" size={12} />
                    Not mapped
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDialogMode(role)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deactivateMutation.isPending}
                  onClick={() => deactivateMutation.mutate(role.id)}
                >
                  Deactivate
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deactivateMutation.isError && (
        <Alert variant="destructive" className="mt-2">
          <AlertTitle>Couldn't deactivate this role</AlertTitle>
          <AlertDescription>
            {deactivateMutation.error instanceof Error
              ? deactivateMutation.error.message
              : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Keyed by the edit target so the form resets to the right role each
          time — TanStack Form only reads defaultValues once at mount. */}
      <NewRoleDialog
        key={dialogMode === 'closed' || dialogMode === 'create' ? 'create' : dialogMode.id}
        venueId={venueId}
        open={dialogMode !== 'closed'}
        onOpenChange={open => !open && setDialogMode('closed')}
        existingRole={dialogMode === 'closed' || dialogMode === 'create' ? undefined : dialogMode}
      />
    </section>
  );
}
