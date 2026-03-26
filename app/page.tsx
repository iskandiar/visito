import { CreatePassForm } from '@/components/create-pass-form'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-14 flex flex-col items-center gap-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-2 overflow-hidden">
            <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
              <text x="28" y="42" fontFamily="Georgia, 'Times New Roman', serif" fontSize="42" fontWeight="700" fill="white" textAnchor="middle" dominantBaseline="auto">V</text>
            </svg>
          </div>
          <h1 className="text-4xl font-bold font-serif tracking-tight">Visito</h1>
          <p className="text-base text-muted-foreground max-w-xs leading-relaxed">
            Manage gym visits, yoga classes, or any activity with a fixed number of entries.
            Share a link — anyone can record a visit.
          </p>
        </div>

        {/* How it works */}
        <div className="w-full space-y-3 bg-muted/50 rounded-2xl px-5 py-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            How it works
          </h2>
          <ol className="space-y-2.5">
            {[
              'Create a pass with a name and number of entries',
              'Share the link — no app or account needed',
              'The pass holder bookmarks the link and taps it to record each visit',
              'Once all entries are used, the pass closes',
            ].map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground leading-relaxed">{step}</span>
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
