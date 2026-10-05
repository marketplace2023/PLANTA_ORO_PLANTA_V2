import { AlertOctagon, CheckCircle2, ChevronDown, Gauge, Pencil, PlayCircle, Plus, Search, Timer, Wallet, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ActionDialog, selectClass } from '@/components/action-dialog'
import { PlanFormDialog } from '@/components/maintenance/plan-form-dialog'
import { WorkOrderFormDialog } from '@/components/maintenance/work-order-form-dialog'
import { WorkOrderSheet } from '@/components/maintenance/work-order-sheet'
import { DataTable, Empty, Failed, Gate, Kpi, Loading, Panel, Pill, ScreenHeader, Segmented, td } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { usePlantAccess } from '@/components/use-plant-access'
import { useAuth } from '@/features/auth/auth-context'
import {
  useAssignees,
  useGeneratePlan,
  useMaintenanceDashboard,
  usePlans,
  useTransitionWorkOrder,
  useWorkOrders,
  type MaintenancePlan,
  type WorkOrderItem,
} from '@/features/maintenance/use-maintenance'
import { ApiError } from '@/lib/api'
import { formatDate, formatMoney, formatPct } from '@/lib/format'
import { actionLabel, canMoveTo, frequencyText, PLAN_TYPE_LABELS, PRIORITY_META, STATUS_META, TYPE_LABELS, type WorkOrderStatus } from '@/lib/maintenance'
import { useDebouncedValue } from '@/lib/use-debounced-value'

type View = 'open' | 'overdue' | 'all' | 'plans'

const OPEN = 'REQUESTED,PLANNED,ASSIGNED,IN_PROGRESS,ON_HOLD'
const errorText = (e: unknown) => (e instanceof ApiError ? e.message : 'No se pudo completar la acción')

