import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { LuloPlantBudgets } from './lulo-pages'

const state = vi.hoisted(() => ({ permitted: true }))
vi.mock('@/components/use-plant-access', () => ({ usePlantAccess: () => ({ slug: 'revemin-ii', plant: { id: 'p1', slug: 'revemin-ii', name: 'REVEMIN II' }, can: () => state.permitted }) }))
afterEach(() => { state.permitted = true; vi.unstubAllGlobals() })
describe('LULO en el panel de planta 5174', () => {
  it('opens original master sections and plant budgets in the actual plant panel', async () => {
    const mock = mockApi({ 'GET /plants/revemin-ii/lulo/masters/catalogs': { body: [] }, 'GET /plants/revemin-ii/lulo/documents': { body: { items: [{ id: 'd1', code: 'LUL-001', title: 'Presupuesto de prueba', status: 'DRAFT', version: 1, currency: 'USD', total: '100' }], total: 1 } } })
    renderWithProviders(<LuloPlantBudgets legacy={<div>Control anterior</div>} />)
    expect(await screen.findByRole('tab', { name: /Partidas maestras/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Materiales/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Equipos/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Mano de obra/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nuevo presupuesto' })).toHaveAttribute('href', '/plants/revemin-ii/budgets/new')
    await userEvent.click(screen.getByRole('button', { name: 'Mis presupuestos' }))
    expect(await screen.findByRole('link', { name: 'Presupuesto de prueba' })).toHaveAttribute('href', '/plants/revemin-ii/budgets/lulo/d1')
    expect(mock.calls.every(c => c.path.startsWith('/plants/revemin-ii/lulo/'))).toBe(true)
  })
  it('does not request or show private masters without budget permission', () => {
    state.permitted = false; const mock = mockApi({})
    renderWithProviders(<LuloPlantBudgets legacy={null} />)
    expect(screen.getByText('Sin acceso a Presupuestos')).toBeInTheDocument(); expect(mock.calls).toHaveLength(0)
  })
})
