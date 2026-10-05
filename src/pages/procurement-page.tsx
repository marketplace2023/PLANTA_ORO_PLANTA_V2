import { CheckCircle2, FileSearch, ListChecks, PackageCheck, Plus, Search, Send, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ActionDialog, selectClass } from '@/components/action-dialog'
import { DataTable, Empty, Failed, Gate, Kpi, Loading, Panel, Pill, ScreenHeader, Segmented, td } from '@/components/kit'
import { RequisitionFormDialog } from '@/components/procurement/requisition-form-dialog'
import { RequisitionSheet } from '@/components/procurement/requisition-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePlantAccess } from '@/components/use-plant-access'
import { useProcurementSummary, useRequisitionAction, useRequisitions, useSuggestions, type LineInput, type RequisitionItem, type Suggestion } from '@/features/procurement/use-procurement'
import { ApiError } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { PRIORITY_META } from '@/lib/maintenance'
import { REQUISITION_STATUS_META } from '@/lib/procurement'
import { useDebouncedValue } from '@/lib/use-debounced-value'

type Defaults = { assetId?: string; workOrderId?: string; justification?: string; lines?: LineInput[] }
const lowStockDefaults = (data: Suggestion[]): Defaults => ({
  justification: 'Reposición de ítems bajo mínimo',
  lines: data.map((d): LineInput => ({ itemId: d.itemId, description: d.description, quantity: d.suggestedQuantity, uom: d.uom })),
})

type View = 'ALL' | 'SUBMITTED' | 'RFQ' | 'ORDERED' | 'RECEIVED'

/** Aprobar o rechazar una requisición por aprobar (la separación de funciones la valida el servidor). */
function Decision({ slug, rq }: { slug: string; rq: RequisitionItem }) {
  const action = useRequisitionAction(slug, rq.id)
  const [reject, setReject] = useState(false)
  const fail = (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'No se pudo completar la acción')
  return (
    <>
      <div className="flex justify-end gap-1.5">
        <Button size="xs" variant="secondary" disabled={action.isPending} onClick={() => action.mutate({ action: 'approve' }, { onSuccess: () => toast.success(`${rq.code} aprobada`), onError: fail })}>
          <CheckCircle2 /> Aprobar
        </Button>
        <Button size="xs" variant="outline" onClick={() => setReject(true)}>
          <XCircle /> Rechazar
        </Button>
      </div>
      {reject && (
        <ActionDialog
          open
          onOpenChange={(o) => !o && setReject(false)}
          title={`Rechazar ${rq.code}`}
          description={rq.justification}
          noteLabel="Motivo"
          noteRequired
          confirmLabel="Rechazar"
          busy={action.isPending}
          onConfirm={(note) => action.mutate({ action: 'reject', note }, { onSuccess: () => { toast.success(`${rq.code} rechazada`); setReject(false) }, onError: fail })}
        />
      )}
    </>
  )
}

