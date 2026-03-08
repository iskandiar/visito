import { CreatePassForm } from '@/components/create-pass-form'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 flex flex-col items-center gap-12">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Entry Pass</h1>
          <p className="text-lg text-muted-foreground max-w-sm">
            Create passes for gym visits, yoga classes, or any activity with a limited number
            of entries. Share the link — anyone can record a visit.
          </p>
        </div>

        {/* How it works */}
        <div className="w-full max-w-md space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            How it works
          </h2>
          <ol className="space-y-2 text-sm">
            {[
              'Create a pass with a name and number of entries',
              'Share the user link with the pass holder',
              'They tap the link to record each visit',
              'Once all entries are used, the pass closes',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Form */}
        <CreatePassForm />
      </div>
    </main>
  )
}
