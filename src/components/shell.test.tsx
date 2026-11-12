import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { Shell } from './shell'

vi.mock('@/features/auth/auth-context', () => ({ useAuth: () => ({ user: null, logout: vi.fn() }) }))
vi.mock('@/features/plant/plant-context', () => ({ usePlant: () => ({ currentPlant: { slug: 'revemin-ii', code: 'REV', name: 'REVEMIN II' }, availablePlants: [], permissions: [], roleCodes: [] }) }))

beforeEach(() => localStorage.clear())
describe('Navegación del panel de planta', () => {
  it('pliega la barra, conserva las rutas y guarda la preferencia', () => {
    const { container } = renderWithProviders(<Shell />)
    fireEvent.click(screen.getByRole('button', { name: 'Contraer navegación' }))
    expect(container.querySelector('.studio-shell')).toHaveAttribute('data-collapsed', 'true')
    expect(localStorage.getItem('fur-sidebar-collapsed')).toBe('true')
    expect(screen.getByRole('link', { name: 'Activos' })).toHaveAttribute('href', '/plants/revemin-ii/assets')
    fireEvent.click(screen.getByRole('button', { name: 'Expandir navegación' }))
    expect(container.querySelector('.studio-shell')).toHaveAttribute('data-collapsed', 'false')
  })
  it('recupera la preferencia al abrir el panel', () => {
    localStorage.setItem('fur-sidebar-collapsed', 'true')
    renderWithProviders(<Shell />)
    expect(screen.getByRole('button', { name: 'Expandir navegación' })).toHaveAttribute('aria-expanded', 'false')
  })
})
