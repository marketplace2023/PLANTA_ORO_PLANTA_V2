import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AssetInput } from './use-assets'

export type CatalogRequest = {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  draft: AssetInput & { familyId: string; stageCode: string; networkCodes: string[]; requestNote?: string; sourceRequestId?: string }
  createdAt: string
  decidedAt: string | null
  decisionNote: string | null
  assetId: string | null
}

export const REQUEST_STATUS = {
  PENDING: { label: 'Pendiente de revisión', color: 'var(--fur-orange-500)' },
  APPROVED: { label: 'Aprobada: activo registrado', color: 'var(--fur-green-500)' },
  REJECTED: { label: 'Rechazada', color: 'var(--fur-red-500)' },
}

export function useCatalogRequests(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['plant', slug, 'catalog-requests'],
    queryFn: () => api<CatalogRequest[]>(`/plants/${slug}/catalog-requests`),
    enabled: !!slug && enabled,
  })
}
