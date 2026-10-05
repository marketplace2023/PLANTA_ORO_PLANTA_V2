import { Download, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { selectClass } from '@/components/action-dialog'
import { DataTable, Empty, Failed, Gate, Loading, Panel, Pill, ScreenHeader, td } from '@/components/kit'
import { DocumentDetailSheet } from '@/components/documents/document-detail-sheet'
import { DocumentUploadDialog } from '@/components/documents/document-upload-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePlantAccess } from '@/components/use-plant-access'
import { fetchDocumentBlob, useDocuments, type DocumentItem } from '@/features/documents/use-documents'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES, DOCUMENT_VISIBILITY_LABELS, formatBytes, iconForMime, saveBlob } from '@/lib/documents'
import { formatDate } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'

export function DocumentsPage() {
  const { slug, can } = usePlantAccess()
  const allowed = can('document.read')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const q = useDebouncedValue(search.trim())
  const docs = useDocuments(slug, { search: q || undefined, type: type || undefined, status: 'ACTIVE', sort: 'updatedAt', dir: 'desc' }, 25)

  async function download(d: DocumentItem) {
    setBusyId(d.id)
    try {
      saveBlob(await fetchDocumentBlob(slug, d.id), d.file.originalName)
    } catch {
      toast.error('No se pudo descargar el documento')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <ScreenHeader
        title="Documentos"
        description="Manuales, planos, procedimientos y certificados vinculados a activos y etapas."
        actions={allowed && can('document.upload') && <Button onClick={() => setUploading(true)}><Plus /> Subir documento</Button>}
      />
      <Gate allowed={allowed} module="Documentos">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fur-gray-500" aria-hidden />
            <Input className="w-64 pl-9" placeholder="Buscar documento" aria-label="Buscar documentos" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={selectClass} aria-label="Tipo de documento" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todo tipo</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <Panel className="mt-3" flush>
          {docs.isLoading ? (
            <div className="p-4">
              <Loading rows={5} />
            </div>
          ) : docs.isError ? (
            <Failed what="los documentos" onRetry={() => void docs.refetch()} />
          ) : docs.data && docs.data.items.length > 0 ? (
            <>
              <DataTable head={['Documento', 'Tipo', 'Vinculado a', 'Versión', 'Visibilidad', 'Actualizado', { label: '', right: true }]}>
                {docs.data.items.map((d) => {
                  const Icon = iconForMime(d.file.mimeType)
                  return (
                    <tr key={d.id}>
                      <td className={td}>
                        <button type="button" onClick={() => setOpenId(d.id)} className="flex items-center gap-2 text-left font-medium text-fur-navy-900 underline-offset-2 outline-none hover:underline focus-visible:underline" title="Abrir: versiones, edición y archivo">
                          <Icon className="size-4 shrink-0 text-fur-gray-500" aria-hidden /> {d.title}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {d.file.originalName} · {formatBytes(d.file.sizeBytes)}
                        </p>
                      </td>
                      <td className={td}>{DOCUMENT_TYPE_LABELS[d.documentType]}</td>
                      <td className={`${td} max-w-56 truncate`}>{[...d.assets.map((a) => a.tag), ...d.stages.map((s) => s.name)].join(', ') || '—'}</td>
                      <td className={`${td} tabular-nums`}>v{d.currentVersion}</td>
                      <td className={td}>
                        <Pill label={DOCUMENT_VISIBILITY_LABELS[d.visibility]} color={d.visibility === 'PUBLIC' ? 'var(--fur-blue-500)' : 'var(--fur-navy-700)'} />
                      </td>
                      <td className={td}>{formatDate(d.updatedAt)}</td>
                      <td className={`${td} text-right`}>
                        <Button size="xs" variant="secondary" disabled={busyId === d.id} onClick={() => void download(d)}>
                          <Download /> Descargar
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </DataTable>
              <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                Mostrando {docs.data.items.length} de {docs.data.total} documentos.
              </p>
            </>
          ) : (
            <Empty>No hay documentos con estos filtros.</Empty>
          )}
        </Panel>
      </Gate>

      {uploading && <DocumentUploadDialog open onOpenChange={(o) => !o && setUploading(false)} plantSlug={slug} onSaved={() => setUploading(false)} />}
      {openId && <DocumentDetailSheet slug={slug} documentId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}
