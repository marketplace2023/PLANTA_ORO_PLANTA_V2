import { useState } from 'react'
import { CatalogRequestFichaDialog } from '@/components/assets/catalog-request-ficha-dialog'
import { DataTable, Empty, Failed, Gate, Loading, Panel, Pill, ScreenHeader, td } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { usePlantAccess } from '@/components/use-plant-access'
import { REQUEST_STATUS, useCatalogRequests } from '@/features/assets/use-catalog-requests'
import { formatDateTime } from '@/lib/format'

export function CatalogRequestsPage() {
  const { slug, can } = usePlantAccess()
  const allowed = can('asset.create')
  const requests = useCatalogRequests(slug, allowed)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = requests.data?.find(item => item.id === selectedId)

  return <Gate allowed={allowed} module="solicitudes de catálogo">
    <ScreenHeader title="Solicitudes" description="Solicitudes de incorporación al catálogo enviadas por esta planta. Consulta su estado y la ficha enviada." />
    <Panel flush>
      {requests.isPending ? <div className="p-4"><Loading rows={5} /></div> : requests.isError ? <Failed what="las solicitudes" onRetry={() => void requests.refetch()} /> : !requests.data.length ? <Empty>No hay solicitudes de esta planta.</Empty> : (
        <DataTable head={['Solicitud', 'Fecha de envío', 'Estado', 'Detalle']}>
          {requests.data.map(request => <tr key={request.id}>
            <td className={td}><span className="font-medium">{request.draft.name}</span></td>
            <td className={`${td} whitespace-nowrap`}>{formatDateTime(request.createdAt)}</td>
            <td className={td}><Pill {...REQUEST_STATUS[request.status]} /></td>
            <td className={td}><Button variant="outline" size="sm" aria-label={`Ver ficha de ${request.draft.name}`} onClick={() => setSelectedId(request.id)}>Ver ficha</Button></td>
          </tr>)}
        </DataTable>
      )}
    </Panel>
    {selected && <CatalogRequestFichaDialog key={`${slug}:${selected.id}`} request={selected} plantSlug={slug} onClose={() => setSelectedId(null)} />}
  </Gate>
}
