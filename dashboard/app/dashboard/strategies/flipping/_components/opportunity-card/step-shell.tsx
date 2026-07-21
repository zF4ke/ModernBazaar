import { ReactNode } from "react"

/**
 * One quiet shape for every step of the play. The sequence is carried by the
 * number chip, not by giving each step its own color. Money values inside use
 * mono; gain/loss hues only where the value is genuinely a gain or a cost.
 */
export function StepShell({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/12 font-mono text-[11px] font-bold text-primary">
          {n}
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="space-y-1.5 pl-[30px] text-xs leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  )
}

export function StepRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  )
}
