import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { PanelFooter } from '@/components/panel-footer'
import {
  Boxes,
  Calculator,
  ChevronsUpDown,
  Cog,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  ShoppingCart,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/auth-context'
import { usePlant } from '@/features/plant/plant-context'
import { ROLE_LABELS } from '@/lib/roles'
import { cn } from '@/lib/utils'

type Item = { to: string; label: string; icon: LucideIcon; perm?: string }

const SECTIONS: Array<{ title: string; items: Item[] }> = [
  {
    title: 'Operación',
    items: [
      { to: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
      { to: 'processes', label: 'Procesos', icon: Cog },
      { to: 'assets', label: 'Activos', icon: Package },
      { to: 'catalog-requests', label: 'Solicitudes', icon: ClipboardList, perm: 'asset.create' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { to: 'maintenance', label: 'Mantenimiento', icon: Wrench, perm: 'maintenance.read' },
      { to: 'inventory', label: 'Inventario', icon: Boxes, perm: 'inventory.read' },
      { to: 'procurement', label: 'Compras', icon: ShoppingCart, perm: 'procurement.read' },
      { to: 'budgets', label: 'Presupuestos', icon: Calculator, perm: 'budget.read' },
    ],
  },
  {
    title: 'Soporte',
    items: [
      { to: 'documents', label: 'Documentos', icon: FileText, perm: 'document.read' },
      { to: 'team', label: 'Equipo', icon: Users, perm: 'user.read' },
    ],
  },
]

function PlantSwitcher() {
  const { currentPlant, availablePlants } = usePlant()
  const navigate = useNavigate()
  const section = useLocation().pathname.split('/')[3]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex w-full items-center gap-3 rounded-lg border border-border bg-fur-gray-50 px-3 py-2.5 text-left outline-none hover:bg-fur-gray-100 focus-visible:ring-3 focus-visible:ring-ring/60" aria-label="Cambiar de planta">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-fur-gold-500 text-xs font-extrabold text-fur-navy-950">{currentPlant?.code.slice(0, 3) ?? '—'}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold tracking-widest text-fur-navy-700 uppercase">Planta</span>
            <span className="block truncate text-sm font-semibold text-fur-navy-900">{currentPlant?.name ?? 'Elegir planta'}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-fur-gray-600" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Plantas disponibles</DropdownMenuLabel>
        {availablePlants.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => navigate(`/plants/${p.slug}/${section ?? 'dashboard'}`)}>
            <span className="font-medium">{p.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">{p.code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const { currentPlant, permissions } = usePlant()
  const base = `/plants/${currentPlant?.slug ?? ''}`
  return (
    <nav aria-label="Secciones de la planta" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {SECTIONS.map((s) => (
        <div key={s.title}>
          <p className="sidebar-section-title mb-1.5 px-3 text-[10px] font-semibold tracking-widest text-fur-gray-500 uppercase">{s.title}</p>
          <ul className="space-y-0.5">
            {s.items
              .filter((i) => !i.perm || permissions.includes(i.perm))
              .map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    title={label}
                    aria-label={label}
                    to={`${base}/${to}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/60',
                        isActive ? 'border-fur-gold-600 bg-fur-gold-500/20 text-fur-navy-950' : 'border-transparent text-fur-gray-600 hover:bg-fur-gray-100 hover:text-fur-navy-900',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn('size-[18px]', isActive && 'text-fur-navy-900')} aria-hidden />
                        <span className="sidebar-label">{label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function UserCard() {
  const { user, logout } = useAuth()
  const { roleCodes } = usePlant()
  const navigate = useNavigate()
  if (!user) return null
  const role = user.isGlobalAdmin ? ROLE_LABELS.ECOSYSTEM_ADMIN : roleCodes.map((r) => ROLE_LABELS[r] ?? r).join(', ') || 'Solo lectura'
  return (
    <div className="flex items-center gap-3 sidebar-user border-t border-border p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fur-navy-800 text-sm font-bold text-fur-gold-400" aria-hidden>
        {user.firstName[0]}
        {user.lastName[0]}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-fur-navy-900">
          {user.firstName} {user.lastName}
        </p>
        <p className="truncate text-xs text-fur-gray-600">{role}</p>
      </div>
      <button
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={async () => {
          await logout()
          navigate('/login')
        }}
        className="grid size-9 place-items-center rounded-lg text-fur-gray-600 outline-none hover:bg-fur-gray-100 hover:text-fur-navy-900 focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
}

function Brand() {
  return (
    <div className="sidebar-brand">
      <BrandLogo />
      <p>Panel de Planta</p>
    </div>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Brand />
      <div className="sidebar-context px-3 pb-1">
        <PlantSwitcher />
      </div>
      <Nav onNavigate={onNavigate} />
      <UserCard />
    </>
  )
}

/** Marco del panel: barra lateral navy fija en escritorio, cajón en móvil. */
export function Shell({ context }: { context?: unknown }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('fur-sidebar-collapsed') === 'true' } catch { return false }
  })
  const toggleSidebar = () => {
    setCollapsed((previous) => {
      try { localStorage.setItem('fur-sidebar-collapsed', String(!previous)) } catch { /* La preferencia es opcional. */ }
      return !previous
    })
  }
  const { currentPlant } = usePlant()
  const queryClient = useQueryClient()
  const fetching = useIsFetching({ queryKey: ['plant'] }) > 0

  return (
    <div className="panel-shell studio-shell min-h-screen bg-background lg:pl-64" data-collapsed={collapsed}>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <aside id="desktop-navigation" className="panel-sidebar desktop-sidebar fixed inset-y-0 left-0 hidden w-64 flex-col lg:flex">
        <SidebarBody />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <aside className="panel-sidebar relative flex h-full w-72 max-w-[85vw] flex-col">
            <button type="button" onClick={() => setOpen(false)} className="sidebar-close absolute top-2 right-2 grid size-8 place-items-center rounded-lg text-fur-navy-900 hover:bg-white/60" aria-label="Cerrar menú">
              <X className="size-5" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="panel-topbar sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-8">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Abrir menú" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
          <Button variant="ghost" size="icon-sm" className="sidebar-toggle hidden lg:flex" onClick={toggleSidebar} aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'} aria-expanded={!collapsed} aria-controls="desktop-navigation">{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
          <img src="/brand/fur-mark.svg" alt="" className="topbar-brand-mark lg:hidden" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fur-navy-900">{currentPlant?.name ?? 'Panel de Planta'}</p>
            {currentPlant && (
              <p className="truncate text-xs text-muted-foreground">
                {currentPlant.code}
                {currentPlant.countryCode ? ` · ${currentPlant.countryCode}` : ''} · {currentPlant.timezone}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => void queryClient.invalidateQueries({ queryKey: ['plant'] })} aria-label="Actualizar datos">
            <RefreshCw className={cn(fetching && 'animate-spin')} /> <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </header>
        <main id="main-content" className="panel-main flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet context={context} />
          </div>
        </main>
        <PanelFooter />
      </div>
    </div>
  )
}
