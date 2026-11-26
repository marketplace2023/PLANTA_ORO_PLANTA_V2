import { afterEach, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { mockApi } from '@/test/fetch-mock'
import type { CatalogRequest } from '@/features/assets/use-catalog-requests'
import { CatalogRequestsPage } from './catalog-requests-page'
import { STAGES, NETWORKS, page } from '@/test/assets-fixtures'

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
    draft: { name: `Equipo ${index}`, familyId: 'f1', stageCode: 'D06', networkCodes: ['PTE'], serialNumber: `SN-${index}`, requestNote: 'Necesitamos esta variante.\nIncluye protección adicional.', status: 'OPERATIVE', criticality: 'HIGH', isPublic: false, specifications: { power: 125, enabled: false, speed: { min: 0, max: 10 } }, components: [`Motor ${index}`] },
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
  expect(screen.getAllByRole('button', { name: /Crear nueva solicitud a partir de/ })).toHaveLength(1)
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
    expect(dialog.getByText('Necesitamos esta variante. Incluye protección adicional.')).toBeInTheDocument()
    if (index === 1) expect(dialog.getByText('Falta información del equipo.')).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Cerrar ficha' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  }
  expect(api.calls.every(call => call.method === 'GET')).toBe(true)
})

it('precarga una rechazada desde el listado o la ficha y envía una solicitud independiente con las correcciones', async () => {
  const source = request(1, 'REJECTED')
  source.draft.networkCodes = ['FUR-PTE']
  const original = structuredClone(source)
  let rows = [source]
  const api = mockApi({
    'GET /plants/revemin-ii/catalog-requests': () => ({ body: rows }),
    'GET /catalog/families': { body: [{ id: 'f1', code: 'MOT', tagCode: 'MOT', name: 'Motores' }] },
    'GET /plants/revemin-ii/stages': { body: STAGES },
    'GET /plants/revemin-ii/networks': { body: NETWORKS },
    'GET /catalog/assets': { body: page([]) },
    'GET /plants/revemin-ii/assets/tag-preview': { body: { tag: 'FUR-PTE-D06-MOT-001' } },
    'GET /catalog/specifications': { body: [{ id: 'spec1', familyId: 'f1', key: 'power', label: 'Potencia', unit: 'kW', valueType: 'TEXT', required: false, sortOrder: 1 }] },
    'POST /plants/revemin-ii/catalog-requests': ({ init }) => {
      const draft = JSON.parse(init.body as string)
      const saved = { ...request(2), draft }
      rows = [saved, source]
      return { status: 201, body: saved }
    },
  })
  renderWithProviders(<CatalogRequestsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Crear nueva solicitud a partir de Equipo 1' }))
  let form = within(await screen.findByRole('dialog', { name: 'Nueva solicitud' }))
  expect(form.getByLabelText('Nombre')).toHaveValue('Equipo 1')
  expect(form.getByLabelText('Número de serie')).toHaveValue('SN-1')
  expect(form.getByLabelText('Nota de la solicitud (opcional)')).toHaveValue(source.draft.requestNote)
  expect(form.getByText('Motivo del rechazo: Falta información del equipo.')).toBeInTheDocument()
  expect(await form.findByLabelText(/Potencia/)).toHaveValue('125')
  expect(form.getByLabelText('Componente 1')).toHaveValue('Motor 1')
  await userEvent.click(form.getByRole('button', { name: 'Cancelar' }))
  expect(api.calls.every(c => c.method === 'GET')).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Ver ficha de Equipo 1' }))
  await userEvent.click(within(await screen.findByRole('dialog', { name: 'Ficha de solicitud' })).getByRole('button', { name: 'Crear nueva solicitud' }))
  form = within(await screen.findByRole('dialog', { name: 'Nueva solicitud' }))
  await userEvent.clear(form.getByLabelText('Nombre'))
  await userEvent.type(form.getByLabelText('Nombre'), 'Equipo corregido')
  await userEvent.clear(form.getByLabelText('Nota de la solicitud (opcional)'))
  await userEvent.type(form.getByLabelText('Nota de la solicitud (opcional)'), 'Motivos ampliados')
  await userEvent.clear(form.getByLabelText(/Potencia/))
  await userEvent.type(form.getByLabelText(/Potencia/), '150')
  await userEvent.click(form.getByRole('button', { name: 'Enviar solicitud' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(await screen.findByRole('button', { name: 'Ver ficha de Equipo corregido' })).toBeInTheDocument()
  expect(screen.getByText('Rechazada')).toBeInTheDocument()
  const body = JSON.parse(api.calls.find(c => c.method === 'POST')!.init.body as string)
  expect(body).toMatchObject({ sourceRequestId: source.id, name: 'Equipo corregido', requestNote: 'Motivos ampliados', familyId: 'f1', stageCode: 'D06', networkCodes: ['FUR-PTE'], serialNumber: 'SN-1', criticality: 'HIGH', status: 'OPERATIVE', isPublic: false, specifications: { power: '150', enabled: false, speed: { min: 0, max: 10 } }, components: ['Motor 1'] })
  expect(body).not.toHaveProperty('assetModelId')
  expect(api.calls.filter(c => c.method !== 'GET')).toHaveLength(1)
  expect(source).toEqual(original)
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
