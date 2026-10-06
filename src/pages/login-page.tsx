import { Navigate } from 'react-router-dom'
import { AuthForm } from '@/components/auth-form'
import { useAuth } from '@/features/auth/auth-context'

export function LoginPage() {
  const { status } = useAuth()
  if (status === 'authenticated') return <Navigate to="/" replace />

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-fur-navy-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-fur-gold-500 font-extrabold text-fur-navy-950">FUR</span>
          <span className="text-lg font-bold">Ecosistema FUR</span>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold tracking-widest text-fur-gold-400 uppercase">Panel de Planta</p>
          <h1 className="max-w-md text-4xl leading-tight font-bold">Toda la operación de tu planta de beneficio, en un solo tablero.</h1>
          <p className="mt-4 max-w-md text-white/70">Órdenes de trabajo, inventario, compras, presupuestos y documentos con indicadores en tiempo real.</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full border-[28px] border-fur-gold-500/15" />
      </aside>
      <main className="grid place-items-center bg-background p-6">
        <AuthForm subtitle="Usa tu cuenta del ecosistema." registerSubtitle="Una cuenta para todo el ecosistema. Después pedirás acceso a tu planta." />
      </main>
    </div>
  )
}
