import { WorkspacePreview } from '@/components/workspace-preview'
import { BrandLogo } from '@/components/brand-logo'
import { Navigate } from 'react-router-dom'
import { AuthForm } from '@/components/auth-form'
import { useAuth } from '@/features/auth/auth-context'

export function LoginPage() {
  const { status } = useAuth()
  if (status === 'authenticated') return <Navigate to="/" replace />

  return (
    <div className="login-shell grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="login-visual relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div className="login-brand"><BrandLogo /></div>
        <div>
          <p className="mb-3 text-sm font-semibold tracking-widest text-fur-gold-400 uppercase">Panel de Planta</p>
          <h1 className="max-w-md text-4xl leading-tight font-bold">Toda la operación de tu planta de beneficio, en un solo tablero.</h1>
          <p className="mt-4 max-w-md text-white/70">Órdenes de trabajo, inventario, compras, presupuestos y documentos con indicadores en tiempo real.</p>
        </div>
        <WorkspacePreview mode="plant" />
      </aside>
      <main className="login-main grid place-items-center p-6">
        <div className="login-content">
          <div className="login-mobile-brand lg:hidden"><BrandLogo /></div>
          <AuthForm subtitle="Usa tu cuenta del ecosistema." registerSubtitle="Una cuenta para todo el ecosistema. Después pedirás acceso a tu planta." />
        </div>
      </main>
    </div>
  )
}
