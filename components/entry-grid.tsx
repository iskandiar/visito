import type { Entry } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface EntryGridProps {
  entries: Entry[]
  totalEntries: number
}

function formatVisitDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function EntryGrid({ entries, totalEntries }: EntryGridProps) {
  const slots = Array.from({ length: totalEntries }, (_, i) => ({
    number: i + 1,
    entry: entries[i] ?? null,
  }))

  return (
    <div className="flex flex-col gap-2">
      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No visits yet — use the button below to record your first one.
        </p>
      )}
      {slots.map(({ number, entry }) => (
        <div
          key={number}
          className={cn(
            'rounded-xl border px-4 py-3 flex items-center gap-3 min-h-[56px] transition-colors',
            entry
              ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/50'
              : 'border-dashed border-muted-foreground/20 bg-muted/10'
          )}
        >
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              entry
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                : 'bg-muted text-muted-foreground/40'
            )}
          >
            {number}
          </span>
          {entry ? (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{formatVisitDate(entry.visitDate)}</div>
              {entry.comment && (
                <div className="text-xs text-muted-foreground truncate">{entry.comment}</div>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/40 flex-1">Available</span>
          )}
          {entry && (
            <svg
              className="w-4 h-4 shrink-0 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}
