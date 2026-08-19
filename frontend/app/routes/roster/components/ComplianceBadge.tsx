import { AlertTriangleIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";

import { VIOLATION_TYPE_META } from "../types";
import type { ComplianceOverride, ComplianceViolation } from "../types";

interface ComplianceBadgeProps {
  violations: ComplianceViolation[];
  overrides: ComplianceOverride[];
}

// Grid-cell badge summarising a shift's compliance status at a glance;
// clicking expands the itemised violation list (type + severity + message)
// per CLAUDE.md's "don't flatten compliance data to a boolean" rule.
export function ComplianceBadge({ violations, overrides }: ComplianceBadgeProps) {
  if (violations.length === 0) return null;

  const hasBlocking = violations.some((v) => v.severity === "blocking");

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`${violations.length} compliance ${violations.length === 1 ? "issue" : "issues"}`}
          />
        }
      >
        <Badge variant={hasBlocking ? "destructive" : "outline"} className="shadow-sm">
          <AlertTriangleIcon data-icon="inline-start" />
          {violations.length}
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Compliance</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-3">
          {violations.map((v) => {
            const override = overrides.find((o) => o.violationId === v.id);
            return (
              <div key={v.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant={v.severity === "blocking" ? "destructive" : "outline"}>
                    {v.severity === "blocking" ? "Blocking" : "Warning"}
                  </Badge>
                  <span className="text-xs font-medium">
                    {VIOLATION_TYPE_META[v.type].label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{v.message}</p>
                {v.severity === "blocking" && (
                  <p className="text-xs text-muted-foreground">
                    {override ? (
                      <>Overridden: "{override.reason}"</>
                    ) : (
                      "Not yet overridden"
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
