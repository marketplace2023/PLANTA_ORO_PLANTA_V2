import { CheckCircle2, TrendingUp, Wallet } from 'lucide-react'
import { ApusView } from '@/components/budget/apus-view'
import { BudgetsView } from '@/components/budget/budgets-view'
import { ResourcesView } from '@/components/budget/resources-view'
import { Gate, Kpi, ScreenHeader, Segmented } from '@/components/kit'
import { usePlantAccess } from '@/components/use-plant-access'
import { useBudgetSummary } from '@/features/budget/use-budget'
import { formatMoney, formatPct } from '@/lib/format'
import { useUrlFilters } from '@/lib/use-url-filters'

type Tab = 'budgets' | 'apus' | 'resources'
const TABS: Tab[] = ['budgets', 'apus', 'resources']

/** Presupuestos (LULO): indicadores arriba y, debajo, presupuestos, APU y libro de precios con alta y edición. */
export function BudgetsPage() {
  const { slug, can } = usePlantAccess()
  const allowed = can('budget.read')
  const summary = useBudgetSummary(slug, allowed)
  const { params, filters, setParam } = useUrlFilters(['tab'])
  const tab = (TABS.find((t) => t === params.get('tab')) ?? 'budgets') as Tab
  const s = summary.data
  const cur = s?.baseCurrency ?? 'USD'
  const drift = s?.priceDriftDirect ?? 0

  return (
    <>
      <ScreenHeader title="Presupuestos" description="Presupuestos con capítulos y partidas, análisis de precios unitarios (APU), libro de precios y valorizaciones." />
      <Gate allowed={allowed} module="Presupuestos">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Aprobado" value={s ? formatMoney(s.approvedTotal, cur) : '—'} icon={Wallet} hint={s ? `Directo ${formatMoney(s.approvedDirect, cur)}` : undefined} />
          <Kpi label="Ejecutado" value={s ? formatMoney(s.executedTotal, cur) : '—'} icon={TrendingUp} hint={s ? `Directo ${formatMoney(s.executedDirect, cur)}` : undefined} />
          <Kpi label="Avance" value={formatPct(s?.progressPct)} icon={CheckCircle2} hint="Valorizado sobre costo directo aprobado" />
          <Kpi label="Desviación de precios" value={s ? formatMoney(drift, cur) : '—'} icon={TrendingUp} tone={drift > 0 ? 'warning' : 'ok'} hint={drift > 0 ? 'Precios vigentes sobre lo congelado' : 'Sin desviación'} />
        </div>

        <div className="mt-6">
          <Segmented<Tab>
            label="Sección"
            value={tab}
            // Cambiar de pestaña descarta los filtros de la anterior.
            onChange={(t) => setParam({ tab: t, status: undefined, type: undefined, search: undefined, page: undefined, projectId: undefined }, true)}
            options={[
              { value: 'budgets', label: 'Presupuestos', count: s?.budgetCount },
              { value: 'apus', label: 'APU', count: s?.apuCount },
              { value: 'resources', label: 'Recursos y precios', count: s?.resourceCount },
            ]}
          />
        </div>

        <div className="mt-3">
          {tab === 'budgets' && <BudgetsView slug={slug} filters={filters} setFilters={setParam} />}
          {tab === 'apus' && <ApusView slug={slug} filters={filters} setFilters={setParam} />}
          {tab === 'resources' && <ResourcesView slug={slug} filters={filters} setFilters={setParam} />}
        </div>
      </Gate>
    </>
  )
}
