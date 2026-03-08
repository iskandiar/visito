import type { Entry } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface EntryGridProps {
  entries: Entry[]
  totalEntries: number
  supervisorMode?: boolean
  onEdit?: (entry: Entry) => void
  onDelete?: (entryId: string) => void
}

export function EntryGrid({
  entries,
  totalEntries,
  supervisorMode = false,
  onEdit,
  onDelete,
}: EntryGridProps) {
  const slots = Array.from({ length: totalEntries }, (_, i) => ({
    number: i + 1,
    entry: entries[i] ?? null,
  }))

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map(({ number, entry }) => (
        <div
          key={number}
          className={cn(
            'rounded-xl border p-3 min-h-[80px] flex flex-col gap-1',
            entry ? 'bg-card border-border' : 'bg-muted/30 border-dashed border-muted-foreground/30'
          )}
        >
          <span
            className={cn(
              'text-xs font-semibold',
              entry ? 'text-muted-foreground' : 'text-muted-foreground/50'
            )}
          >
            #{number}
          </span>
          {entry ? (
            <>
              <span className="text-sm font-medium">{entry.visitDate}</span>
              {entry.comment && (
                <span className="text-xs text-muted-foreground truncate">{entry.comment}</span>
              )}
              {supervisorMode && (
                <div className="flex gap-1 mt-auto">
                  <button
                    onClick={() => onEdit?.(entry)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Edit
                  </button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button
                    onClick={() => onDelete?.(entry.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground/40 mt-auto">Available</span>
          )}
        </div>
      ))}
    </div>
  )
}
