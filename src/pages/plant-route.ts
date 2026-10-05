import { useOutletContext } from 'react-router-dom'
import type { PlantDetail } from '@/features/plant/use-plant-data'

/** Planta de la URL (con el acceso del usuario), cargada una sola vez por PlantArea. */
export const usePlantOutlet = () => useOutletContext<PlantDetail>()
