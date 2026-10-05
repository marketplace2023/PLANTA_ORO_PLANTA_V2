import { Archive, ChevronDown, Pencil, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AssetFormDialog } from '@/components/assets/asset-form-dialog'
import { selectClass } from '@/components/action-dialog'
import { BarRows, DataTable, Empty, Failed, Loading, Panel, Pill, ScreenHeader, td, type BarRow } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { usePlantAccess } from '@/components/use-plant-access'
import { useAssetFur, useAssets, useDecommissionAsset, type AssetItem } from '@/features/assets/use-assets'
import { usePlantProcess } from '@/features/process/use-process'
import { ApiError } from '@/lib/api'
import { ASSET_STATUSES, CRITICALITY_META, STATUS_META } from '@/lib/assets'
import { useDebouncedValue } from '@/lib/use-debounced-value'

/** Carga el detalle del activo y abre el formulario de edición con él. */
function EditAsset({ slug, id, onClose }: { slug: string; id: string; onClose: () => void }) {
  const fur = useAssetFur(slug, id)
  if (!fur.data) return null
  return <AssetFormDialog open onOpenChange={(o) => !o && onClose()} plantSlug={slug} asset={fur.data.asset} onSaved={onClose} />
}

/** Baja lógica: el activo y su historial se conservan. */
function DecommissionDialog({ slug, asset, onClose }: { slug: string; asset: AssetItem; onClose: () => void }) {
  const decommission = useDecommissionAsset(slug, asset.id)
  const [error, setError] = useState<string>()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Dar de baja {asset.tag}?</DialogTitle>
          <DialogDescription>El activo dejará de aparecer en los listados y no podrá modificarse. Su historial se conserva.</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="rounded-md bg-fur-red-500/10 p-3 text-sm text-fur-red-500">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={decommission.isPending}
            onClick={() =>
              decommission.mutate(undefined, {
                onSuccess: () => { toast.success(`${asset.tag} dado de baja`); onClose() },
                onError: (e) => setError(e instanceof ApiError && e.status === 403 ? 'No tienes permiso para dar de baja activos.' : 'No se pudo dar de baja el activo.'),
              })
            }
          >
            {decommission.isPending ? 'Dando de baja…' : 'Dar de baja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AssetsPage() {
  const { slug, can } = usePlantAccess()
  const [creating, setCreating] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [decomm, setDecomm] = useState<AssetItem | null>(null)
  const canWrite = can('asset.update') || can('asset.delete')
  const process = usePlantProcess(slug)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [criticality, setCriticality] = useState('')
  const [stage, setStage] = useState('')
  const q = useDebouncedValue(search.trim())
  const assets = useAssets(slug, { search: q || undefined, status: status || undefined, criticality: criticality || undefined, stage: stage || undefined, sort: 'tag', dir: 'asc' }, 25)

  // Distribución por estado: suma de los conteos por etapa (no depende de la página visible).
  const byStatus = useMemo<BarRow[]>(() => {
    const sum: Record<string, number> = {}
    for (const s of process.data?.stages ?? []) for (const [k, v] of Object.entries(s.statusCounts ?? {})) sum[k] = (sum[k] ?? 0) + v
    return ASSET_STATUSES.filter((k) => k !== 'DECOMMISSIONED' || sum[k]).map((k) => ({ key: k, label: STATUS_META[k].label, value: sum[k] ?? 0, color: STATUS_META[k].color, icon: STATUS_META[k].icon }))
  }, [process.data])
  const stages = [...(process.data?.stages ?? [])].sort((a, b) => a.sequence - b.sequence)

  return (
    <>
      <ScreenHeader
        title="Activos"
        description="Equipos físicos de la planta con su código FUR, estado y criticidad."
        actions={can('asset.create') && <Button onClick={() => setCreating(true)}><Plus /> Nuevo activo</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Activos por estado" subtitle={process.data?.totals ? `${process.data.totals.assets} en etapas habilitadas` : undefined}>
          {process.isLoading ? <Loading rows={5} /> : process.isError ? <Failed onRetry={() => void process.refetch()} /> : <BarRows rows={byStatus} empty="No hay activos" />}
        </Panel>
        <Panel title="Activos por etapa" className="lg:col-span-2">
          {process.isLoading ? (
            <Loading rows={5} />
          ) : (
            <BarRows
              rows={stages.map((s) => ({ key: s.id, label: s.name, value: s.assetCount ?? 0, color: (s.attentionAssets ?? 0) > 0 ? 'var(--fur-orange-500)' : 'var(--fur-navy-800)' }))}
              empty="No hay etapas habilitadas"
            />
          )}
          <p className="mt-3 text-xs text-muted-foreground">Las etapas con activos que requieren atención (críticos o en reparación) se marcan en naranja.</p>
        </Panel>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fur-gray-500" aria-hidden />
          <Input className="w-64 pl-9" placeholder="Buscar tag, nombre o código FUR" aria-label="Buscar activos" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={selectClass} aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todo estado</option>
          {ASSET_STATUSES.map((k) => (
            <option key={k} value={k}>
              {STATUS_META[k].label}
            </option>
          ))}
        </select>
        <select className={selectClass} aria-label="Criticidad" value={criticality} onChange={(e) => setCriticality(e.target.value)}>
          <option value="">Toda criticidad</option>
          {Object.entries(CRITICALITY_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select className={selectClass} aria-label="Etapa" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">Toda etapa</option>
          {stages.map((s) => (
            <option key={s.id} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <Panel className="mt-3" flush>
        {assets.isLoading ? (
          <div className="p-4">
            <Loading rows={6} />
          </div>
        ) : assets.isError ? (
          <Failed what="los activos" onRetry={() => void assets.refetch()} />
        ) : assets.data && assets.data.items.length > 0 ? (
          <>
            <DataTable head={['Activo', 'Código FUR', 'Etapa', 'Familia / tipo', 'Estado', 'Criticidad', 'Ubicación', ...(canWrite ? [{ label: 'Acciones', right: true }] : [])]}>
              {assets.data.items.map((a) => {
                const st = STATUS_META[a.status]
                const cr = CRITICALITY_META[a.criticality]
                return (
                  <tr key={a.id}>
                    <td className={td}>
                      <p className="font-medium text-fur-navy-900">{a.tag}</p>
                      <p className="text-xs text-muted-foreground">{a.name}</p>
                    </td>
                    <td className={`${td} fur-code text-xs`}>{a.furCode}</td>
                    <td className={td}>{a.stage?.name ?? '—'}</td>
                    <td className={td}>
                      {a.family.name}
                      <p className="text-xs text-muted-foreground">{a.type.name}</p>
                    </td>
                    <td className={td}>
                      <Pill label={st.label} color={st.color} icon={st.icon} />
                    </td>
                    <td className={td}>
                      <Pill label={cr.label} color={cr.color} />
                    </td>
                    <td className={td}>{a.location ?? '—'}</td>
                    {canWrite && (
                      <td className={`${td} text-right`}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="xs" variant="secondary" aria-label={`Acciones de ${a.tag}`}>Acciones <ChevronDown /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {can('asset.update') && <DropdownMenuItem onSelect={() => setEditId(a.id)}><Pencil /> Editar</DropdownMenuItem>}
                            {can('asset.delete') && a.status !== 'DECOMMISSIONED' && <DropdownMenuItem onSelect={() => setDecomm(a)}><Archive /> Dar de baja</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                )
              })}
            </DataTable>
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Mostrando {assets.data.items.length} de {assets.data.total} activos.
            </p>
          </>
        ) : (
          <Empty>No hay activos con estos filtros.</Empty>
        )}
      </Panel>
      {creating && <AssetFormDialog open onOpenChange={(o) => !o && setCreating(false)} plantSlug={slug} onSaved={() => setCreating(false)} />}
      {editId && <EditAsset slug={slug} id={editId} onClose={() => setEditId(null)} />}
      {decomm && <DecommissionDialog slug={slug} asset={decomm} onClose={() => setDecomm(null)} />}
    </>
  )
}
