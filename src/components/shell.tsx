import {
  Boxes,
  Calculator,
  ChevronsUpDown,
  Cog,
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
        <button type="button" className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-fur-navy-900 px-3 py-2.5 text-left outline-none hover:bg-fur-navy-800 focus-visible:ring-3 focus-visible:ring-ring/60" aria-label="Cambiar de planta">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-fur-gold-500 text-xs font-extrabold text-fur-navy-950">{currentPlant?.code.slice(0, 3) ?? '—'}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold tracking-widest text-fur-gold-400 uppercase">Planta</span>
            <span className="block truncate text-sm font-semibold text-white">{currentPlant?.name ?? 'Elegir planta'}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-white/60" aria-hidden />
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
          <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-widest text-white/50 uppercase">{s.title}</p>
          <ul className="space-y-0.5">
            {s.items
              .filter((i) => !i.perm || permissions.includes(i.perm))
              .map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={`${base}/${to}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/60',
                        isActive ? 'border-fur-gold-500 bg-fur-navy-800 text-white' : 'border-transparent text-white/75 hover:bg-fur-navy-900 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn('size-[18px]', isActive && 'text-fur-gold-400')} aria-hidden />
                        {label}
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
    <div className="flex items-center gap-3 border-t border-white/10 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fur-navy-800 text-sm font-bold text-fur-gold-400" aria-hidden>
        {user.firstName[0]}
        {user.lastName[0]}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-white">
          {user.firstName} {user.lastName}
        </p>
        <p className="truncate text-xs text-white/60">{role}</p>
      </div>
      <button
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={async () => {
          await logout()
          navigate('/login')
        }}
        className="grid size-9 place-items-center rounded-lg text-white/70 outline-none hover:bg-fur-navy-800 hover:text-white focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
      <span className="grid size-9 place-items-center rounded-lg bg-fur-gold-500 text-sm font-extrabold text-fur-navy-950">FUR</span>
      <div className="leading-tight">
        <p className="text-sm font-bold text-white">Panel de Planta</p>
        <p className="text-[11px] text-white/60">Ecosistema FUR</p>
      </div>
    </div>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Brand />
      <div className="px-3 pb-1">
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
  const { currentPlant } = usePlant()
  const queryClient = useQueryClient()
  const fetching = useIsFetching({ queryKey: ['plant'] }) > 0

  return (
    <div className="min-h-screen bg-background lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-fur-navy-950 lg:flex">
        <SidebarBody />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-fur-navy-950">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg text-white/70 hover:bg-fur-navy-800" aria-label="Cerrar menú">
              <X className="size-5" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Abrir menú" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
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
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet context={context} />
          </div>
        </main>
      </div>
    </div>
  )
}
