import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ScreenHeader, Gate } from '@/components/kit'
import { usePlantAccess } from '@/components/use-plant-access'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { LuloMasterWorkspace } from '@fur-lulo/master-workspace'
import { LuloEditor } from '@fur-lulo/lulo-editor'
import { LuloWorksPortfolio } from '@fur-lulo/works-portfolio'
import { LuloContractWorkspace } from '@fur-lulo/contract-workspace'
import { stateLabels, decimalText, type LuloDocument } from '@fur-lulo/types'
import '../../../planta_beneficio_oro/apps/web/src/styles/lulo-workspace.css'

export function LuloPlantBudgets({ legacy }: { legacy: ReactNode }) {
  const { slug, plant, can } = usePlantAccess(); const [params, setParams] = useSearchParams(); const tab = params.get('tab') ?? 'masters'; const setTab = (tab: string) => setParams({ tab }); const [term, setTerm] = useState(''); const [search, setSearch] = useState(''); const [page, setPage] = useState(1)
  const list = useQuery({ queryKey: ['lulo', 'documents', slug, page, search], queryFn: () => api<{ items: { id: string; code: string; title: string; version: number; status: keyof typeof stateLabels; total: string; currency: string }[]; total: number }>(`/plants/${slug}/lulo/documents?${new URLSearchParams({ page: String(page), search })}`), enabled: can('budget.read') && tab === 'documents' })
  return <><ScreenHeader title="Presupuestos LULO" description="De los maestros al cierre: presupuestos, obras, contratos y ejecución de planta." actions={can('budget.edit') && <Button asChild><Link to={`/plants/${slug}/budgets/new`}><Plus /> Nuevo presupuesto</Link></Button>} /><Gate allowed={can('budget.read')} module="Presupuestos"><nav className="mb-5 flex flex-wrap gap-2" aria-label="Secciones de presupuestos">{[['masters', 'Maestros y estimación'], ['documents', 'Mis presupuestos'], ['works', 'Obras y clientes'], ['contracts', 'Contratos y ejecución'], ['legacy', 'Presupuestos anteriores']].map(([id, name]) => <Button key={id} variant={tab === id ? 'default' : 'outline'} onClick={() => setTab(id)}>{name}</Button>)}</nav>
    {tab === 'masters' && plant && <LuloMasterWorkspace plant={plant} canEdit={can('budget.edit')} />}
    {tab === 'legacy' && legacy}
    {(tab === 'works' || tab === 'contracts') && <LuloWorksPortfolio key={tab} slug={slug} canEdit={can('budget.edit')} canApprove={can('budget.approve')} initialTab={tab} presetDocument={params.get('documentId') ?? undefined} />}
    {tab === 'documents' && <section className="lulo-panel"><header><h2>Presupuestos de {plant?.name}</h2><form className="flex gap-2" onSubmit={e => { e.preventDefault(); setSearch(term); setPage(1) }}><Input aria-label="Buscar presupuestos LULO" value={term} onChange={e => setTerm(e.target.value)} placeholder="Buscar presupuesto" /><Button variant="outline" type="submit">Buscar</Button></form></header><div className="lulo-panel-body">{list.isLoading ? <p>Cargando presupuestos…</p> : list.isError ? <p role="alert">No se pudieron cargar los presupuestos.<Button onClick={() => void list.refetch()}>Reintentar</Button></p> : !list.data?.items.length ? <div className="lulo-empty"><h3>Aún no tienes presupuestos LULO.</h3><p>Selecciona una partida de los maestros o crea un presupuesto con tus propios precios.</p><Button asChild><Link to={`/plants/${slug}/budgets/new`}>Preparar presupuesto</Link></Button></div> : <div className="overflow-x-auto"><table className="lulo-master-table"><thead><tr><th>Presupuesto</th><th>Versión</th><th>Estado</th><th>Total</th></tr></thead><tbody>{list.data.items.map(d => <tr key={d.id}><td><Link className="underline" to={`/plants/${slug}/budgets/lulo/${d.id}`}>{d.title}</Link><small>{d.code}</small></td><td>v{d.version}</td><td>{stateLabels[d.status]}</td><td>{d.currency} {decimalText(d.total)}</td></tr>)}</tbody></table></div>}<nav className="mt-4 flex justify-between"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><Button variant="outline" disabled={page * 20 >= (list.data?.total ?? 0)} onClick={() => setPage(page + 1)}>Siguiente</Button></nav></div></section>}
  </Gate></>
}
export function LuloNewPage() {
  const { plant, can } = usePlantAccess()
  return <Gate allowed={can('budget.edit')} module="Presupuestos">{plant && <LuloMasterWorkspace plant={plant} canEdit />}</Gate>
}
export function LuloDocumentPage() {
  const { slug, plant, can } = usePlantAccess(); const { luloId } = useParams()
  const doc = useQuery({ queryKey: ['lulo', 'document', slug, luloId], queryFn: () => api<LuloDocument>(`/plants/${slug}/lulo/documents/${luloId}`), enabled: can('budget.read') && !!luloId })
  return <Gate allowed={can('budget.read')} module="Presupuestos">{doc.isLoading ? <p>Cargando presupuesto…</p> : doc.isError ? <p role="alert">No se pudo cargar el presupuesto.<Button variant="outline" onClick={() => void doc.refetch()}>Reintentar</Button></p> : doc.data && plant && <LuloEditor key={`${doc.data.id}:${doc.data.revision}`} doc={doc.data} plant={plant} canEdit={can('budget.edit')} canApprove={can('budget.approve')} />}</Gate>
}
export function LuloContractPage() {
  const { slug, can } = usePlantAccess(); const { contractId } = useParams()
  return <Gate allowed={can('budget.read')} module="Presupuestos">{contractId && <LuloContractWorkspace slug={slug} contractId={contractId} canEdit={can('budget.edit')} canApprove={can('budget.approve')} canUpload={can('document.upload')} />}</Gate>
}
