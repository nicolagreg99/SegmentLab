import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/db/client'

// Verifica che l'utente abbia almeno un effort registrato su questo segmento,
// ovvero che il segmento "appartenga" a lui.
async function userOwnsSegment(segmentId: string, userId: string) {
  const effort = await db.segmentEffort.findFirst({
    where: { segmentId, userId },
    select: { id: true },
  })
  return !!effort
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const { id } = await params

  const owns = await userOwnsSegment(id, session.user.id)
  if (!owns) {
    return NextResponse.json({ error: 'Segmento non trovato' }, { status: 404 })
  }

  const segment = await db.segment.findUnique({
    where: { id },
    include: {
      efforts: {
        where: { userId: session.user.id },
        orderBy: { date: 'desc' },
        include: { activity: { select: { id: true, name: true, date: true } } },
      },
    },
  })

  if (!segment) {
    return NextResponse.json({ error: 'Segmento non trovato' }, { status: 404 })
  }

  const points = JSON.parse(segment.pointsJson)

  return NextResponse.json({
    ...segment,
    pointsJson: undefined,
    points,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const { id } = await params

  const owns = await userOwnsSegment(id, session.user.id)
  if (!owns) {
    return NextResponse.json({ error: 'Segmento non trovato' }, { status: 404 })
  }

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome non valido' }, { status: 400 })
  }

  const segment = await db.segment.update({
    where: { id },
    data: { name: name.trim() },
  })

  return NextResponse.json(segment)
}