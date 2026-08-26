import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '~/components/ui/alert-dialog';
import { useDeactivateStaffMember } from '../hooks';
import { getApiErrorMessage } from '~/lib/api-client';

export function DeactivateStaffDialog({
  staff,
  open,
  onOpenChange,
  onDeactivated,
}: {
  staff: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeactivated?: () => void;
}) {
  const deactivateStaffMember = useDeactivateStaffMember();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {staff.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They'll no longer be available to roster at this venue. Past shifts and
            timesheets are kept — this can't be undone from here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deactivateStaffMember.isError && (
          <p className="text-destructive text-sm">
            {getApiErrorMessage(deactivateStaffMember.error)}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deactivateStaffMember.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deactivateStaffMember.isPending}
            onClick={() =>
              deactivateStaffMember.mutate(staff.id, {
                onSuccess: () => {
                  onOpenChange(false);
                  onDeactivated?.();
                },
              })
            }
          >
            {deactivateStaffMember.isPending ? 'Deactivating…' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
