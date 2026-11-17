import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useSyncSupabaseProfileToDemo } from '@/hooks/useSyncSupabaseProfileToDemo'
import { AppRoutes } from '@/routes/AppRoutes'
import { useUiStore } from '@/stores/uiStore'

export function App() {
  useSyncSupabaseProfileToDemo()
  return (
    <>
      <AppRoutes />
      <ConfirmHost />
    </>
  )
}

function ConfirmHost() {
  const confirm = useUiStore((state) => state.confirm)
  const close = useUiStore((state) => state.closeConfirm)
  return (
    <Modal open={!!confirm} onClose={close} title={confirm?.title ?? 'Confirm'}>
      <p className="text-sm text-muted">{confirm?.message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={close}>Back</Button>
        <Button
          variant={confirm?.tone === 'danger' ? 'danger' : 'primary'}
          onClick={() => {
            confirm?.onConfirm()
            close()
          }}
        >
          {confirm?.confirmLabel ?? 'Confirm'}
        </Button>
      </div>
    </Modal>
  )
}
