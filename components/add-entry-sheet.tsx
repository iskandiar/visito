'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AddEntrySheetProps {
  userLink: string
  isFull: boolean
}

export function AddEntrySheet({ userLink, isFull }: AddEntrySheetProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [visitDate, setVisitDate] = useState(today)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/passes/${userLink}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitDate, comment: comment || undefined }),
      })
      if (res.status === 409) return setError('Pass is full')
      if (!res.ok) {
        const body = await res.json()
        return setError(body.error ?? 'Failed to record visit')
      }
      setOpen(false)
      setComment('')
      setVisitDate(today)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isFull) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        This pass is full. A new pass must be issued for further visits.
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
      <SheetTrigger
        render={
          <button
            className={buttonVariants({ size: 'lg' }) + ' w-full text-base h-14'}
          />
        }
      >
        Record a visit
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle>Record a visit</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="visit-date">Visit date</Label>
            <Input
              id="visit-date"
              type="date"
              max={today}
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Input
              id="comment"
              placeholder="e.g. Morning session"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading ? 'Saving…' : 'Save visit'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
