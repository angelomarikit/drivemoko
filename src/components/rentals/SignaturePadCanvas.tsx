import SignaturePad from 'signature_pad'
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'

export type SignaturePadHandle = {
  isEmpty: () => boolean
  clear: () => void
  toDataURL: () => string
}

type Props = {
  active: boolean
}

function sizeCanvas(canvas: HTMLCanvasElement) {
  const box = canvas.parentElement
  if (!box) return 0
  const width = box.clientWidth
  const height = box.clientHeight
  if (width < 8 || height < 8) return 0

  const ratio = Math.max(window.devicePixelRatio ?? 1, 1)
  canvas.width = Math.floor(width * ratio)
  canvas.height = Math.floor(height * ratio)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return 0
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(ratio, ratio)
  return width
}

export const SignaturePadCanvas = forwardRef<SignaturePadHandle, Props>(function SignaturePadCanvas(
  { active },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)

  useLayoutEffect(() => {
    if (!active) {
      padRef.current?.off()
      padRef.current = null
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let attempts = 0

    const mount = () => {
      if (cancelled) return
      const sized = sizeCanvas(canvas)
      if (!sized) {
        if (attempts++ < 30) {
          requestAnimationFrame(mount)
        }
        return
      }

      padRef.current?.off()
      padRef.current = new SignaturePad(canvas, {
        penColor: '#0f172a',
        backgroundColor: 'rgb(248, 250, 252)',
        minWidth: 1.2,
        maxWidth: 3.5,
        throttle: 8,
        minDistance: 2,
      })
    }

    mount()

    return () => {
      cancelled = true
      padRef.current?.off()
      padRef.current = null
    }
  }, [active])

  useImperativeHandle(
    ref,
    () => ({
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      clear: () => padRef.current?.clear(),
      toDataURL: () => padRef.current?.toDataURL('image/png') ?? '',
    }),
    [],
  )

  return (
    <div
      className="h-36 w-full min-h-[144px] bg-slate-50"
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        aria-label="Signature pad"
      />
    </div>
  )
})