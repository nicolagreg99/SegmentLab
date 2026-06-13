import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/db/client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const activity = await db.activity.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      date: true,
      distanceMeters: true,
      elevationGainMeters: true,
      durationSeconds: true,
      createdAt: true,
      efforts: {
        include: { segment: true },
      },
    },
  })

  if (!activity) {
    return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 })
  }

  return NextResponse.json(activity)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome non valido' }, { status: 400 })
  }

  const activity = await db.activity.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { name: name.trim() },
  })

  return NextResponse.json(activity)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  await db.activity.deleteMany({
    where: { id: params.id, userId: session.user.id },
  })

  return NextResponse.json({ success: true })
}