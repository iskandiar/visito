import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db/client'
import { getPassByUserLink } from '@/lib/db/passes'
import { getEntriesForPass } from '@/lib/db/entries'
import { EntryGrid } from '@/components/entry-grid'
import { AddEntrySheet } from '@/components/add-entry-sheet'
import { AddToHomeScreenBanner } from '@/components/add-to-home-screen-banner'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userLink: string }>
}) {
  const { userLink } = await params
  const db = getDb()
  const pass = getPassByUserLink(db, userLink)
  if (!pass) return { title: 'Not Found | Visito' }
  return { title: `${pass.name} | Visito` }
}

export default async function PassPage({
  params,
}: {
  params: Promise<{ userLink: string }>
}) {
  const { userLink } = await params
  const db = getDb()
  const pass = getPassByUserLink(db, userLink)
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
          <h1 className="text-2xl font-bold font-serif tracking-tight">{pass.name}</h1>
          <p className="text-sm text-muted-foreground">
            Issued {pass.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
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

        {/* Entry list */}
        <EntryGrid entries={entries} totalEntries={pass.totalEntries} />

        {/* Add entry */}
        <div className="sticky bottom-4 z-10">
          <AddEntrySheet userLink={userLink} isFull={isFull} />
        </div>
      </div>

      <AddToHomeScreenBanner />
    </main>
  )
}
