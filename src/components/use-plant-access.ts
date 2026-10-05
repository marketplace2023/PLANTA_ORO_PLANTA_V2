import { useParams } from 'react-router-dom'
import { usePlant } from '@/features/plant/plant-context'

/** Planta de la URL y permisos del usuario en ella. Todas las pantallas de módulo parten de aquí. */
export function usePlantAccess() {
  const { plantSlug = '' } = useParams()
  const { currentPlant, permissions } = usePlant()
  const can = (permission: string) => permissions.includes(permission)
  return { slug: plantSlug, plant: currentPlant, permissions, can }
}
