import type { ReactNode } from 'react'
import { ScreenHeader } from '@/components/kit'

/** Compatibilidad con las pantallas de edición portadas: mismo encabezado que el resto del panel. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <ScreenHeader title={title} description={description} actions={actions} />
}
