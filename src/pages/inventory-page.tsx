import { ArrowDownToLine, ArrowUpFromLine, AlertOctagon, Boxes, Hammer, ListChecks, Plus, Search, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { selectClass } from '@/components/action-dialog'
import { DataTable, Empty, Failed, Gate, Kpi, Loading, Panel, Pill, Progress, ScreenHeader, Segmented, td } from '@/components/kit'
import { ItemFormDialog } from '@/components/inventory/item-form-dialog'
import { ItemSheet } from '@/components/inventory/item-sheet'
import { WarehousesView } from '@/components/inventory/warehouses-view'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePlantAccess } from '@/components/use-plant-access'
import { useInventoryDashboard, useItems, useMovements } from '@/features/inventory/use-inventory'
import { formatDateTime, formatMoney, formatQuantity } from '@/lib/format'
import { ITEM_TYPE_LABELS, MOVEMENT_LABELS, REFERENCE_LABELS } from '@/lib/inventory'
import { useDebouncedValue } from '@/lib/use-debounced-value'

type View = 'stock' | 'low' | 'movements' | 'warehouses'

export function InventoryPage() {
  const { slug, can } = usePlantAccess()
  const allowed = can('inventory.read')
  const dash = useInventoryDashboard(slug, allowed)
  const [view, setView] = useState<View>('stock')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const q = useDebouncedValue(search.trim())
  const items = useItems(slug, { search: q || undefined, type: type || undefined, low: view === 'low' ? '1' : undefined, status: 'ACTIVE' }, 25, allowed && (view === 'stock' || view === 'low'))
  const movements = useMovements(slug, {}, 25, allowed && view === 'movements')
  const [creatingItem, setCreatingItem] = useState(false)
  const [openItem, setOpenItem] = useState<string | null>(null)
  const d = dash.data

  return (
    <>
      <ScreenHeader
        title="Inventario"
        description="Existencias, valor del stock, movimientos y almacenes."
        actions={
          allowed && (
            <>
              {can('procurement.create') && (d?.lowStockCount ?? 0) > 0 && (
                <Button asChild variant="secondary">
                  <Link to={`/plants/${slug}/procurement?suggest=1`}><ListChecks /> Solicitar reposición</Link>
                </Button>
              )}
              {can('inventory.create') && <Button onClick={() => setCreatingItem(true)}><Plus /> Nuevo ítem</Button>}
            </>
          )
        }
      />
      <Gate allowed={allowed} module="Inventario">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi label="Valor del stock" value={d ? formatMoney(d.stockValue, d.currency) : '—'} icon={Wallet} hint={d ? `${d.itemCount} ítems` : undefined} />
          <Kpi label="Bajo mínimo" value={d?.lowStockCount ?? '—'} icon={Boxes} tone={d && d.lowStockCount > 0 ? 'warning' : 'ok'} hint={d ? `${d.criticalLowCount} críticos` : undefined} />
          <Kpi label="Ingresos 30 días" value={d?.receiptsLast30Days ?? '—'} icon={ArrowDownToLine} hint={d ? `${d.movementsLast30Days} movimientos en total` : undefined} />
          <Kpi label="Salidas 30 días" value={d?.issuesLast30Days ?? '—'} icon={ArrowUpFromLine} />
          <Kpi label="Activos en stock / reparación" value={d ? `${d.assetsInStock} / ${d.assetsInRepair}` : '—'} icon={Hammer} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Segmented<View>
            label="Vista"
            value={view}
            onChange={setView}
            options={[
              { value: 'stock', label: 'Existencias' },
              { value: 'low', label: 'Bajo mínimo', count: d?.lowStockCount },
              { value: 'movements', label: 'Movimientos' },
              { value: 'warehouses', label: 'Almacenes' },
            ]}
          />
          {(view === 'stock' || view === 'low') && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fur-gray-500" aria-hidden />
                <Input className="w-60 pl-9" placeholder="Buscar SKU o nombre" aria-label="Buscar ítems" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className={selectClass} aria-label="Tipo de ítem" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Todo tipo</option>
                {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Panel className="mt-3" flush>
          {(view === 'stock' || view === 'low') &&
            (items.isLoading ? (
              <div className="p-4">
                <Loading rows={5} />
              </div>
            ) : items.isError ? (
              <Failed what="las existencias" onRetry={() => void items.refetch()} />
            ) : items.data && items.data.items.length > 0 ? (
              <>
                <DataTable head={['Ítem', 'Tipo', { label: 'Existencias', right: true }, 'Cobertura del mínimo', { label: 'Costo prom.', right: true }, { label: 'Valor', right: true }]}>
                  {items.data.items.map((i) => (
                    <tr key={i.id}>
                      <td className={td}>
                        <p className="fur-code text-xs text-muted-foreground">{i.sku}</p>
                        <p className="font-medium text-fur-navy-900">
                          <button type="button" onClick={() => setOpenItem(i.id)} className="text-left underline-offset-2 outline-none hover:underline focus-visible:underline" title="Abrir ficha: movimientos y edición">
                            {i.name}
                          </button>
                          {i.isCritical && (
                            <span className="ml-2 align-middle">
                              <Pill label="Crítico" color="var(--fur-red-500)" icon={AlertOctagon} />
                            </span>
                          )}
                        </p>
                      </td>
                      <td className={td}>{ITEM_TYPE_LABELS[i.itemType]}</td>
                      <td className={`${td} text-right tabular-nums`}>
                        {formatQuantity(i.onHand)} {i.uom}
                      </td>
                      <td className={`${td} w-48`}>{i.minStock > 0 ? <Progress pct={(i.onHand / i.minStock) * 100} tone={i.belowMin ? (i.isCritical ? 'danger' : 'warning') : 'ok'} label={`Cobertura de ${i.name}`} /> : <span className="text-xs text-muted-foreground">Sin mínimo</span>}</td>
                      <td className={`${td} text-right tabular-nums`}>{i.unitCost === null ? '—' : formatMoney(i.unitCost, d?.currency)}</td>
                      <td className={`${td} text-right font-medium tabular-nums`}>{formatMoney(i.value, d?.currency)}</td>
                    </tr>
                  ))}
                </DataTable>
                <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  Mostrando {items.data.items.length} de {items.data.total} ítems.
                </p>
              </>
            ) : (
              <Empty>{view === 'low' ? 'Todo el stock está sobre el mínimo.' : 'No hay ítems con estos filtros.'}</Empty>
            ))}

          {view === 'movements' &&
            (movements.isLoading ? (
              <div className="p-4">
                <Loading rows={5} />
              </div>
            ) : movements.isError ? (
              <Failed what="los movimientos" onRetry={() => void movements.refetch()} />
            ) : movements.data && movements.data.items.length > 0 ? (
              <DataTable head={['Fecha', 'Tipo', 'Ítem', { label: 'Cantidad', right: true }, 'Origen → destino', 'Referencia', 'Responsable']}>
                {movements.data.items.map((m) => (
                  <tr key={m.id}>
                    <td className={td}>{formatDateTime(m.performedAt)}</td>
                    <td className={td}>{MOVEMENT_LABELS[m.type]}</td>
                    <td className={td}>
                      {m.item.name} <span className="fur-code text-xs text-muted-foreground">{m.item.sku}</span>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>
                      {formatQuantity(m.quantity)} {m.item.uom}
                    </td>
                    <td className={td}>
                      {m.from ?? '—'} → {m.to ?? '—'}
                    </td>
                    <td className={td}>{REFERENCE_LABELS[m.referenceType] ?? m.referenceType}</td>
                    <td className={td}>{m.performedBy ?? '—'}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <Empty>Sin movimientos registrados.</Empty>
            ))}

          {view === 'warehouses' && (
            <div className="p-4">
              <WarehousesView slug={slug} />
            </div>
          )}
        </Panel>
      </Gate>

      {creatingItem && <ItemFormDialog slug={slug} onClose={() => setCreatingItem(false)} onSaved={(id) => { setCreatingItem(false); setOpenItem(id) }} />}
      {openItem && <ItemSheet slug={slug} itemId={openItem} currency={d?.currency ?? 'USD'} onClose={() => setOpenItem(null)} />}
    </>
  )
}
