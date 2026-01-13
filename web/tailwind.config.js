/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // A Base Profissional (Confiança e Contraste)
        brand: {
           blue: '#0086ff',     // Azul original
           dark: '#1e293b',     // Texto Escuro
        },
        // A Inspiração Crocus (Originalidade e Sofisticação)
        crocus: {
           deep: '#4C1D95',     // Violeta para Headers e Banners
           vivid: '#7C3AED',    // Roxo vibrante para ícones e hovers
           light: '#DDD6FE',    // Lilás suave para fundos
           stamen: '#FF8C00',   // Laranja para botões de COMPRAR/AÇÃO
        },
        // Fundo do Site (Off-white de luxo)
        surface: {
           primary: '#f8fafc',  // Slate 50
           secondary: '#f1f5f9' // Slate 100
        },
        // Branco puro para os "cards" de produto
        'petal-white': '#ffffff'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Uma sombra roxa suave e luxuosa para os cards
        'crocus': '0 10px 25px -5px rgba(124, 58, 237, 0.15), 0 8px 10px -6px rgba(124, 58, 237, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [
    // Plugin necessário para estilizar o conteúdo HTML das descrições
    require('@tailwindcss/typography'),
  ],
}