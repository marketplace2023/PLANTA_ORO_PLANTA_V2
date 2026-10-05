import { AlertOctagon, AlertTriangle, ArrowRight, ChevronRight, Info, ShoppingCart, Wallet, Warehouse, Wrench, Package, Gauge, type LucideIcon } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { BarRows, DataTable, Empty, Failed, Kpi, Loading, Panel, Pill, Progress, ScreenHeader, td, type BarRow } from '@/components/kit'
import { usePlantAccess } from '@/components/use-plant-access'
import { useBudgetSummary } from '@/features/budget/use-budget'
import { useInventoryDashboard } from '@/features/inventory/use-inventory'
import { useMaintenanceDashboard } from '@/features/maintenance/use-maintenance'
import { usePlantProcess } from '@/features/process/use-process'
import { useProcurementSummary } from '@/features/procurement/use-procurement'
import { plantAlerts, SEVERITY_LABELS, type AlertSeverity } from '@/lib/alerts'
import { formatDate, formatMoney, formatPct, formatQuantity } from '@/lib/format'
import { movementLabel } from '@/lib/inventory'
import { KANBAN_COLUMNS, PRIORITY_META, STATUS_META, TYPE_LABELS, type WorkOrderType } from '@/lib/maintenance'
import { REQUISITION_STATUS_META, REQUISITION_STATUSES } from '@/lib/procurement'

const SEVERITY_STYLE: Record<AlertSeverity, { icon: LucideIcon; color: string }> = {
  danger: { icon: AlertOctagon, color: 'var(--fur-red-500)' },
  warning: { icon: AlertTriangle, color: 'var(--fur-orange-500)' },
  info: { icon: Info, color: 'var(--fur-blue-500)' },
}

