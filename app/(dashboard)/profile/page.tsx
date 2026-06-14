import { redirect }      from 'next/navigation'
import { auth }          from '@/lib/auth/config'
import { db }            from '@/db/client'
import { PageHeader }    from '@/components/layout/PageHeader'
import { ProfileClient } from '@/components/profile/ProfileClient'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: {
      name:      true,
      email:     true,
      provider:  true,
      profile:   true,
      createdAt: true,
      _count: {
        select: {
          activities: true,
          efforts:    true,
        },
      },
    },
  })

  if (!user) redirect('/login')

  const profile = (user.profile ?? {}) as {
    gender?:    string | null
    birthYear?: number | null
    weightKg?:  number | null
    heightCm?:  number | null
    bikeType?:  string | null
    bikeCount?: number | null
    bikeBrand?: string | null
    city?:      string | null
    region?:    string | null
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageHeader
        eyebrow="Account"
        title="Il tuo profilo"
        description={`Membro dal ${user.createdAt.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })} · ${user._count.activities} attività · ${user._count.efforts} sforzi`}
      />
      <div className="mt-8">
        <ProfileClient
          name={user.name ?? null}
          email={user.email!}
          profile={profile}
          provider={user.provider}
        />
      </div>
    </div>
  )
}