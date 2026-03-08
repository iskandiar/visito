'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Entry } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SupervisorEntryGridProps {
  entries: Entry[]
  totalEntries: number
  supervisorLink: string
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map(({ number, entry }) => (
          <div
            key={number}
            className={cn(
              'rounded-xl border p-3 min-h-[80px] flex flex-col gap-1',
              entry
                ? 'bg-card border-border'
                : 'bg-muted/30 border-dashed border-muted-foreground/30'
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
                <div className="flex gap-1 mt-auto pt-1">
                  <button
                    onClick={() => openEdit(entry)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Edit
                  </button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <span className="text-xs text-muted-foreground/40 mt-auto">Available</span>
            )}
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => { if (!open) setEditingEntry(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit entry</DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </>
  )
}
