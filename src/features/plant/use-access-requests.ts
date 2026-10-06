import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, jsonBody } from '@/lib/api'

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type AccessRequest = {
  id: string
  status: AccessRequestStatus
  message: string | null
  roleCode: string | null
  decisionNote: string | null
  decidedAt: string | null
  createdAt: string
  plantId: string
  plantName: string
  plantSlug: string
}

export const ACCESS_STATUS_LABELS: Record<AccessRequestStatus, string> = { PENDING: 'Pendiente', APPROVED: 'Aprobada', REJECTED: 'Rechazada', CANCELLED: 'Retirada' }

const KEY = ['plant-access-requests', 'mine'] as const

/** Solicitudes de acceso de la persona (las suyas, de todas las plantas). */
export function useMyAccessRequests() {
  return useQuery({ queryKey: KEY, queryFn: () => api<AccessRequest[]>('/plant-access-requests/mine') })
}

export function useRequestAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { plant: string; message?: string }) => api<AccessRequest>('/plant-access-requests', { method: 'POST', ...jsonBody(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCancelAccessRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<AccessRequest>(`/plant-access-requests/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
