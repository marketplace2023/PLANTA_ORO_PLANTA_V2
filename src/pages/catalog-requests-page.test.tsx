import { afterEach, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { mockApi } from '@/test/fetch-mock'
import type { CatalogRequest } from '@/features/assets/use-catalog-requests'
import { CatalogRequestsPage } from './catalog-requests-page'

const access = vi.hoisted(() => ({ allowed: true }))
vi.mock('@/components/use-plant-access', () => ({
  usePlantAccess: () => ({ slug: 'revemin-ii', can: () => access.allowed }),
}))
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); access.allowed = true })

function request(index: number, status: CatalogRequest['status'] = 'PENDING'): CatalogRequest {
  return {
    id: `r${index}`, status, createdAt: '2026-11-06T12:00:00Z',
    decidedAt: status === 'PENDING' ? null : '2026-11-06T13:00:00Z',
    decisionNote: status === 'REJECTED' ? 'Falta información del equipo.' : null,
    assetId: status === 'APPROVED' ? 'a1' : null,
    draft: { name: `Equipo ${index}`, familyId: 'f1', stageCode: 'D06', networkCodes: ['PTE'], serialNumber: `SN-${index}`, status: 'OPERATIVE', criticality: 'HIGH', isPublic: false, specifications: { power: 125, enabled: false, speed: { min: 0, max: 10 } }, components: [`Motor ${index}`] },
  }
}

it('muestra todas las solicitudes y abre la ficha original de cada fila, incluso las resueltas', async () => {
  const api = mockApi({
    'GET /plants/revemin-ii/catalog-requests': { body: Array.from({ length: 12 }, (_, index) => request(index, index === 0 ? 'APPROVED' : index === 1 ? 'REJECTED' : 'PENDING')) },
    'GET /catalog/families': { body: [{ id: 'f1', code: 'MOT', name: 'Motores' }] },
    'GET /plants/revemin-ii/stages': { body: [{ code: 'D06', name: 'Molienda' }] },
    'GET /plants/revemin-ii/networks': { body: [{ code: 'PTE', name: 'Potencia eléctrica' }] },
    'GET /catalog/specifications': { body: [{ key: 'power', label: 'Potencia', unit: 'kW' }] },
  })
  renderWithProviders(<CatalogRequestsPage />)
  expect(await screen.findAllByRole('button', { name: /Ver ficha de Equipo/ })).toHaveLength(12)
  expect(screen.getByText('Aprobada: activo registrado')).toBeInTheDocument()
  expect(screen.getByText('Rechazada')).toBeInTheDocument()
  for (const index of [11, 0, 1]) {
    await userEvent.click(screen.getByRole('button', { name: `Ver ficha de Equipo ${index}` }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Ficha de solicitud' }))
    expect(await dialog.findByText('MOT · Motores')).toBeInTheDocument()
    expect(await dialog.findByText('Potencia (kW)')).toBeInTheDocument()
    expect(dialog.getByText('125')).toBeInTheDocument()
    expect(dialog.getByText('0 – 10')).toBeInTheDocument()
    expect(dialog.getByText(`SN-${index}`)).toBeInTheDocument()
    expect(dialog.getByText(`Motor ${index}`)).toBeInTheDocument()
    expect(dialog.getByText('Alta')).toBeInTheDocument()
    if (index === 1) expect(dialog.getByText('Falta información del equipo.')).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Cerrar ficha' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  }
  expect(api.calls.every(call => call.method === 'GET')).toBe(true)
})

it('permite reintentar una carga fallida y muestra el listado vacío', async () => {
  let failed = true
  mockApi({ 'GET /plants/revemin-ii/catalog-requests': () => failed ? { status: 500 } : { body: [] } })
  renderWithProviders(<CatalogRequestsPage />)
  const retry = await screen.findByRole('button', { name: 'Reintentar' })
  failed = false
  await userEvent.click(retry)
  expect(await screen.findByText('No hay solicitudes de esta planta.')).toBeInTheDocument()
})

it('no consulta solicitudes sin el permiso requerido por la API', () => {
  access.allowed = false
  const api = mockApi({})
  renderWithProviders(<CatalogRequestsPage />)
  expect(screen.getByText('Sin acceso a solicitudes de catálogo')).toBeInTheDocument()
  expect(api.calls).toHaveLength(0)
})

it('conserva datos legibles si fallan los maestros y muestra una ficha sin datos técnicos', async () => {
  const row = request(1)
  row.draft.specifications = {}
  row.draft.components = []
  mockApi({
    'GET /plants/revemin-ii/catalog-requests': { body: [row] },
    'GET /catalog/families': { status: 500 },
    'GET /plants/revemin-ii/stages': { status: 500 },
    'GET /plants/revemin-ii/networks': { status: 500 },
    'GET /catalog/specifications': { status: 500 },
  })
  renderWithProviders(<CatalogRequestsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Equipo 1' }))
  const dialog = within(await screen.findByRole('dialog'))
  expect(dialog.getByText('D06')).toBeInTheDocument()
  expect(dialog.getByText('PTE')).toBeInTheDocument()
  expect(dialog.getByText('Sin especificaciones registradas.')).toBeInTheDocument()
  expect(dialog.getByText('Sin componentes registrados.')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
