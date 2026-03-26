import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db/client'
import { getPassBySupervisorLink } from '@/lib/db/passes'
import { getEntriesForPass } from '@/lib/db/entries'
import { SupervisorEntryGrid } from '@/components/supervisor-entry-grid'
import { AddEntrySheet } from '@/components/add-entry-sheet'
import { CopyPassLink } from '@/components/copy-pass-link'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ supervisorLink: string }>
}) {
  const { supervisorLink } = await params
  const db = getDb()
  const pass = getPassBySupervisorLink(db, supervisorLink)
  if (!pass) return { title: 'Not Found | Visito' }
  return { title: `${pass.name} | Visito` }
}

export default async function SupervisorPage({
  params,
}: {
  params: Promise<{ supervisorLink: string }>
}) {
  const { supervisorLink } = await params
  const db = getDb()
  const pass = getPassBySupervisorLink(db, supervisorLink)
  if (!pass) notFound()

  const entries = getEntriesForPass(db, pass.id)
  const used = entries.length
  const remaining = pass.totalEntries - used
  const isFull = used >= pass.totalEntries
  const pct = Math.round((used / pass.totalEntries) * 100)

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6 pb-24">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold font-serif tracking-tight">{pass.name}</h1>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50">
              Supervisor
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Issued {pass.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <CopyPassLink userLink={pass.userLink} />
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold">
              {isFull ? (
                <span className="text-destructive">Pass full</span>
              ) : (
                <span>{remaining} {remaining === 1 ? 'entry' : 'entries'} remaining</span>
              )}
            </span>
            <span className="text-sm text-muted-foreground">{used} / {pass.totalEntries}</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Supervisor entry grid with edit/delete */}
        <SupervisorEntryGrid
          entries={entries}
          totalEntries={pass.totalEntries}
          supervisorLink={supervisorLink}
        />

        {/* Add entry (supervisor can also add entries) */}
        <div className="sticky bottom-4 z-10">
          <AddEntrySheet userLink={pass.userLink} isFull={isFull} />
        </div>
      </div>
    </main>
  )
}
