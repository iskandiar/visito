'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Entry } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SupervisorEntryGridProps {
  entries: Entry[]
  totalEntries: number
  supervisorLink: string
}

function formatVisitDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SupervisorEntryGrid({
  entries,
  totalEntries,
  supervisorLink,
}: SupervisorEntryGridProps) {
  const router = useRouter()
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editComment, setEditComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const slots = Array.from({ length: totalEntries }, (_, i) => ({
    number: i + 1,
    entry: entries[i] ?? null,
  }))

  async function handleDelete(entryId: string) {
    if (!confirm('Delete this entry?')) return
    const res = await fetch(`/api/supervisor/${supervisorLink}/entries/${entryId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      alert('Failed to delete entry. Please try again.')
      return
    }
    router.refresh()
  }

  function openEdit(entry: Entry) {
    setEditingEntry(entry)
    setEditDate(entry.visitDate)
    setEditComment(entry.comment ?? '')
    setError('')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingEntry) return
    setError('')
    setSaving(true)
    try {
      const res = await fetch(
        `/api/supervisor/${supervisorLink}/entries/${editingEntry.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitDate: editDate,
            comment: editComment || null,
          }),
        }
      )
      if (!res.ok) {
        const body = await res.json()
        return setError(body.error ?? 'Failed to save')
      }
      setEditingEntry(null)
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
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
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{formatVisitDate(entry.visitDate)}</div>
                  {entry.comment && (
                    <div className="text-xs text-muted-foreground truncate">{entry.comment}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(entry)}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-foreground/40 flex-1">Available</span>
            )}
          </div>
        ))}
      </div>

      {/* Edit sheet */}
      <Sheet open={!!editingEntry} onOpenChange={(open) => { if (!open) setEditingEntry(null) }}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle>Edit entry</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1">
              <Label>Visit date</Label>
              <Input
                type="date"
                max={today}
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Comment (optional)</Label>
              <Input
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingEntry(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
