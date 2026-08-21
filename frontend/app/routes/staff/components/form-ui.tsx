// Small presentational primitive shared between StaffMemberForm.tsx and the
// availability/leave sections in StaffProfile.tsx — kept here rather than
// duplicated in each.

export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <p className="font-sans text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
