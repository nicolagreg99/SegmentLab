import Link from 'next/link'
import { logout } from '@/lib/auth/actions'

interface SidebarProps {
  userName?: string | null
  userEmail?: string | null
}

const navItems = [
  { href: '/', icon: '🗺️', label: 'Overview' },
  { href: '/activities', icon: '🚴', label: 'Attività' },
  { href: '/segments', icon: '🏁', label: 'Segmenti' },
  { href: '/profile', icon: '👤', label: 'Profilo' },
]

export function Sidebar({ userName, userEmail }: SidebarProps) {
  return (
    <aside className="w-60 border-r border-gray-800 flex flex-col px-4 py-6 shrink-0">
      <div className="px-3 mb-8">
        <span className="text-lg font-bold tracking-tight">SegmentLab</span>
        <span className="ml-1 text-blue-500">.</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <p className="px-3 text-xs text-gray-600 uppercase tracking-widest mb-2">Menu</p>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-800 pt-4 mt-4">
        <div className="px-3 mb-3">
          <p className="text-sm font-medium text-white truncate">{userName}</p>
          <p className="text-xs text-gray-500 truncate">{userEmail}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <span>↩</span> Esci
          </button>
        </form>
      </div>
    </aside>
  )
}