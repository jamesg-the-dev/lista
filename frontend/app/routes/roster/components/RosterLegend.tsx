import { roleColor } from '../types';
import type { Role } from '../types';

interface RosterLegendProps {
  roles: Role[];
}

export function RosterLegend({ roles }: RosterLegendProps) {
  return (
    <div className="flex flex-wrap gap-4 px-6 pb-6">
      {roles
        .filter(r => r.isActive)
        .map(r => (
          <div key={r.id} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: roleColor(r) }}
            />
            <span className="text-muted-foreground text-xs">{r.displayName}</span>
          </div>
        ))}
      <span className="text-muted-foreground ml-auto text-xs">
        Rates and compliance rules shown are illustrative for demo purposes — not
        authoritative payroll or legal advice.
      </span>
    </div>
  );
}
