import { Gate, ScreenHeader } from '@/components/kit'
import { MembersTab } from '@/components/plant-admin/members-tab'
import { usePlantAccess } from '@/components/use-plant-access'

export function TeamPage() {
  const { slug, can } = usePlantAccess()
  return (
    <>
      <ScreenHeader title="Equipo" description="Personas con acceso a esta planta y su rol. Asigna o retira accesos." />
      <Gate allowed={can('user.read')} module="Equipo">
        <MembersTab slug={slug} />
      </Gate>
    </>
  )
}
