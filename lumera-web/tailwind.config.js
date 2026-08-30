/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FBF7F0',
        cream: '#F4EDE1',
        beige: '#EAE0CC',
        espresso: '#3D2B1F',
        espressoDark: '#2A1C13',
        charcoal: '#2B2724',
        champagne: '#C9A66B',
        champagneDark: '#B08D4F',
        gold: '#D4B483',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Jost"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 60px 10px rgba(201,166,107,0.25)',
        card: '0 10px 40px -10px rgba(61,43,31,0.18)',
        cardHover: '0 20px 55px -12px rgba(61,43,31,0.28)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        flicker: {
          '0%, 100%': { opacity: 0.9, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.04)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) both',
        flicker: 'flicker 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
