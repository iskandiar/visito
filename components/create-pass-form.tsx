'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PRESET_COUNTS = [8, 10, 12, 24]

export function CreatePassForm() {
  const [name, setName] = useState('')
  const [totalEntries, setTotalEntries] = useState<number>(10)
  const [customEntries, setCustomEntries] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    userLink: string
    supervisorLink: string
  } | null>(null)
  const [copied, setCopied] = useState<'user' | 'supervisor' | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const entries = useCustom ? parseInt(customEntries) : totalEntries
    if (!name.trim()) return setError('Pass name is required')
    if (!entries || entries < 1 || entries > 1000)
      return setError('Entry count must be between 1 and 1000')

    setLoading(true)
    try {
      const res = await fetch('/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), totalEntries: entries }),
      })
      if (!res.ok) throw new Error('Failed to create pass')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, which: 'user' | 'supervisor') {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  if (result) {
    const userUrl = `${window.location.origin}/p/${result.userLink}`
    const supervisorUrl = `${window.location.origin}/s/${result.supervisorLink}`
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-lg">Pass created!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
            <Label className="text-sm font-semibold text-primary">User link — share this</Label>
            <div className="flex gap-2">
              <Input value={userUrl} readOnly className="text-sm bg-white dark:bg-background" />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => copyToClipboard(userUrl, 'user')}
              >
                {copied === 'user' ? '✓ Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2 dark:bg-amber-950/20 dark:border-amber-800/50">
            <Label className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Supervisor link — keep private
            </Label>
            <div className="flex gap-2">
              <Input value={supervisorUrl} readOnly className="text-sm bg-white dark:bg-background" />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => copyToClipboard(supervisorUrl, 'supervisor')}
              >
                {copied === 'supervisor' ? '✓ Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
              Save this link — it lets you edit or delete entries. Do not share publicly.
            </p>
          </div>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              setResult(null)
              setName('')
              setCopied(null)
              setUseCustom(false)
              setCustomEntries('')
              setTotalEntries(10)
            }}
          >
            Create another pass
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create a new pass</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Pass name</Label>
            <Input
              id="name"
              placeholder="e.g. Anna – Yoga 10-pack"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Number of entries</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COUNTS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={!useCustom && totalEntries === n ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTotalEntries(n)
                    setUseCustom(false)
                  }}
                >
                  {n}
                </Button>
              ))}
              <Button
                type="button"
                variant={useCustom ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseCustom(true)}
              >
                Custom
              </Button>
            </div>
            {useCustom && (
              <Input
                type="number"
                min={1}
                max={1000}
                placeholder="Enter number"
                value={customEntries}
                onChange={(e) => setCustomEntries(e.target.value)}
              />
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
            {loading ? 'Creating…' : 'Create pass'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
