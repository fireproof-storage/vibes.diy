import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[--radius-base] text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-border shadow-[var(--shadow-shadow)]',
  {
    variants: {
      variant: {
        default:
          'bg-main text-main-foreground hover:bg-main/90 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        reverse:
          'bg-background text-foreground hover:bg-background/90 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        noShadow: 'bg-main text-main-foreground hover:bg-main/90 shadow-none',
        neutral:
          'bg-secondary-background text-foreground hover:bg-secondary-background/90 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        outline:
          'border-border bg-background hover:bg-accent hover:text-accent-foreground active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        ghost: 'hover:bg-accent hover:text-accent-foreground shadow-none border-transparent',
        link: 'text-primary underline-offset-4 hover:underline shadow-none border-transparent',

        // Neobrutalism color variants
        electric:
          'bg-yellow-300 text-black hover:bg-yellow-400 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        hot: 'bg-pink-400 text-black hover:bg-pink-300 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        cyber:
          'bg-lime-400 text-black hover:bg-lime-300 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        retro:
          'bg-orange-400 text-black hover:bg-orange-300 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        cool: 'bg-cyan-400 text-black hover:bg-cyan-300 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        dream:
          'bg-violet-400 text-black hover:bg-violet-300 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        danger:
          'bg-red-400 text-black hover:bg-red-300 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-[--radius-base] px-3',
        lg: 'h-11 rounded-[--radius-base] px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
