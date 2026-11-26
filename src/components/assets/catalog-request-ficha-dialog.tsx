import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Pill } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useCatalogFamilies } from '@/features/assets/use-assets'
import { REQUEST_STATUS, type CatalogRequest } from '@/features/assets/use-catalog-requests'
import { usePlantNetworks, usePlantStages } from '@/features/plant/use-plant-data'
import { api } from '@/lib/api'
import { criticalityLabel, statusLabel } from '@/lib/assets'
import { formatDateTime } from '@/lib/format'
import { formatSpecificationValue, visibleSpecificationEntries } from '@/lib/specification-value'
import type { FamilySpecification } from './family-specification-fields'

function Fields({ rows }: { rows: Array<[string, ReactNode]> }) {
  return <dl className="divide-y divide-border text-sm">{rows.map(([label, value]) => (
    <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
      <dt className="font-medium text-fur-navy-900 [overflow-wrap:anywhere]">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{value ?? '—'}</dd>
    </div>
  ))}</dl>
}

export function CatalogRequestFichaDialog({ request, plantSlug, onClose, onCreateFromRejected }: { request: CatalogRequest; plantSlug: string; onClose: () => void; onCreateFromRejected?: () => void }) {
  const { draft } = request
  const families = useCatalogFamilies()
  const stages = usePlantStages(plantSlug)
  const networks = usePlantNetworks(plantSlug)
  const definitions = useQuery({
    queryKey: ['catalog', 'specifications', draft.familyId],
    queryFn: () => api<FamilySpecification[]>(`/catalog/specifications?familyId=${encodeURIComponent(draft.familyId)}`),
    enabled: !!draft.familyId,
  })
  const family = families.data?.find(item => item.id === draft.familyId)
  const stage = stages.data?.find(item => item.code === draft.stageCode)
  const specifications = visibleSpecificationEntries(draft.specifications)
  const components = draft.components ?? []
  const sectionClass = 'overflow-hidden rounded-xl border border-border bg-card'
  const headingClass = 'border-b border-border px-4 py-3 text-sm font-semibold text-fur-navy-900'

  return <Dialog open onOpenChange={open => !open && onClose()}>
    <DialogContent showCloseButton={false} className="fur-asset-dialog flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-4xl">
      <header className="flex shrink-0 items-start gap-4 border-b px-5 py-5">
        <div className="min-w-0 flex-1">
          <DialogTitle>Ficha de solicitud</DialogTitle>
          <DialogDescription className="mt-1 [overflow-wrap:anywhere]">{draft.name} · Datos originales enviados a administración.</DialogDescription>
        </div>
        <DialogClose asChild><Button variant="ghost" size="icon-sm" aria-label="Cerrar ficha"><X /></Button></DialogClose>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-muted/20 p-4 sm:p-6">
        <section className={sectionClass}>
          <h2 className={headingClass}>Seguimiento de la solicitud</h2>
          <Fields rows={[
            ['Estado de la solicitud', <Pill {...REQUEST_STATUS[request.status]} />],
            ['Fecha de envío', formatDateTime(request.createdAt)],
            ['Fecha de decisión', formatDateTime(request.decidedAt)],
            ['Nota de la solicitud', request.draft.requestNote || 'Sin nota.'],
            ['Comentario de administración', request.decisionNote || 'Sin comentarios.'],
          ]} />
        </section>
        <section className={sectionClass}>
          <h2 className={headingClass}>Identificación y datos de la unidad</h2>
          <Fields rows={[
            ['Nombre', draft.name],
            ['Familia', family ? `${family.code} · ${family.name}` : draft.familyId],
            ['Etapa', stage ? `${stage.code} · ${stage.name}` : draft.stageCode],
            ['Redes', draft.networkCodes.map(code => { const network = networks.data?.find(item => item.code === code); return network ? `${code} · ${network.name}` : code }).join('\n')],
            ['Número de serie', draft.serialNumber],
            ['Estado del activo solicitado', draft.status ? statusLabel(draft.status) : null],
            ['Criticidad', draft.criticality ? criticalityLabel(draft.criticality) : null],
            ['Ubicación', draft.location],
            ['Visible públicamente', draft.isPublic ? 'Sí' : 'No'],
          ]} />
        </section>
        <section className={sectionClass}>
          <h2 className={headingClass}>Especificaciones técnicas</h2>
          {definitions.isError && <p className="px-4 pt-3 text-xs text-muted-foreground">No se pudieron cargar las etiquetas de la familia. Se muestran las claves guardadas.</p>}
          {specifications.length ? <Fields rows={specifications.map(([key, value]) => {
            const definition = definitions.data?.find(item => item.key === key)
            return [definition ? `${definition.label}${definition.unit ? ` (${definition.unit})` : ''}` : key, formatSpecificationValue(value)]
          })} /> : <p className="p-4 text-sm text-muted-foreground">Sin especificaciones registradas.</p>}
        </section>
        <section className={sectionClass}>
          <h2 className={headingClass}>Componentes</h2>
          {components.length ? <ul className="list-disc space-y-2 py-4 pr-4 pl-9 text-sm">{components.map((component, index) => <li key={index} className="whitespace-pre-wrap [overflow-wrap:anywhere]">{component}</li>)}</ul> : <p className="p-4 text-sm text-muted-foreground">Sin componentes registrados.</p>}
        </section>
      </div>
      {request.status === 'REJECTED' && onCreateFromRejected && <footer className="shrink-0 border-t p-4 text-right"><Button onClick={onCreateFromRejected}>Crear nueva solicitud</Button></footer>}
    </DialogContent>
  </Dialog>
}
