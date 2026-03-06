import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-primary': '#0D0D1A',
        'bg-card': '#1A1A2E',
        'bg-elevated': '#252540',
        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0B8',
        'text-tertiary': '#8888A0',
        'text-disabled': '#4A4A5A',
        // Accents
        'accent-primary': '#FFB84D',
        'accent-secondary': '#7B68EE',
        'accent-boost': '#00E5A0',
        'accent-danger': '#FF6B6B',
        // Borders
        'border-default': '#2A2A3A',
        'border-inactive': '#3A3A4A',
        'border-expired': '#4A4A5A',
        // Markers
        'marker-out-range': '#5A5A70',
        // Gold shimmer stops
        'gold-1': '#FFD700',
        'gold-2': '#FFA500',
        'gold-3': '#FFE066',
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-lg': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-md': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        heading: ['20px', { lineHeight: '1.2', fontWeight: '700' }],
        'body-lg': ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        'body-md': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        label: ['14px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '48px',
      },
      borderRadius: {
        circle: '50%',
        pill: '9999px',
        card: '16px',
        button: '12px',
        input: '8px',
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.3)',
        elevated: '0 8px 24px rgba(0,0,0,0.4)',
        button: '0 2px 8px rgba(0,0,0,0.2)',
        'glow-gold': '0 0 16px rgba(255,215,0,0.4)',
        'glow-accent': '0 0 12px rgba(123,104,238,0.3)',
      },
      keyframes: {
        'gold-shimmer': {
          '0%':   { borderColor: '#FFD700', boxShadow: '0 0 8px rgba(255,215,0,0.3)' },
          '33%':  { borderColor: '#FFA500', boxShadow: '0 0 12px rgba(255,165,0,0.4)' },
          '66%':  { borderColor: '#FFE066', boxShadow: '0 0 8px rgba(255,224,102,0.3)' },
          '100%': { borderColor: '#FFD700', boxShadow: '0 0 8px rgba(255,215,0,0.3)' },
        },
        'rainbow-border': {
          '0%':   { borderColor: '#FF6B6B' },
          '16%':  { borderColor: '#FFB84D' },
          '33%':  { borderColor: '#FFE066' },
          '50%':  { borderColor: '#00E5A0' },
          '66%':  { borderColor: '#7B68EE' },
          '83%':  { borderColor: '#FF6BA0' },
          '100%': { borderColor: '#FF6B6B' },
        },
        'proximity-pulse': {
          '0%':   { transform: 'scale(0.5)', opacity: '0.4' },
          '100%': { transform: 'scale(2.0)', opacity: '0' },
        },
        'marker-pulse': {
          '0%':   { transform: 'scale(1.2)' },
          '50%':  { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1.2)' },
        },
        'accent-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,184,77,0.4)' },
          '50%':       { boxShadow: '0 0 0 8px rgba(255,184,77,0)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'slide-right': {
          '0%':   { transform: 'translateX(0)',    opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1.0)', opacity: '1' },
        },
        'spin-claim': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(1080deg)' },
        },
        'bounce-claim': {
          '0%':   { transform: 'scale(1.0)' },
          '50%':  { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1.0)' },
        },
        'menu-item-in': {
          '0%':   { transform: 'scale(0.8) translateY(8px)', opacity: '0' },
          '100%': { transform: 'scale(1.0) translateY(0)',   opacity: '1' },
        },
        'screen-flash': {
          '0%':   { opacity: '0' },
          '20%':  { opacity: '0.3' },
          '100%': { opacity: '0' },
        },
        'counter-tick': {
          '0%':   { transform: 'translateY(0)' },
          '50%':  { transform: 'translateY(-2px)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'gold-shimmer':   'gold-shimmer 3s linear infinite',
        'rainbow-border': 'rainbow-border 4s linear infinite',
        'proximity-pulse':'proximity-pulse 2s ease-out infinite',
        'marker-pulse':   'marker-pulse 1.5s ease-in-out infinite',
        'accent-pulse':   'accent-pulse 2s ease-in-out infinite',
        'slide-up':       'slide-up 300ms ease-out forwards',
        'fade-in':        'fade-in 250ms ease-in-out forwards',
        'scale-in':       'scale-in 200ms ease-out forwards',
        'spin-claim':     'spin-claim 2000ms cubic-bezier(0.2,0.8,0.2,1) forwards',
        'bounce-claim':   'bounce-claim 300ms cubic-bezier(0.68,-0.55,0.27,1.55) forwards',
        'menu-item-in':   'menu-item-in 200ms ease-out forwards',
        'screen-flash':   'screen-flash 600ms ease-out forwards',
      },
      maxWidth: {
        mobile: '480px',
      },
    },
  },
  plugins: [],
}

export default config
