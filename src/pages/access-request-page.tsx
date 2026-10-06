import { Factory, LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ActionDialog } from '@/components/action-dialog'
import { DataTable, Empty, Failed, Loading, Panel, Pill, td } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { usePlant, type PlantSummary } from '@/features/plant/plant-context'
import { ACCESS_STATUS_LABELS, useCancelAccessRequest, useMyAccessRequests, useRequestAccess, type AccessRequestStatus } from '@/features/plant/use-access-requests'
import { ApiError } from '@/lib/api'

const STATUS_COLOR: Record<AccessRequestStatus, string> = {
  PENDING: 'var(--fur-orange-500)',
  APPROVED: 'var(--fur-green-500)',
  REJECTED: 'var(--fur-red-500)',
  CANCELLED: 'var(--fur-steel-500)',
}

const fail = (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'No se pudo completar la acción')

/**
 * La persona tiene cuenta pero ninguna planta asignada: puede pedir acceso a una de las plantas que ve y esperar a que el
 * administrador del ecosistema la apruebe (eligiendo el rol). Mientras está pendiente no concede ningún permiso.
 */
export function AccessRequestPage() {
  const { user, logout } = useAuth()
  const { availablePlants, isLoadingPlants } = usePlant()
  const navigate = useNavigate()
  const mine = useMyAccessRequests()
  const request = useRequestAccess()
  const cancel = useCancelAccessRequest()
  const [target, setTarget] = useState<PlantSummary | null>(null)

  const requests = mine.data ?? []
  const pendingPlantIds = new Set(requests.filter((r) => r.status === 'PENDING').map((r) => r.plantId))
  const approved = requests.some((r) => r.status === 'APPROVED')

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 pt-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-fur-navy-900 text-fur-gold-400">
          <Factory className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-bold text-fur-navy-900">Pide acceso a una planta</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Hola {user?.firstName}. Tu cuenta aún no tiene ninguna planta asignada. Elige la tuya: el administrador del ecosistema revisará la solicitud y te asignará el rol que corresponda.
        </p>
      </div>

      {approved && (
        <p role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-fur-green-500/40 bg-fur-green-500/10 px-3 py-2 text-sm text-fur-green-500">
          Tu acceso fue aprobado. Entra para empezar a trabajar.
          <Button size="sm" onClick={() => window.location.reload()}>Entrar al panel</Button>
        </p>
      )}

      <Panel title="Plantas disponibles" subtitle="Solo aparecen las plantas que puedes ver; las privadas las asigna el administrador">
        {isLoadingPlants ? (
          <Loading rows={2} />
        ) : availablePlants.length === 0 ? (
          <Empty>No hay plantas visibles para tu cuenta. Pide a un administrador que te asigne una.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {availablePlants.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fur-navy-900">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.code}</p>
                </div>
                <Button size="sm" variant="outline" disabled={pendingPlantIds.has(p.id)} onClick={() => { request.reset(); setTarget(p) }}>
                  {pendingPlantIds.has(p.id) ? 'Solicitud pendiente' : 'Solicitar acceso'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Mis solicitudes"
        flush
        action={<Button size="xs" variant="outline" onClick={() => void mine.refetch()} disabled={mine.isFetching}><RefreshCw /> Actualizar</Button>}
      >
        {mine.isLoading ? (
          <div className="p-4"><Loading rows={2} /></div>
        ) : mine.isError ? (
          <Failed what="tus solicitudes" onRetry={() => void mine.refetch()} />
        ) : requests.length === 0 ? (
          <Empty>Aún no has pedido acceso a ninguna planta.</Empty>
        ) : (
          <DataTable head={['Planta', 'Estado', 'Detalle', { label: 'Acciones', right: true }]}>
            {requests.map((r) => (
              <tr key={r.id}>
                <td className={`${td} font-medium text-fur-navy-900`}>{r.plantName}</td>
                <td className={td}><Pill label={ACCESS_STATUS_LABELS[r.status]} color={STATUS_COLOR[r.status]} /></td>
                <td className={`${td} text-xs text-muted-foreground`}>
                  {r.status === 'APPROVED' && r.roleCode ? `Rol asignado: ${r.roleCode}` : r.decisionNote ?? r.message ?? '—'}
                </td>
                <td className={`${td} text-right`}>
                  {r.status === 'PENDING' && (
                    <Button size="xs" variant="secondary" aria-label={`Retirar solicitud de ${r.plantName}`} disabled={cancel.isPending} onClick={() => cancel.mutate(r.id, { onSuccess: () => toast.success('Solicitud retirada'), onError: fail })}>
                      Retirar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={async () => {
            await logout()
            navigate('/login')
          }}
        >
          <LogOut /> Cerrar sesión
        </Button>
      </div>

      <ActionDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title={`Solicitar acceso a ${target?.name ?? ''}`}
        description="Cuéntale al administrador quién eres y qué harás en la planta."
        noteLabel="Mensaje"
        confirmLabel="Enviar solicitud"
        busy={request.isPending}
        onConfirm={(message) =>
          target &&
          request.mutate(
            { plant: target.slug, message: message.trim() || undefined },
            {
              onSuccess: () => {
                toast.success('Solicitud enviada: el administrador la revisará')
                setTarget(null)
              },
              onError: fail,
            },
          )
        }
      />
    </div>
  )
}
