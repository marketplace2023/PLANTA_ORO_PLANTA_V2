import { useQuery } from '@tanstack/react-query'
import { ClipboardList, ListChecks, Settings2, X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Failed, Loading, Pill } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useAssetFur } from '@/features/assets/use-assets'
import { api } from '@/lib/api'
import { CRITICALITY_META, STATUS_META } from '@/lib/assets'
import { formatSpecificationValue, visibleSpecificationEntries } from '@/lib/specification-value'
import type { FamilySpecification } from './family-specification-fields'

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-white">
      <h3 className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm font-semibold text-fur-navy-900 sm:px-5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-fur-navy-900/5"><Icon className="size-4" aria-hidden /></span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function KeyValue({ rows }: { rows: Array<[string, ReactNode]> }) {
  return <dl className="divide-y divide-border text-sm">{rows.map(([label, value]) => (
    <div key={label} className="grid gap-1.5 px-4 py-3 odd:bg-fur-gray-50/70 sm:grid-cols-[minmax(0,32%)_minmax(0,1fr)] sm:gap-5 sm:px-5">
      <dt className="min-w-0 font-medium text-fur-navy-900 [overflow-wrap:anywhere]">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-fur-gray-800 [overflow-wrap:anywhere]">{value ?? <span className="text-muted-foreground">Por determinar</span>}</dd>
    </div>
  ))}</dl>
}

const humanize = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ')

/** Consulta los datos propios del equipo, sin sustituirlos por los de sus modelos de referencia. */
export function AssetFichaDialog({ plantSlug, assetId, onClose }: { plantSlug: string; assetId: string; onClose: () => void }) {
  const fur = useAssetFur(plantSlug, assetId)
  const asset = fur.data?.asset
  const familyId = asset?.family.id
  const definitions = useQuery({
    queryKey: ['catalog', 'specifications', familyId],
    queryFn: () => api<FamilySpecification[]>(`/catalog/specifications?familyId=${encodeURIComponent(familyId!)}`),
    enabled: !!familyId,
  })
  const specLabel = (key: string) => {
    const definition = definitions.data?.find(item => item.key === key)
    return definition ? `${definition.label}${definition.unit ? ` (${definition.unit})` : ''}` : humanize(key)
  }
  const components = Array.isArray(asset?.technicalData?.componentes)
    ? asset.technicalData.componentes.filter((value): value is string => typeof value === 'string' && !!value.trim()) : []
  const specifications = visibleSpecificationEntries(asset?.specifications)
  const references = fur.data?.referenceModels ?? asset?.referenceModels ?? []

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-h-[94dvh] flex-col gap-0 overflow-hidden rounded-2xl bg-fur-gray-50 p-0 shadow-2xl sm:max-w-6xl">
        <header className="flex shrink-0 items-center gap-4 border-b-2 border-fur-gold-500 bg-fur-navy-900 px-4 py-4 text-white sm:px-6">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold sm:text-xl">Ficha del activo de planta</DialogTitle>
            <DialogDescription className="mt-1 text-xs text-white/70">{fur.data ? `${fur.data.plant.name} | ${asset?.tag}` : 'Consulta de los datos propios del equipo instalado.'}</DialogDescription>
          </div>
          <DialogClose asChild><Button variant="ghost" size="icon-sm" className="shrink-0 text-white hover:bg-white/15 hover:text-white" aria-label="Cerrar ficha"><X /></Button></DialogClose>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-3 sm:p-6">
          {fur.isPending ? <Loading rows={6} /> : fur.isError ? <Failed what="la ficha del activo" onRetry={() => void fur.refetch()} /> : asset && fur.data && <>
            <div className="space-y-3 rounded-xl border border-border bg-white p-5 sm:p-7">
              <p className="border-l-2 border-fur-gold-500 pl-2 text-xs font-semibold text-fur-navy-900">{asset.family.name}</p>
              <h2 className="text-2xl font-semibold tracking-tight text-fur-navy-900 [overflow-wrap:anywhere] sm:text-3xl">{asset.name}</h2>
              <p className="fur-code text-sm text-muted-foreground [overflow-wrap:anywhere]">{asset.tag} · {asset.furCode}</p>
              <div className="flex flex-wrap gap-2">
                <Pill {...STATUS_META[asset.status]} />
                <Pill label={`Criticidad ${CRITICALITY_META[asset.criticality].label.toLocaleLowerCase('es')}`} color={CRITICALITY_META[asset.criticality].color} />
              </div>
            </div>
            <Section icon={ClipboardList} title="1. Identificación del activo">
              <KeyValue rows={[
                ['Planta', fur.data.plant.name], ['TAG activo', asset.tag], ['Código FUR', asset.furCode],
                ['Etapa de proceso', asset.stage ? `${asset.stage.code} · ${asset.stage.name}` : null],
                ['Familia', asset.family.name], ['Tipo', asset.type.name],
                ['Redes', asset.networks.map(network => `${network.code} · ${network.name}`).join('\n') || null],
                ['Ubicación', asset.location], ['Número de serie', asset.serialNumber],
                ['Fecha de instalación', asset.installationDate?.slice(0, 10)],
                ['Puesta en marcha', asset.commissionDate?.slice(0, 10)],
              ]} />
            </Section>
            <Section icon={Settings2} title="2. Especificaciones técnicas">
              {definitions.isError && <p className="px-5 pt-4 text-xs text-muted-foreground">No se pudieron cargar las etiquetas de la familia. Se muestran las claves guardadas.</p>}
              {specifications.length ? <KeyValue rows={specifications.map(([key, value]) => [specLabel(key), formatSpecificationValue(value)])} /> : <p className="p-5 text-sm text-muted-foreground">Sin especificaciones registradas.</p>}
            </Section>
            <Section icon={ListChecks} title="3. Componentes del activo">
              {components.length ? <ul className="list-disc space-y-2 py-4 pr-5 pl-10 text-sm text-fur-gray-800">{components.map((component, index) => <li key={index} className="whitespace-pre-wrap [overflow-wrap:anywhere]">{component}</li>)}</ul> : <p className="p-5 text-sm text-muted-foreground">Sin componentes registrados.</p>}
            </Section>
            <Section icon={ClipboardList} title="4. Modelos de referencia">
              {references.length ? <KeyValue rows={references.map((model, index) => [`Referencia ${index + 1}`, `${model.catalogTag ? `${model.catalogTag} · ` : ''}${model.modelName}`])} /> : <p className="p-5 text-sm text-muted-foreground">Sin modelos de referencia vinculados.</p>}
            </Section>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