export function OverviewPage() {
  const { slug, plant, can } = usePlantAccess()
  const process = usePlantProcess(slug)
  const mnt = useMaintenanceDashboard(slug, can('maintenance.read'))
  const inv = useInventoryDashboard(slug, can('inventory.read'))
  const proc = useProcurementSummary(slug, can('procurement.read'))
  const bud = useBudgetSummary(slug, can('budget.read'))

  const base = `/plants/${slug}`
  const totals = process.data?.totals ?? null
  const alerts = plantAlerts({
    slug,
    attentionAssets: totals?.attention ?? null,
    maintenance: mnt.data ?? null,
    inventory: inv.data ?? null,
    procurement: proc.data ?? null,
    budget: bud.data ?? null,
  })

  const stages = [...(process.data?.stages ?? [])].sort((a, b) => a.sequence - b.sequence)

  const woRows: BarRow[] = KANBAN_COLUMNS.map((s) => ({ key: s, label: STATUS_META[s].label, value: mnt.data?.byStatus[s] ?? 0, color: STATUS_META[s].color, icon: STATUS_META[s].icon }))
  const typeRows: BarRow[] = (Object.keys(TYPE_LABELS) as WorkOrderType[]).map((t) => ({ key: t, label: TYPE_LABELS[t], value: mnt.data?.openByType[t] ?? 0 }))
  const rqRows: BarRow[] = REQUISITION_STATUSES.filter((s) => s !== 'CANCELLED').map((s) => ({ key: s, label: REQUISITION_STATUS_META[s].label, value: proc.data?.byStatus[s] ?? 0, color: REQUISITION_STATUS_META[s].color, icon: REQUISITION_STATUS_META[s].icon }))

  const parts = mnt.data?.partsCostLast30Days ?? 0
  const other = mnt.data?.otherCostLast30Days ?? 0
  const totalCost = mnt.data?.totalCostLast30Days ?? 0

  return (
    <>
      <ScreenHeader title="Resumen operacional" description={`Estado en vivo de ${plant?.name ?? 'la planta'}: operación, mantenimiento, inventario, compras y presupuesto.`} />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {totals && <Kpi label="Activos" value={totals.assets} icon={Package} to={`${base}/assets`} tone={totals.attention > 0 ? 'warning' : 'ok'} hint={totals.attention > 0 ? `${totals.attention} requieren atención` : 'Todos sin alertas'} />}
        {mnt.data && <Kpi label="OT abiertas" value={mnt.data.open} icon={Wrench} to={`${base}/maintenance`} tone={mnt.data.overdue > 0 ? 'danger' : 'ok'} hint={`${mnt.data.overdue} vencidas · ${mnt.data.inProgress} en ejecución`} />}
        {mnt.data && <Kpi label="Preventivo cumplido" value={formatPct(mnt.data.preventiveCompliancePct)} icon={Gauge} to={`${base}/maintenance`} hint={mnt.data.mttrHours === null ? 'MTTR sin datos' : `MTTR ${mnt.data.mttrHours.toFixed(1)} h`} />}
        {inv.data && <Kpi label="Inventario" value={formatMoney(inv.data.stockValue, inv.data.currency)} icon={Warehouse} to={`${base}/inventory`} tone={inv.data.criticalLowCount > 0 ? 'danger' : inv.data.lowStockCount > 0 ? 'warning' : 'ok'} hint={`${inv.data.lowStockCount} bajo mínimo (${inv.data.criticalLowCount} críticos)`} />}
        {proc.data && <Kpi label="Por aprobar" value={proc.data.pendingApproval} icon={ShoppingCart} to={`${base}/procurement`} tone={proc.data.pendingApproval > 0 ? 'warning' : 'ok'} hint={`${proc.data.openRfqs} en cotización · ${proc.data.awaitingReceipt} por recibir`} />}
        {bud.data && <Kpi label="Avance presupuesto" value={formatPct(bud.data.progressPct)} icon={Wallet} to={`${base}/budgets`} hint={`Aprobado ${formatMoney(bud.data.approvedTotal, bud.data.baseCurrency)}`} />}
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <Panel title="Requiere tu atención" subtitle={`${alerts.length} alerta${alerts.length === 1 ? '' : 's'} activa${alerts.length === 1 ? '' : 's'}`} className="mt-6" flush>
          <ul className="divide-y divide-border">
            {alerts.map((a) => {
              const { icon: Icon, color } = SEVERITY_STYLE[a.severity]
              return (
                <li key={a.id}>
                  <Link to={a.to} className="flex items-center gap-3 px-4 py-2.5 text-sm outline-none hover:bg-muted focus-visible:bg-muted">
                    <Icon className="size-4 shrink-0" style={{ color }} aria-hidden />
                    <span className="flex-1 text-fur-gray-900">{a.text}</span>
                    <Pill label={SEVERITY_LABELS[a.severity]} color={color} />
                    <ChevronRight className="size-4 text-fur-gray-500" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {/* Flujo de proceso */}
      <Panel title="Flujo de proceso" subtitle="Etapas habilitadas de la planta, en orden. Activos, atención y órdenes abiertas por etapa." className="mt-6" action={<Link to={`${base}/processes`} className="inline-flex items-center gap-1 text-xs font-semibold text-fur-navy-900 hover:underline">Ver mapa <ArrowRight className="size-3.5" /></Link>}>
        {process.isLoading ? (
          <Loading rows={2} />
        ) : process.isError ? (
          <Failed what="el flujo de proceso" onRetry={() => void process.refetch()} />
        ) : stages.length === 0 ? (
          <Empty>No hay etapas habilitadas en esta planta.</Empty>
        ) : (
          <ol className="flex items-stretch gap-1 overflow-x-auto pb-1">
            {stages.map((s, i) => (
              <Fragment key={s.id}>
                <li className="w-40 shrink-0 rounded-lg border border-border bg-fur-gray-50 p-3" style={{ borderTopColor: (s.attentionAssets ?? 0) > 0 ? 'var(--fur-orange-500)' : 'var(--fur-navy-800)', borderTopWidth: 3 }}>
                  <p className="fur-code text-[11px] text-muted-foreground">{s.code}</p>
                  <p className="truncate text-sm font-semibold text-fur-navy-900" title={s.name}>{s.name}</p>
                  <dl className="mt-2 space-y-0.5 text-xs text-fur-gray-600">
                    <div className="flex justify-between"><dt>Activos</dt><dd className="font-semibold text-fur-navy-900 tabular-nums">{s.assetCount ?? '—'}</dd></div>
                    <div className="flex justify-between"><dt>Atención</dt><dd className="font-semibold tabular-nums" style={{ color: (s.attentionAssets ?? 0) > 0 ? 'var(--fur-orange-500)' : undefined }}>{s.attentionAssets ?? '—'}</dd></div>
                    <div className="flex justify-between"><dt>OT abiertas</dt><dd className="font-semibold text-fur-navy-900 tabular-nums">{s.openWorkOrders ?? '—'}</dd></div>
                  </dl>
                </li>
                {i < stages.length - 1 && <ChevronRight className="my-auto size-4 shrink-0 text-fur-gray-500" aria-hidden />}
              </Fragment>
            ))}
          </ol>
        )}
      </Panel>

      {/* Mantenimiento */}
      {can('maintenance.read') && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Panel title="Órdenes de trabajo por estado">
            {mnt.isLoading ? <Loading /> : mnt.isError ? <Failed onRetry={() => void mnt.refetch()} /> : <BarRows rows={woRows} empty="No hay órdenes de trabajo" />}
          </Panel>
          <Panel title="OT abiertas por tipo">
            {mnt.isLoading ? <Loading /> : mnt.isError ? <Failed onRetry={() => void mnt.refetch()} /> : <BarRows rows={typeRows} empty="No hay órdenes abiertas" />}
          </Panel>
          <Panel title="Costo de mantenimiento" subtitle="Órdenes terminadas en los últimos 30 días">
            {mnt.isLoading ? (
              <Loading />
            ) : mnt.isError || !mnt.data ? (
              <Failed onRetry={() => void mnt.refetch()} />
            ) : (
              <div className="space-y-4">
                <p className="text-3xl font-bold text-fur-navy-900 tabular-nums">{formatMoney(totalCost, mnt.data.currency)}</p>
                <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-fur-gray-100" role="img" aria-label={`Repuestos ${formatMoney(parts, mnt.data.currency)}, otros ${formatMoney(other, mnt.data.currency)}`}>
                  <span style={{ width: `${totalCost ? (parts / totalCost) * 100 : 0}%`, background: 'var(--fur-navy-800)' }} />
                  <span style={{ width: `${totalCost ? (other / totalCost) * 100 : 0}%`, background: 'var(--fur-gold-500)' }} />
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between"><dt className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: 'var(--fur-navy-800)' }} />Repuestos</dt><dd className="font-semibold tabular-nums">{formatMoney(parts, mnt.data.currency)}</dd></div>
                  <div className="flex items-center justify-between"><dt className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: 'var(--fur-gold-500)' }} />Mano de obra, equipos y otros</dt><dd className="font-semibold tabular-nums">{formatMoney(other, mnt.data.currency)}</dd></div>
                  <div className="flex items-center justify-between text-muted-foreground"><dt>Órdenes completadas</dt><dd className="tabular-nums">{mnt.data.completedLast30Days}</dd></div>
                </dl>
              </div>
            )}
          </Panel>

          <Panel title="Órdenes vencidas" subtitle="Requieren acción inmediata" className="lg:col-span-2" flush action={<Link to={`${base}/maintenance`} className="inline-flex items-center gap-1 text-xs font-semibold text-fur-navy-900 hover:underline">Ver todas <ArrowRight className="size-3.5" /></Link>}>
            {mnt.isLoading ? (
              <div className="p-4"><Loading /></div>
            ) : mnt.data && mnt.data.overdueWorkOrders.length > 0 ? (
              <DataTable head={['Orden', 'Activo', 'Prioridad', 'Fin planificado']}>
                {mnt.data.overdueWorkOrders.slice(0, 6).map((o) => (
                  <tr key={o.id}>
                    <td className={td}><p className="fur-code text-xs text-muted-foreground">{o.code}</p><p className="font-medium text-fur-navy-900">{o.title}</p></td>
                    <td className={td}>{o.asset.tag} <span className="text-muted-foreground">· {o.asset.name}</span></td>
                    <td className={td}><Pill label={PRIORITY_META[o.priority].label} color={PRIORITY_META[o.priority].color} icon={PRIORITY_META[o.priority].icon} /></td>
                    <td className={td}>{formatDate(o.plannedEnd)}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <Empty>No hay órdenes vencidas.</Empty>
            )}
          </Panel>
          <Panel title="Disponibilidad y MTBF">
            <p className="text-sm text-muted-foreground">Requieren registro de fallas y paros, que aún no existe. Se mostrarán aquí cuando haya datos; no se estiman.</p>
          </Panel>
        </div>
      )}

      {/* Inventario y compras */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {can('inventory.read') && (
          <Panel title="Repuestos bajo el mínimo" subtitle="Existencias frente al stock mínimo" className="lg:col-span-2" flush action={<Link to={`${base}/inventory`} className="inline-flex items-center gap-1 text-xs font-semibold text-fur-navy-900 hover:underline">Ir a inventario <ArrowRight className="size-3.5" /></Link>}>
            {inv.isLoading ? (
              <div className="p-4"><Loading /></div>
            ) : inv.isError ? (
              <Failed onRetry={() => void inv.refetch()} />
            ) : inv.data && inv.data.lowStock.length > 0 ? (
              <DataTable head={['Ítem', 'Existencias', 'Mínimo', 'Cobertura']}>
                {inv.data.lowStock.slice(0, 6).map((l) => (
                  <tr key={l.id}>
                    <td className={td}><p className="fur-code text-xs text-muted-foreground">{l.sku}</p><p className="font-medium text-fur-navy-900">{l.name}{l.isCritical && <span className="ml-2 align-middle"><Pill label="Crítico" color="var(--fur-red-500)" icon={AlertOctagon} /></span>}</p></td>
                    <td className={`${td} tabular-nums`}>{formatQuantity(l.onHand)} {l.uom}</td>
                    <td className={`${td} tabular-nums`}>{formatQuantity(l.minStock)}</td>
                    <td className={`${td} w-44`}><Progress pct={l.minStock ? (l.onHand / l.minStock) * 100 : 0} tone={l.isCritical ? 'danger' : 'warning'} label={`Cobertura de ${l.name}`} /></td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <Empty>Todo el stock está sobre el mínimo.</Empty>
            )}
          </Panel>
        )}
        {can('procurement.read') && (
          <Panel title="Requisiciones por etapa">
            {proc.isLoading ? <Loading /> : proc.isError ? <Failed onRetry={() => void proc.refetch()} /> : <BarRows rows={rqRows} empty="No hay requisiciones" />}
          </Panel>
        )}
        {can('inventory.read') && (
          <Panel title="Movimientos recientes" subtitle="Últimos movimientos de almacén" className="lg:col-span-3" flush>
            {inv.isLoading ? (
              <div className="p-4"><Loading /></div>
            ) : inv.data && inv.data.recentMovements.length > 0 ? (
              <DataTable head={['Fecha', 'Tipo', 'Ítem', { label: 'Cantidad', right: true }, 'Origen → destino']}>
                {inv.data.recentMovements.slice(0, 6).map((m) => (
                  <tr key={m.id}>
                    <td className={td}>{formatDate(m.performedAt)}</td>
                    <td className={td}>{movementLabel(m.type)}</td>
                    <td className={td}>{m.item.name} <span className="fur-code text-xs text-muted-foreground">{m.item.sku}</span></td>
                    <td className={`${td} text-right tabular-nums`}>{formatQuantity(m.quantity)} {m.item.uom}</td>
                    <td className={td}>{m.from ?? '—'} → {m.to ?? '—'}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <Empty>Sin movimientos recientes.</Empty>
            )}
          </Panel>
        )}
      </div>
    </>
  )
}
