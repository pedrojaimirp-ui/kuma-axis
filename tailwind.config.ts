import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'cacao-mazorca': '#7A9A3D',
        'kuma-dorado': '#C9A84C',
        'cacao-fresco': '#8B5E34',
        'cacao-tostado': '#5A3A22',
        'cacao-oscuro': '#3B1A0A',
        'verde-natural': '#1B4332',
        'blanco-cacao': '#FDF6EC',
        'acento-digital': '#00E5FF',
      },
    },
  },
  plugins: [],
}

export default config
