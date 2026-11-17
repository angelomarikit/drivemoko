import { Upload } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'

type Props = {
  label: string
  accept: string
  disabled?: boolean
  multiple?: boolean
  onPick: (file: File) => void
  variant?: 'primary' | 'outline' | 'soft'
}

export function FileUploadButton({ label, accept, disabled, multiple, onPick, variant = 'outline' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const files = event.target.files
          if (!files?.length) return
          for (const file of files) onPick(file)
          event.target.value = ''
        }}
      />
      <Button type="button" variant={variant} disabled={disabled} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" />
        {label}
      </Button>
    </>
  )
}