import { auth } from '@/lib/auth/config'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar userName={session?.user?.name} userEmail={session?.user?.email} />
      <main className="flex-1 p-10 overflow-auto">
        {children}
      </main>
    </div>
  )
}