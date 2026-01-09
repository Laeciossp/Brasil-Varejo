/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0046be',    // O Azul clássico
          darkBlue: '#001e73', // Azul escuro do hover
          yellow: '#fff200',   // Amarelo dos botões/destaques
          gray: '#f0f2f4'      // Fundo cinza claro
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Fonte limpa estilo e-commerce
      }
    },
  },
  plugins: [],
}