'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const STORAGE_KEY = 'a2hs-dismissed'

export function AddToHomeScreenBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isInStandaloneMode =
      'standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true
    const dismissed = localStorage.getItem(STORAGE_KEY)

    if (isIOS && !isInStandaloneMode && !dismissed) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Sheet>
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t bg-background px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">📲</span>
          <span className="font-medium">Add to Home Screen</span>
        </div>
        <div className="flex items-center gap-2">
          <SheetTrigger className="text-sm font-medium text-primary underline-offset-2 hover:underline">
            How?
          </SheetTrigger>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      </div>

      <SheetContent side="bottom" className="rounded-t-2xl pb-10">
        <SheetHeader className="mb-6">
          <SheetTitle>Add to Home Screen</SheetTitle>
        </SheetHeader>
        <ol className="space-y-5">
          <li className="flex items-start gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            <div>
              <p className="font-medium">Tap the Share button</p>
              <p className="text-sm text-muted-foreground">
                Tap the{' '}
                <span className="font-medium">
                  ↑ Share
                </span>{' '}
                icon at the bottom of Safari.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              2
            </span>
            <div>
              <p className="font-medium">Tap &ldquo;Add to Home Screen&rdquo;</p>
              <p className="text-sm text-muted-foreground">
                Scroll down in the share sheet and tap{' '}
                <span className="font-medium">Add to Home Screen</span>.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              3
            </span>
            <div>
              <p className="font-medium">Tap &ldquo;Add&rdquo;</p>
              <p className="text-sm text-muted-foreground">
                Confirm by tapping <span className="font-medium">Add</span> in the top-right corner.
              </p>
            </div>
          </li>
        </ol>
        <button
          onClick={dismiss}
          className="mt-8 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
        >
          Got it
        </button>
      </SheetContent>
    </Sheet>
  )
}
