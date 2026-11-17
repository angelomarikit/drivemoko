import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent text-sm font-semibold leading-5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-gold text-ink hover:bg-gold-2',
        navy: 'bg-navy text-white hover:bg-navy-2',
        outline: 'border-line bg-white text-ink hover:bg-canvas',
        ghost: 'text-ink hover:bg-black/5',
        danger: 'bg-danger text-white hover:bg-red-600',
        soft: 'bg-canvas text-ink hover:bg-line',
      },
      size: {
        sm: 'min-h-9 px-3 py-2',
        md: 'min-h-11 px-4 py-2.5',
        lg: 'min-h-12 px-5 py-3',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
