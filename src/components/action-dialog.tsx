import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const selectClass = 'h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/** Confirmación de una acción con nota (obligatoria u opcional) y, si hace falta, un campo extra. */
export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  noteLabel = 'Nota',
  noteRequired,
  confirmLabel,
  busy,
  extra,
  extraValid = true,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  noteLabel?: string
  noteRequired?: boolean
  confirmLabel: string
  busy?: boolean
  extra?: ReactNode
  extraValid?: boolean
  onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState('')
  const valid = extraValid && (!noteRequired || note.trim().length > 0)
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setNote('')
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">
          {extra}
          <div className="space-y-1.5">
            <Label htmlFor="action-note">
              {noteLabel}
              {noteRequired ? ' (obligatoria)' : ' (opcional)'}
            </Label>
            <Textarea id="action-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!valid || busy} onClick={() => onConfirm(note.trim())}>
            {busy ? 'Guardando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
