'use client'
import { useEffect, useRef, useState } from 'react'

interface YieldCounterProps {
  currentYield: number
  ratePerSecond: number
  className?: string
}

export function YieldCounter({ currentYield, ratePerSecond, className = '' }: YieldCounterProps) {
  const [display, setDisplay] = useState(currentYield)
  const rafRef  = useRef<number | null>(null)
  const lastRef = useRef<number>(Date.now())
  const baseRef = useRef<number>(currentYield)

  useEffect(() => {
    baseRef.current = currentYield
    lastRef.current = Date.now()
  }, [currentYield])

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const elapsed = (now - lastRef.current) / 1000
      setDisplay(baseRef.current + ratePerSecond * elapsed)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [ratePerSecond])

  return (
    <span className={`tabular-nums ${className}`}>
      ${display.toFixed(6)}
    </span>
  )
}