export function ProcurementPage() {
  const { slug, can } = usePlantAccess()
  const allowed = can('procurement.read')
  const summary = useProcurementSummary(slug, allowed)
  const [view, setView] = useState<View>('ALL')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('')
  const q = useDebouncedValue(search.trim())
  const [params] = useSearchParams()
  // Enlaces desde otras pantallas: ?new=1&forAsset&forWo (desde una orden), ?suggest=1 (desde Inventario), ?rq=<id> (abrir una).
  const canCreate = can('procurement.create')
  const [form, setForm] = useState<Defaults | null>(() =>
    params.get('new') === '1' && canCreate ? { assetId: params.get('forAsset') ?? undefined, workOrderId: params.get('forWo') ?? undefined } : null,
  )
  const [linkedDone, setLinkedDone] = useState(false)
  const wantsLinked = params.get('suggest') === '1' && canCreate
  const linked = useSuggestions(slug, wantsLinked)
  const suggestions = useSuggestions(slug, false)
  const linkedDefaults = wantsLinked && !linkedDone && linked.data && linked.data.length > 0 ? lowStockDefaults(linked.data) : null
  const formDefaults = form ?? linkedDefaults
  const [openId, setOpenId] = useState<string | null>(params.get('rq'))

  async function fromLowStock() {
    const { data } = await suggestions.refetch()
    if (!data || data.length === 0) return void toast.info('No hay ítems bajo mínimo: nada que reponer.')
    setForm(lowStockDefaults(data))
  }
  const list = useRequisitions(slug, { status: view === 'ALL' ? undefined : view, priority: priority || undefined, search: q || undefined, sort: 'createdAt', dir: 'desc' }, 25, allowed)
  const s = summary.data

  return (
    <>
      <ScreenHeader
        title="Compras"
        description="Requisiciones, cotizaciones y recepción de pedidos."
        actions={
          allowed && canCreate && (
            <>
              <Button variant="secondary" onClick={() => void fromLowStock()} disabled={suggestions.isFetching}>
                <ListChecks /> Desde stock bajo mínimo
              </Button>
              <Button onClick={() => setForm({})}>
                <Plus /> Nueva requisición
              </Button>
            </>
          )
        }
      />
      <Gate allowed={allowed} module="Compras">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Por aprobar" value={s?.pendingApproval ?? '—'} icon={Send} tone={s && s.pendingApproval > 0 ? 'warning' : 'ok'} hint="Requisiciones enviadas" />
          <Kpi label="En cotización" value={s?.byStatus.RFQ ?? 0} icon={FileSearch} hint={s ? `${s.openRfqs} solicitud(es) abierta(s)` : undefined} />
          <Kpi label="Pedidas" value={s?.byStatus.ORDERED ?? 0} icon={PackageCheck} hint={s ? `${s.awaitingReceipt} por recibir` : undefined} />
          <Kpi label="Recibidas" value={s?.byStatus.RECEIVED ?? 0} icon={CheckCircle2} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Segmented<View>
            label="Estado"
            value={view}
            onChange={setView}
            options={[
              { value: 'ALL', label: 'Todas' },
              { value: 'SUBMITTED', label: 'Por aprobar', count: s?.byStatus.SUBMITTED },
              { value: 'RFQ', label: 'En cotización', count: s?.byStatus.RFQ },
              { value: 'ORDERED', label: 'Pedidas', count: s?.byStatus.ORDERED },
              { value: 'RECEIVED', label: 'Recibidas', count: s?.byStatus.RECEIVED },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fur-gray-500" aria-hidden />
              <Input className="w-60 pl-9" placeholder="Buscar requisición" aria-label="Buscar requisiciones" value={search} onChange={(e) => setSearch(e.target.value)} />
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
        </div>

        <Panel className="mt-3" flush>
          {list.isLoading ? (
            <div className="p-4">
              <Loading rows={5} />
            </div>
          ) : list.isError ? (
            <Failed what="las requisiciones" onRetry={() => void list.refetch()} />
          ) : list.data && list.data.items.length > 0 ? (
            <>
              <DataTable head={['Requisición', 'Solicitante', 'Prioridad', 'Estado', 'Necesaria para', { label: 'Estimado', right: true }, { label: 'Acciones', right: true }]}>
                {list.data.items.map((r) => {
                  const st = REQUISITION_STATUS_META[r.status]
                  const pr = PRIORITY_META[r.priority]
                  return (
                    <tr key={r.id}>
                      <td className={td}>
                        <p className="fur-code text-xs text-muted-foreground">{r.code}</p>
                        <button type="button" onClick={() => setOpenId(r.id)} className="block max-w-72 truncate text-left font-medium text-fur-navy-900 underline-offset-2 outline-none hover:underline focus-visible:underline" title={`Abrir ${r.code}: cotizar, adjudicar y recibir`}>
                          {r.justification}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {r.lineCount} línea{r.lineCount === 1 ? '' : 's'}
                          {r.asset ? ` · ${r.asset.tag}` : ''}
                          {r.workOrder ? ` · ${r.workOrder.code}` : ''}
                        </p>
                      </td>
                      <td className={td}>{r.requestedBy?.name ?? '—'}</td>
                      <td className={td}>
                        <Pill label={pr.label} color={pr.color} icon={pr.icon} />
                      </td>
                      <td className={td}>
                        <Pill label={st.label} color={st.color} icon={st.icon} />
                      </td>
                      <td className={td}>{formatDate(r.neededBy)}</td>
                      <td className={`${td} text-right tabular-nums`}>{formatMoney(r.estimatedTotal)}</td>
                      <td className={`${td} text-right`}>{r.status === 'SUBMITTED' && can('procurement.approve') ? <Decision slug={slug} rq={r} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    </tr>
                  )
                })}
              </DataTable>
              <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                Mostrando {list.data.items.length} de {list.data.total} requisiciones.
              </p>
            </>
          ) : (
            <Empty>No hay requisiciones con estos filtros.</Empty>
          )}
        </Panel>
      </Gate>

      {formDefaults && <RequisitionFormDialog slug={slug} defaults={formDefaults} onClose={() => { setForm(null); setLinkedDone(true) }} onSaved={(r) => { setForm(null); setLinkedDone(true); setOpenId(r.id) }} />}
      {openId && <RequisitionSheet slug={slug} id={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}
