import type { CSSProperties, ReactNode } from "react";

// Small presentational primitives shared between StaffMemberForm.tsx and the
// availability/leave sections in StaffProfile.tsx — kept here rather than
// duplicated in each.

export const inputStyle: CSSProperties = {
  borderColor: "var(--border)",
  background: "var(--input)",
  color: "var(--foreground)",
};

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3">
      <p
        className="font-sans font-semibold text-xs uppercase tracking-widest"
        style={{ color: "var(--muted-foreground)" }}
      >
        {title}
      </p>
      <p
        className="text-xs mt-0.5"
        style={{ color: "var(--muted-foreground)" }}
      >
        {subtitle}
      </p>
    </div>
  );
}
