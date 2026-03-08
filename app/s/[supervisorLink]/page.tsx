import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db/client'
import { getPassBySupervisorLink } from '@/lib/db/passes'
import { getEntriesForPass } from '@/lib/db/entries'
import { SupervisorEntryGrid } from '@/components/supervisor-entry-grid'
import { AddEntrySheet } from '@/components/add-entry-sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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
  const isFull = used >= pass.totalEntries

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{pass.name}</h1>
            <Badge variant="outline" className="text-xs">Supervisor</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Issued {pass.createdAt.toLocaleDateString()}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <Badge variant={isFull ? 'destructive' : 'secondary'} className="text-sm px-3 py-1">
            {used} / {pass.totalEntries} used
          </Badge>
        </div>

        <Separator />

        {/* Supervisor entry grid with edit/delete */}
        <SupervisorEntryGrid
          entries={entries}
          totalEntries={pass.totalEntries}
          supervisorLink={supervisorLink}
        />

        {/* Add entry (supervisor can also add entries) */}
        <AddEntrySheet userLink={pass.userLink} isFull={isFull} />
      </div>
    </main>
  )
}
