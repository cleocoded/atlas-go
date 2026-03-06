'use client'
import { ButtonHTMLAttributes, ReactNode } from 'react'
import { ButtonState } from '@/types'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  state?: ButtonState
  fullWidth?: boolean
  children: ReactNode
}

const SPINNER = (
  <svg
    className="animate-spin h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
)

export function Button({
  variant = 'primary',
  size = 'lg',
  state = 'default',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || state === 'disabled' || state === 'loading'

  const base =
    'inline-flex items-center justify-center gap-2 font-nunito font-semibold rounded-button transition-all duration-[120ms] ease-out active:scale-[0.97] shadow-button select-none'

  const variants = {
    primary: 'bg-accent-primary text-bg-primary',
    secondary: 'bg-bg-elevated text-text-primary',
    danger: 'bg-accent-danger text-white',
    ghost: 'bg-transparent text-text-secondary border border-border-inactive',
  }

  const sizes = {
    sm: 'h-8 px-4 text-sm',
    md: 'h-12 px-6 text-label',
    lg: 'h-14 px-6 text-label',
  }

  const disabledStyles = isDisabled ? 'opacity-50 pointer-events-none' : ''
  const pulseStyle = state === 'default' && variant === 'primary' ? '' : ''
  const width = fullWidth ? 'w-full' : ''

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${pulseStyle} ${width} ${className}`}
    >
      {state === 'loading' ? SPINNER : null}
      {children}
    </button>
  )
}