/** Acciones de una orden: solo las transiciones que el usuario puede hacer (el servidor sigue siendo la barrera real). */
function OrderActions({ slug, wo }: { slug: string; wo: WorkOrderItem }) {
  const { permissions } = usePlantAccess()
  const { user } = useAuth()
  const transition = useTransitionWorkOrder(slug, wo.id)
  const assignees = useAssignees(slug, permissions.includes('maintenance.update'))
  const [to, setTo] = useState<WorkOrderStatus | null>(null)
  const [assignee, setAssignee] = useState('')

  const moves = wo.nextStatuses.filter((s) => canMoveTo(s, wo, { permissions, userId: user?.id }))
  if (moves.length === 0) return <span className="text-xs text-muted-foreground">—</span>

  const confirm = (note: string) => {
    if (!to) return
    transition.mutate(
      {
        to,
        note: to === 'COMPLETED' || to === 'ASSIGNED' ? undefined : note || undefined,
        completionNotes: to === 'COMPLETED' ? note : undefined,
        assignedTo: to === 'ASSIGNED' ? assignee : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${wo.code}: ${STATUS_META[to].label}`)
          setTo(null)
        },
        onError: (e) => toast.error(errorText(e)),
      },
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="xs" variant="secondary" aria-label={`Acciones de ${wo.code}`}>
            Acciones <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {moves.map((s) => (
            <DropdownMenuItem
              key={s}
              onSelect={() => {
                setAssignee(wo.assignedTo?.id ?? '')
                setTo(s)
              }}
            >
              {actionLabel(wo.status, s)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {to && (
        <ActionDialog
          open
          onOpenChange={(o) => !o && setTo(null)}
          title={`${actionLabel(wo.status, to)} · ${wo.code}`}
          description={wo.title}
          noteLabel={to === 'COMPLETED' ? 'Trabajo realizado' : to === 'CANCELLED' ? 'Motivo' : 'Nota'}
          noteRequired={to === 'COMPLETED' || to === 'CANCELLED'}
          confirmLabel={actionLabel(wo.status, to)}
          busy={transition.isPending}
          extraValid={to !== 'ASSIGNED' || !!assignee}
          extra={
            to === 'ASSIGNED' && (
              <div className="space-y-1.5">
                <label htmlFor="assignee" className="text-sm font-medium">
                  Responsable
                </label>
                <select id="assignee" className={`${selectClass} w-full`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">Elegir responsable…</option>
                  {assignees.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )
          }
          onConfirm={confirm}
        />
      )}
    </>
  )
}

export function MaintenancePage() {
  const { slug, can } = usePlantAccess()
  const allowed = can('maintenance.read')
  const dash = useMaintenanceDashboard(slug, allowed)
  const [view, setView] = useState<View>('open')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('')
  const q = useDebouncedValue(search.trim())
  const orders = useWorkOrders(
    slug,
    { search: q || undefined, priority: priority || undefined, overdue: view === 'overdue' ? '1' : undefined, status: view === 'open' ? OPEN : undefined, sort: 'createdAt', dir: 'desc' },
    25,
    allowed && view !== 'plans',
  )
  const plans = usePlans(slug, allowed && view === 'plans')
  const generate = useGeneratePlan(slug)
  const [creating, setCreating] = useState(false)
  const [params] = useSearchParams()
  const [openId, setOpenId] = useState<string | null>(params.get('wo'))
  const [planForm, setPlanForm] = useState<{ plan?: MaintenancePlan } | null>(null)
  const d = dash.data

  return (
    <>
      <ScreenHeader
        title="Mantenimiento"
        description="Órdenes de trabajo, vencimientos y planes preventivos."
        actions={
          <>
            {allowed && can('maintenance.update') && (
              <Button variant="secondary" onClick={() => setPlanForm({})}>
                <Plus /> Nuevo plan
              </Button>
            )}
            {allowed && can('maintenance.create') && (
              <Button onClick={() => setCreating(true)}>
                <Plus /> Nueva orden
              </Button>
            )}
          </>
        }
      />
      <Gate allowed={allowed} module="Mantenimiento">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi label="Abiertas" value={d?.open ?? '—'} icon={Wrench} hint={d ? `${d.backlog} en backlog` : undefined} />
          <Kpi label="En ejecución" value={d?.inProgress ?? '—'} icon={PlayCircle} />
          <Kpi label="Vencidas" value={d?.overdue ?? '—'} icon={AlertOctagon} tone={d && d.overdue > 0 ? 'danger' : 'ok'} hint={d && d.overdue > 0 ? 'Revisar de inmediato' : 'Al día'} />
          <Kpi label="Preventivo cumplido" value={formatPct(d?.preventiveCompliancePct)} icon={Gauge} hint={d?.mttrHours != null ? `MTTR ${d.mttrHours.toFixed(1)} h` : 'MTTR sin datos'} />
          <Kpi label="Costo 30 días" value={d ? formatMoney(d.totalCostLast30Days, d.currency) : '—'} icon={Wallet} hint={d ? `${d.completedLast30Days} órdenes completadas` : undefined} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Segmented<View>
            label="Vista"
            value={view}
            onChange={setView}
            options={[
              { value: 'open', label: 'Abiertas', count: d?.open },
              { value: 'overdue', label: 'Vencidas', count: d?.overdue },
              { value: 'all', label: 'Todas' },
              { value: 'plans', label: 'Planes preventivos' },
            ]}
          />
          {view !== 'plans' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fur-gray-500" aria-hidden />
                <Input className="w-60 pl-9" placeholder="Buscar orden o activo" aria-label="Buscar órdenes" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className={selectClass} aria-label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">Toda prioridad</option>
                {Object.entries(PRIORITY_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {view !== 'plans' ? (
          <Panel className="mt-3" flush>
            {orders.isLoading ? (
              <div className="p-4">
                <Loading rows={5} />
              </div>
            ) : orders.isError ? (
              <Failed what="las órdenes" onRetry={() => void orders.refetch()} />
            ) : orders.data && orders.data.items.length > 0 ? (
              <>
                <DataTable head={['Orden', 'Activo', 'Prioridad', 'Estado', 'Responsable', 'Fin plan.', { label: 'Acciones', right: true }]}>
                  {orders.data.items.map((o) => {
                    const st = STATUS_META[o.status]
                    const pr = PRIORITY_META[o.priority]
                    return (
                      <tr key={o.id} className={o.overdue ? 'bg-fur-red-500/5' : undefined}>
                        <td className={td}>
                          <p className="fur-code text-xs text-muted-foreground">
                            {o.code} · {TYPE_LABELS[o.type]}
                          </p>
                          <button type="button" onClick={() => setOpenId(o.id)} className="max-w-64 truncate text-left font-medium text-fur-navy-900 underline-offset-2 outline-none hover:underline focus-visible:underline" title={`Abrir ${o.code}`}>
                            {o.title}
                          </button>
                        </td>
                        <td className={td}>
                          <span className="whitespace-nowrap">{o.asset.tag}</span>
                          <p className="max-w-40 truncate text-xs text-muted-foreground" title={o.asset.name}>{o.asset.name}</p>
                        </td>
                        <td className={td}>
                          <Pill label={pr.label} color={pr.color} icon={pr.icon} />
                        </td>
                        <td className={td}>
                          <Pill label={st.label} color={st.color} icon={st.icon} />
                        </td>
                        <td className={`${td} max-w-36 truncate`} title={o.assignedTo?.name}>{o.assignedTo?.name ?? <span className="text-muted-foreground">Sin asignar</span>}</td>
                        <td className={td}>
                          <span className="whitespace-nowrap">{formatDate(o.plannedEnd)}</span>
                          {o.overdue && <p className="text-xs font-semibold text-fur-red-500">vencida</p>}
                        </td>
                        <td className={`${td} text-right`}>
                          <OrderActions slug={slug} wo={o} />
                        </td>
                      </tr>
                    )
                  })}
                </DataTable>
                <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  Mostrando {orders.data.items.length} de {orders.data.total} órdenes.
                </p>
              </>
            ) : (
              <Empty>No hay órdenes con estos filtros.</Empty>
            )}
          </Panel>
        ) : (
          <Panel className="mt-3" flush>
            {plans.isLoading ? (
              <div className="p-4">
                <Loading rows={4} />
              </div>
            ) : plans.isError ? (
              <Failed what="los planes" onRetry={() => void plans.refetch()} />
            ) : plans.data && plans.data.items.length > 0 ? (
              <DataTable head={['Plan', 'Activo', 'Tipo', 'Frecuencia', 'Próxima fecha', 'Estado', { label: '', right: true }]}>
                {plans.data.items.map((p) => (
                  <tr key={p.id}>
                    <td className={`${td} font-medium text-fur-navy-900`}>{p.name}</td>
                    <td className={td}>
                      {p.asset.tag}
                      <p className="text-xs text-muted-foreground">{p.asset.name}</p>
                    </td>
                    <td className={td}>{PLAN_TYPE_LABELS[p.planType]}</td>
                    <td className={td}>{frequencyText(p.frequencyValue, p.frequencyUnit)}</td>
                    <td className={td}>
                      {formatDate(p.nextDueAt)}
                      {p.overdue && <span className="ml-1 text-xs font-semibold text-fur-red-500">vencido</span>}
                    </td>
                    <td className={td}>
                      <Pill label={p.status === 'ACTIVE' ? 'Activo' : 'Pausado'} color={p.status === 'ACTIVE' ? 'var(--fur-green-500)' : 'var(--fur-steel-500)'} icon={p.status === 'ACTIVE' ? CheckCircle2 : Timer} />
                    </td>
                    <td className={`${td} text-right`}>
                      {can('maintenance.update') && (
                        <Button size="xs" variant="outline" className="mr-1.5" aria-label={`Editar ${p.name}`} onClick={() => setPlanForm({ plan: p })}>
                          <Pencil /> Editar
                        </Button>
                      )}
                      {can('maintenance.update') && p.status === 'ACTIVE' && (
                        <Button
                          size="xs"
                          variant="secondary"
                          disabled={generate.isPending}
                          onClick={() => generate.mutate(p.id, { onSuccess: (wo) => toast.success(`Orden ${wo.code} generada`), onError: (e) => toast.error(errorText(e)) })}
                        >
                          Generar OT
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <Empty>No hay planes de mantenimiento.</Empty>
            )}
          </Panel>
        )}
      </Gate>

      {creating && <WorkOrderFormDialog open onOpenChange={(o) => !o && setCreating(false)} slug={slug} canAssign={can('maintenance.update')} onSaved={() => setCreating(false)} />}
      {planForm && <PlanFormDialog open onOpenChange={(o) => !o && setPlanForm(null)} slug={slug} plan={planForm.plan} />}
      {openId && <WorkOrderSheet slug={slug} workOrderId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}
