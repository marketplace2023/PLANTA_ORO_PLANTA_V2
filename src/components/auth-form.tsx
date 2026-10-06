import { LogIn, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api'

type Mode = 'login' | 'register'

/**
 * Inicio de sesión y creación de cuenta. La cuenta es única para todo el ecosistema: la misma credencial entra a todos los
 * portales. Crear una cuenta no da acceso a nada por sí sola: cada portal pide después su propio registro y el administrador
 * del ecosistema lo aprueba.
 */
export function AuthForm({ subtitle, registerSubtitle }: { subtitle: string; registerSubtitle: string }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const registering = mode === 'register'

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (registering) await register({ email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim() })
      else await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setError('Demasiados intentos. Espera un minuto e intenta de nuevo.')
      else if (registering && err instanceof ApiError && err.status === 409) setError('Ya existe una cuenta con ese correo. Inicia sesión con ella: sirve para todos los portales.')
      else if (registering && err instanceof ApiError && err.status === 400) setError(err.fieldErrors.length > 0 ? err.fieldErrors.map((f) => f.message).join(' · ') : err.message)
      else if (!registering && err instanceof ApiError && err.status === 401) setError('Correo o contraseña incorrectos.')
      else setError(registering ? 'No se pudo crear la cuenta. Verifica que la API esté en línea.' : 'No se pudo iniciar sesión. Verifica que la API esté en línea.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-5" aria-label={registering ? 'Crear cuenta' : 'Iniciar sesión'}>
      <div>
        <h2 className="text-2xl font-bold text-fur-navy-900">{registering ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
        <p className="text-sm text-muted-foreground">{registering ? registerSubtitle : subtitle}</p>
      </div>
      {registering && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">Nombre</Label>
            <Input id="firstName" autoComplete="given-name" required maxLength={100} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Apellido</Label>
            <Input id="lastName" autoComplete="family-name" required maxLength={100} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete={registering ? 'new-password' : 'current-password'}
          required
          minLength={registering ? 10 : undefined}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={registering ? 'password-hint' : undefined}
        />
        {registering && <p id="password-hint" className="text-xs text-muted-foreground">Mínimo 10 caracteres.</p>}
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-fur-red-500/40 bg-fur-red-500/10 px-3 py-2 text-sm text-fur-red-500">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {registering ? <UserPlus /> : <LogIn />} {registering ? (busy ? 'Creando cuenta…' : 'Crear cuenta') : busy ? 'Entrando…' : 'Entrar'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {registering ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
        <button type="button" className="font-semibold text-fur-navy-900 underline underline-offset-2" onClick={() => switchMode(registering ? 'login' : 'register')}>
          {registering ? 'Inicia sesión' : 'Crea una'}
        </button>
      </p>
      {registering && <p className="text-center text-xs text-muted-foreground">Tu cuenta sirve para todos los portales del ecosistema FUR. El administrador aprueba el acceso de cada uno.</p>}
    </form>
  )
}
