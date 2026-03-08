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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  if (result) {
    const userUrl = `${window.location.origin}/p/${result.userLink}`
    const supervisorUrl = `${window.location.origin}/s/${result.supervisorLink}`
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pass created!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium">User link (share this)</Label>
            <div className="flex gap-2">
              <Input value={userUrl} readOnly className="text-sm" />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(userUrl)}>
                Copy
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-amber-600">
              Supervisor link (keep private)
            </Label>
            <div className="flex gap-2">
              <Input value={supervisorUrl} readOnly className="text-sm" />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(supervisorUrl)}>
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Save this link — it lets you edit or delete entries. Do not share publicly.
            </p>
          </div>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              setResult(null)
              setName('')
            }}
          >
            Create another pass
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create a new pass</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create pass'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
