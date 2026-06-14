import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'cacao-mazorca': '#9CCC3C',
        'kuma-dorado': '#F2B705',
        'cacao-fresco': '#C17817',
        'cacao-tostado': '#5A3A22',
        'cacao-oscuro': '#3B1A0A',
        'verde-natural': '#2D6A4F',
        'blanco-cacao': '#FDF6EC',
        'acento-digital': '#00E5FF',
      },
    },
  },
  plugins: [],
}

export default config
