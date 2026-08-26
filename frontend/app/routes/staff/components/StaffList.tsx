import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  MoreVerticalIcon,
  SearchIcon,
  UsersIcon,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '~/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { useVenueContextStore } from '~/lib/venue-context';
import { useDeactivateStaffMember, useStaffMembers } from '../hooks';
import {
  CLASSIFICATION_META,
  EMPLOYMENT_TYPE_META,
  PERMISSION_LEVEL_META,
} from '../types';
import type { StaffMember } from '../types';
import { DeactivateStaffDialog } from './DeactivateStaffDialog';
import { toast } from '~/components/ui/toast';

const PAGE_SIZE_ITEMS = [
  { label: '10', value: '10' },
  { label: '25', value: '25' },
  { label: '50', value: '50' },
];

function NameCell({ staff, onSelect }: { staff: StaffMember; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-w-0 cursor-pointer items-center gap-3 text-left"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{staff.name}</p>
        <p className="text-muted-foreground truncate text-xs">{staff.email}</p>
      </div>
    </button>
  );
}

function StaffListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map(i => (
        <Skeleton key={i} className="h-15 rounded-lg" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="border-destructive bg-destructive-tint flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <p className="text-destructive text-sm font-medium">
        Couldn't load staff for this venue
      </p>
      <p className="text-muted-foreground text-xs">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <UsersIcon size={20} className="text-muted-foreground" />
      <p className="text-sm font-medium">No staff assigned to this venue yet</p>
      <p className="text-muted-foreground text-xs">
        Add a staff member to start building this venue's roster.
      </p>
      <Button variant="default" size="sm" onClick={onAdd}>
        Add staff member
      </Button>
    </div>
  );
}

function StaffDataTable({ staff }: { staff: StaffMember[] }) {
  const navigate = useNavigate();
  const searchInputId = useId();
  const pageSizeSelectId = useId();

  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);

  const deactivateStaffMember = useDeactivateStaffMember();

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return staff;
    return staff.filter(s => s.name.toLowerCase().includes(term));
  }, [search, staff]);

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }));
  }, [search]);

  const columns = useMemo<ColumnDef<StaffMember>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => (
          <NameCell
            staff={row.original}
            onSelect={() => navigate(`/staff/${row.original.id}`)}
          />
        ),
      },
      {
        id: 'classification',
        header: 'Classification',
        accessorFn: row => CLASSIFICATION_META[row.classification].label,
        cell: ({ row }) => {
          const classification = CLASSIFICATION_META[row.original.classification];
          return (
            <div>
              <p className="text-sm font-medium">{classification.label}</p>
              <p className="text-muted-foreground text-xs">
                {classification.description}
              </p>
            </div>
          );
        },
      },
      {
        id: 'employmentType',
        header: 'Employment type',
        accessorFn: row => EMPLOYMENT_TYPE_META[row.employmentType].label,
        cell: ({ row }) => (
          <Badge variant="outline">
            {EMPLOYMENT_TYPE_META[row.original.employmentType].label}
          </Badge>
        ),
      },
      {
        id: 'permissionLevel',
        header: 'Permission',
        accessorFn: row => PERMISSION_LEVEL_META[row.permissionLevel].label,
        cell: ({ row }) => (
          <Badge variant="outline">
            {PERMISSION_LEVEL_META[row.original.permissionLevel].label}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: row => (row.isActive ? 'Active' : 'Inactive'),
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="bg-success-tint text-success">Active</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Inactive
            </Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreVerticalIcon size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/staff/${row.original.id}`)}>
                View profile
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={!row.original.isActive}
                onClick={() => setDeactivateTarget(row.original)}
              >
                Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [navigate],
  );

  const table = useReactTable({
    data: filteredStaff,
    columns,
    state: { pagination },
    // onSortingChange: setSorting,
    onPaginationChange: setPagination,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    // getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <Label htmlFor={searchInputId} className="sr-only">
          Search staff by name
        </Label>
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            id={searchInputId}
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </InputGroup>
      </div>

      <div className="border-border rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="h-11">
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <div
                        className="flex h-full items-center gap-2 select-none"
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            header.column.getToggleSortingHandler()?.(e);
                          }
                        }}
                        tabIndex={0}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: (
                            <ChevronUpIcon className="shrink-0 opacity-60" size={16} />
                          ),
                          desc: (
                            <ChevronDownIcon className="shrink-0 opacity-60" size={16} />
                          ),
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No staff match "{search}"
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Label htmlFor={pageSizeSelectId} className="max-sm:sr-only">
            Rows per page
          </Label>
          <Select
            items={PAGE_SIZE_ITEMS}
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={value => value !== null && table.setPageSize(Number(value))}
          >
            <SelectTrigger id={pageSizeSelectId} className="w-fit whitespace-nowrap">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PAGE_SIZE_ITEMS.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <p className="text-muted-foreground flex grow justify-end text-sm whitespace-nowrap">
          <span className="text-foreground">
            {filteredStaff.length === 0
              ? 0
              : table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                1}
            -
            {Math.min(
              table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                table.getState().pagination.pageSize,
              filteredStaff.length,
            )}
          </span>
          &nbsp;of <span className="text-foreground">{filteredStaff.length}</span>
        </p>

        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <Button
                size="icon"
                variant="outline"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Go to first page"
              >
                <ChevronFirstIcon />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                size="icon"
                variant="outline"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Go to previous page"
              >
                <ChevronLeftIcon />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                size="icon"
                variant="outline"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Go to next page"
              >
                <ChevronRightIcon />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                size="icon"
                variant="outline"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Go to last page"
              >
                <ChevronLastIcon />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {deactivateTarget && (
        <DeactivateStaffDialog
          staff={deactivateTarget}
          open={!!deactivateTarget}
          onOpenChange={open => !open && setDeactivateTarget(null)}
          onDeactivated={() =>
            toast.add({
              title: 'Staff member deactivated',
              type: 'success',
            })
          }
        />
      )}
    </div>
  );
}

export default function StaffList() {
  const navigate = useNavigate();
  const { activeVenueId } = useVenueContextStore();

  const staffQuery = useStaffMembers(activeVenueId);

  return (
    <>
      {staffQuery.isLoading && <StaffListSkeleton />}
      {staffQuery.isError && (
        <ErrorState
          message={
            staffQuery.error instanceof Error
              ? staffQuery.error.message
              : 'Something went wrong.'
          }
          onRetry={() => staffQuery.refetch()}
        />
      )}
      {staffQuery.isSuccess && staffQuery.data.length === 0 && (
        <EmptyState onAdd={() => navigate('/staff/new')} />
      )}
      {staffQuery.isSuccess && staffQuery.data.length > 0 && (
        <StaffDataTable staff={staffQuery.data} />
      )}
    </>
  );
}
