import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Shell } from '@/components/shell'
import { Loading, Panel } from '@/components/kit'
import { useAuth } from '@/features/auth/auth-context'
import { usePlant } from '@/features/plant/plant-context'
import { usePlantDetail } from '@/features/plant/use-plant-data'
import { ApuEditorPage } from '@/pages/apu-editor-page'
import { AssetsPage } from '@/pages/assets-page'
import { BudgetEditorPage } from '@/pages/budget-editor-page'
import { BudgetsPage } from '@/pages/budgets-page'
import { DocumentsPage } from '@/pages/documents-page'
import { InventoryPage } from '@/pages/inventory-page'
import { LoginPage } from '@/pages/login-page'
import { MaintenancePage } from '@/pages/maintenance-page'
import { OverviewPage } from '@/pages/overview-page'
import { ProcessesPage } from '@/pages/processes-page'
import { ProcurementPage } from '@/pages/procurement-page'
import { TeamPage } from '@/pages/team-page'

/** `/` → la última planta usada (o la primera visible). Sin sesión, al login. */
function Home() {
  const { status, access } = useAuth()
  const { currentPlant, availablePlants, isLoadingPlants } = usePlant()
  if (status === 'loading' || isLoadingPlants) return <div className="p-8"><Loading rows={4} /></div>
  if (status === 'anonymous') return <Navigate to="/login" replace />
  const mine = availablePlants.find((p) => access.some((a) => a.plantId === p.id))
  const target = currentPlant ?? mine ?? availablePlants[0]
  if (!target) {
    return (
      <div className="mx-auto max-w-md p-8">
        <Panel title="Sin plantas asignadas">
          <p className="text-sm text-muted-foreground">Tu usuario todavía no tiene acceso a ninguna planta. Pide a un administrador que te asigne una.</p>
        </Panel>
      </div>
    )
  }
  return <Navigate to={`/plants/${target.slug}/dashboard`} replace />
}

/** Exige sesión y una planta existente y visible antes de pintar el marco del panel. */
function PlantArea() {
  const { status } = useAuth()
  const { plantSlug } = useParams()
  const { availablePlants, isLoadingPlants, currentPlant, selectPlant } = usePlant()
  const detail = usePlantDetail(currentPlant ? plantSlug : undefined)
  if (status === 'loading' || isLoadingPlants) return <div className="p-8"><Loading rows={4} /></div>
  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (!currentPlant) {
    return (
      <div className="mx-auto max-w-md p-8">
        <Panel title="Planta no encontrada">
          <p className="mb-3 text-sm text-muted-foreground">No existe una planta «{plantSlug}» o no tienes acceso a ella.</p>
          <ul className="space-y-1 text-sm">
            {availablePlants.map((p) => (
              <li key={p.id}>
                <a className="font-semibold text-fur-navy-900 underline" href={`/plants/${p.slug}/dashboard`} onClick={() => selectPlant(p.id)}>
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    )
  }
  if (detail.isLoading) return <div className="p-8"><Loading rows={4} /></div>
  return <Shell context={detail.data} />
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route index element={<Home />} />
      <Route path="plants/:plantSlug" element={<PlantArea />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<OverviewPage />} />
        <Route path="processes" element={<ProcessesPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="procurement" element={<ProcurementPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="budgets/apus/:apuId" element={<ApuEditorPage />} />
        <Route path="budgets/:budgetId" element={<BudgetEditorPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="team" element={<TeamPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
