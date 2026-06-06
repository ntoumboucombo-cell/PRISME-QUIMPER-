import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Wallet,
  HeartHandshake,
  FolderKanban,
  FileText,
  ScrollText,
  ShieldCheck,
  Calculator,
  UserCircle,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth, AUTH_BYPASS } from '@/auth/AuthContext'
import { ROLE_LABELS } from '@/types'
import type { Permission } from '@/auth/permissions'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  permission?: Permission
}

const NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/comptabilite', label: 'Comptabilité', icon: Calculator, permission: 'finances.read' },
  { to: '/adherents', label: 'Adhérents', icon: Users, permission: 'adherents.read' },
  { to: '/cotisations', label: 'Cotisations', icon: Wallet, permission: 'finances.read' },
  { to: '/dons', label: 'Dons', icon: HeartHandshake, permission: 'finances.read' },
  { to: '/projets', label: 'Projets & Budget', icon: FolderKanban, permission: 'projets.read' },
  { to: '/documents', label: 'Documents', icon: FileText, permission: 'documents.read' },
  { to: '/secretariat', label: 'Secrétariat', icon: ScrollText, permission: 'secretariat.read' },
  { to: '/admin', label: 'Administration', icon: ShieldCheck, permission: 'admin.manage' },
]

export function Layout() {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visible = NAV.filter((n) => !n.permission || can(n.permission))

  const handleLogout = () => {
    logout()
    navigate('/connexion')
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 py-6">
        <img src={`${import.meta.env.BASE_URL}logo.PNG`} alt="PRISME" className="h-10 w-10 rounded-full" />
        <div>
          <p className="font-serif text-lg leading-tight text-prisme-base">PRISME</p>
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-prisme-gold-mat">
            Espace Bureau
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {visible.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-prisme-gold/15 text-prisme-gold'
                  : 'text-prisme-base/70 hover:bg-white/5 hover:text-prisme-base'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-prisme-gold-mat/15 p-4">
        <NavLink
          to="/profil"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `mb-2 flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-prisme-gold/15 text-prisme-gold'
                : 'text-prisme-base/70 hover:bg-white/5 hover:text-prisme-base'
            }`
          }
        >
          <UserCircle size={18} />
          <span className="min-w-0">
            <span className="block truncate">{user?.display_name}</span>
            <span className="block text-xs text-prisme-gold-mat">
              {user ? ROLE_LABELS[user.role] : ''}
            </span>
          </span>
        </NavLink>
        <button onClick={handleLogout} className="btn-ghost w-full justify-start">
          <LogOut size={16} /> Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-prisme-gold-mat/15 bg-prisme-inner/60 backdrop-blur lg:block">
        {sidebar}
      </aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-prisme-gold-mat/15 bg-prisme-inner">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="flex items-center justify-between border-b border-prisme-gold-mat/15 px-4 py-3 lg:hidden">
          <button onClick={() => setMobileOpen((v) => !v)} className="text-prisme-base">
            {mobileOpen ? <X /> : <Menu />}
          </button>
          <span className="font-serif text-prisme-gold-mat">Espace Bureau</span>
          <img src={`${import.meta.env.BASE_URL}logo.PNG`} alt="" className="h-8 w-8 rounded-full" />
        </header>

        {AUTH_BYPASS && (
          <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-white">
            ⚠️ Authentification désactivée (mode bypass) — à ne jamais laisser en ligne
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
