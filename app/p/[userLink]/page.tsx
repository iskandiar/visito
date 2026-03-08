import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db/client'
import { getPassByUserLink } from '@/lib/db/passes'
import { getEntriesForPass } from '@/lib/db/entries'
import { EntryGrid } from '@/components/entry-grid'
import { AddEntrySheet } from '@/components/add-entry-sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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
  const isFull = used >= pass.totalEntries

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{pass.name}</h1>
          <p className="text-sm text-muted-foreground">
            Issued {pass.createdAt.toLocaleDateString()}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <Badge variant={isFull ? 'destructive' : 'secondary'} className="text-sm px-3 py-1">
            {used} / {pass.totalEntries} used
          </Badge>
          {isFull && (
            <span className="text-sm font-medium text-destructive">Pass full</span>
          )}
        </div>

        <Separator />

        {/* Entry grid */}
        <EntryGrid entries={entries} totalEntries={pass.totalEntries} />

        {/* Add entry */}
        <AddEntrySheet userLink={userLink} isFull={isFull} />
      </div>
    </main>
  )
}
