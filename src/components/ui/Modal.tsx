import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#071833]/55 backdrop-blur-[1px]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(560px,calc(100%-1.25rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl',
            wide && 'w-[min(920px,calc(100%-1.25rem))]',
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-bold text-ink">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-canvas" aria-label="Close">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
