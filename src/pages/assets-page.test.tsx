import { afterEach, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { mockApi } from '@/test/fetch-mock'
import { asset, fur, page } from '@/test/assets-fixtures'
import { AssetsPage } from './assets-page'

vi.mock('@/components/use-plant-access', () => ({
  usePlantAccess: () => ({ slug: 'revemin-ii', can: () => false }),
}))

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('permite consultar y cerrar la ficha del activo sin permisos de edición, con sus datos propios', async () => {
  const api = mockApi({
    'GET /plants/revemin-ii/process': { body: { stages: [], totals: { assets: 1 } } },
    'GET /plants/revemin-ii/assets': { body: page([asset()]) },
    'GET /plants/revemin-ii/assets/a1/fur': { body: fur({}, {
      family: { id: 'f1', code: 'MOLINOS', name: 'Molinos' },
      specifications: { powerKw: 125, enabled: false, speed: { min: 0, max: 10 } },
      technicalData: { componentes: ['Motor instalado', 'Transmisión propia'] },
      referenceModels: [{ id: 'm1', modelName: 'Modelo orientativo', catalogTag: 'CAT-001' }],
    }) },
    'GET /catalog/specifications': { body: [{ key: 'powerKw', label: 'Potencia', unit: 'kW' }] },
  })
  renderWithProviders(<AssetsPage />)
  const button = await screen.findByRole('button', { name: 'Ver ficha de MB-301' })
  expect(screen.queryByRole('button', { name: /Acciones de/ })).not.toBeInTheDocument()
  expect(api.count('GET /plants/revemin-ii/assets/a1/fur')).toBe(0)
  await userEvent.click(button)
  const dialog = within(await screen.findByRole('dialog', { name: 'Ficha del activo de planta' }))
  expect(await dialog.findByText('Motor instalado')).toBeInTheDocument()
  expect(await dialog.findByText('Potencia (kW)')).toBeInTheDocument()
  expect(dialog.getByText('125')).toBeInTheDocument()
  expect(dialog.getByText('No')).toBeInTheDocument()
  expect(dialog.getByText('0 – 10')).toBeInTheDocument()
  expect(dialog.getByText('CAT-001 · Modelo orientativo')).toBeInTheDocument()
  expect(dialog.getByText('SN-0001')).toBeInTheDocument()
  await userEvent.click(dialog.getByRole('button', { name: 'Cerrar ficha' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(api.calls.every(call => call.method === 'GET')).toBe(true)
})

it('muestra un error recuperable y los estados vacíos de una ficha sin datos técnicos', async () => {
  let failed = true
  mockApi({
    'GET /plants/revemin-ii/process': { body: { stages: [] } },
    'GET /plants/revemin-ii/assets': { body: page([asset()]) },
    'GET /plants/revemin-ii/assets/a1/fur': () => failed
      ? { status: 500, body: { message: 'Error' } }
      : { body: fur({}, { specifications: {}, technicalData: {}, serialNumber: null, referenceModels: [] }) },
  })
  renderWithProviders(<AssetsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Ver ficha de MB-301' }))
  const retry = await screen.findByRole('button', { name: /Reintentar/ })
  failed = false
  await userEvent.click(retry)
  expect(await screen.findByText('Sin especificaciones registradas.')).toBeInTheDocument()
  expect(screen.getByText('Sin componentes registrados.')).toBeInTheDocument()
  expect(screen.getByText('Sin modelos de referencia vinculados.')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
