import { ImageResponse } from 'next/og'
import { getDb } from '@/lib/db/client'
import { getPassByUserLink } from '@/lib/db/passes'
import { getEntriesForPass } from '@/lib/db/entries'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function Icon({
  params,
}: {
  params: Promise<{ userLink: string }>
}) {
  const { userLink } = await params
  const db = getDb()
  const pass = getPassByUserLink(db, userLink)

  const name = pass?.name ?? 'Pass'
  const used = pass ? getEntriesForPass(db, pass.id).length : 0
  const total = pass?.totalEntries ?? 0

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 40,
        color: 'white',
        fontFamily: 'sans-serif',
        padding: 16,
      }}
    >
      <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1 }}>{used}</div>
      <div style={{ fontSize: 18, opacity: 0.5, marginTop: 2 }}>/ {total}</div>
      <div
        style={{
          fontSize: 13,
          marginTop: 10,
          opacity: 0.75,
          maxWidth: 140,
          textAlign: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </div>
    </div>,
    { ...size },
  )
}
