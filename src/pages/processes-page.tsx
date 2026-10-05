import { ArrowRight, Undo2 } from 'lucide-react'
import { Empty, Failed, Loading, Panel, Pill, ScreenHeader } from '@/components/kit'
import { usePlantAccess } from '@/components/use-plant-access'
import { useNetworkOverview, usePlantProcess, type FlowType } from '@/features/process/use-process'
import { STATUS_META, type AssetStatus } from '@/lib/assets'

const FLOW_LABELS: Record<FlowType, string> = { MATERIAL: 'Material', SOLUTION: 'Solución', WATER: 'Agua', REAGENT: 'Reactivo' }

export function ProcessesPage() {
  const { slug } = usePlantAccess()
  const process = usePlantProcess(slug)
  const networks = useNetworkOverview(slug)

  const stages = [...(process.data?.stages ?? [])].sort((a, b) => a.sequence - b.sequence)
  const byId = new Map(stages.map((s) => [s.id, s]))
  const groups = [...new Set(stages.map((s) => s.stageGroup))]

  return (
    <>
      <ScreenHeader title="Procesos" description="Mapa de etapas de la planta, sus conexiones y las redes transversales." />

      {process.isLoading ? (
        <Loading rows={4} />
      ) : process.isError ? (
        <Panel>
          <Failed what="el proceso" onRetry={() => void process.refetch()} />
        </Panel>
      ) : stages.length === 0 ? (
        <Panel>
          <Empty>No hay etapas habilitadas en esta planta.</Empty>
        </Panel>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <Panel key={g} title={g}>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stages
                  .filter((s) => s.stageGroup === g)
                  .map((s) => (
                    <li key={s.id} className="rounded-lg border border-border bg-fur-gray-50 p-3" style={{ borderTopColor: (s.attentionAssets ?? 0) > 0 ? 'var(--fur-orange-500)' : 'var(--fur-navy-800)', borderTopWidth: 3 }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="fur-code text-[11px] text-muted-foreground">{s.code}</p>
                          <p className="font-semibold text-fur-navy-900">{s.name}</p>
                        </div>
                        {(s.attentionAssets ?? 0) > 0 && <Pill label={`${s.attentionAssets} atención`} color="var(--fur-orange-500)" />}
                      </div>
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-fur-gray-600">
                        <div><dd className="text-lg font-bold text-fur-navy-900 tabular-nums">{s.assetCount ?? '—'}</dd><dt>Activos</dt></div>
                        <div><dd className="text-lg font-bold text-fur-navy-900 tabular-nums">{s.criticalAssets ?? '—'}</dd><dt>Críticos</dt></div>
                        <div><dd className="text-lg font-bold text-fur-navy-900 tabular-nums">{s.openWorkOrders ?? '—'}</dd><dt>OT abiertas</dt></div>
                      </dl>
                      {s.statusCounts && Object.keys(s.statusCounts).length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1">
                          {Object.entries(s.statusCounts).map(([k, v]) => {
                            const m = STATUS_META[k as AssetStatus]
                            return m ? <li key={k}><Pill label={`${m.label} ${v}`} color={m.color} icon={m.icon} /></li> : null
                          })}
                        </ul>
                      )}
                    </li>
                  ))}
              </ul>
            </Panel>
          ))}

          <Panel title="Conexiones del flujo" subtitle="Hacia dónde viaja el material, la solución, el agua y los reactivos" flush>
            {(process.data?.connections.length ?? 0) === 0 ? (
              <Empty>No hay conexiones definidas.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {process.data!.connections.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="font-medium text-fur-navy-900">{byId.get(c.sourceStageId)?.name ?? '—'}</span>
                    {c.isReturnFlow ? <Undo2 className="size-4 text-fur-orange-500" aria-label="retorno" /> : <ArrowRight className="size-4 text-fur-gray-500" aria-label="hacia" />}
                    <span className="font-medium text-fur-navy-900">{byId.get(c.targetStageId)?.name ?? '—'}</span>
                    <Pill label={FLOW_LABELS[c.flowType]} color="var(--fur-blue-500)" />
                    {c.isReturnFlow && <Pill label="Retorno" color="var(--fur-orange-500)" />}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <Panel title="Redes transversales" subtitle="Sistemas que atraviesan todas las etapas" className="mt-6">
        {networks.isLoading ? (
          <Loading rows={2} />
        ) : networks.isError ? (
          <Failed what="las redes" onRetry={() => void networks.refetch()} />
        ) : networks.data && networks.data.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {networks.data.map((n) => (
              <li key={n.id} className="rounded-lg border border-border border-l-4 bg-card p-3" style={{ borderLeftColor: n.colorToken ? `var(--${n.colorToken})` : undefined }}>
                <p className="fur-code text-[11px] text-muted-foreground">{n.code}</p>
                <p className="font-semibold text-fur-navy-900">{n.name}</p>
                <p className="mt-1 text-xs text-fur-gray-600">
                  {n.assetCount ?? '—'} activos{(n.attentionAssets ?? 0) > 0 ? ` · ${n.attentionAssets} con atención` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No hay redes habilitadas.</Empty>
        )}
      </Panel>
    </>
  )
}
