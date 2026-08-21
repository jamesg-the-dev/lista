export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <p className="text-muted-foreground font-sans text-xs font-semibold tracking-widest uppercase">
        {title}
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
    </div>
  );
}
