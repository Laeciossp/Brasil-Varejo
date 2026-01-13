// ARQUIVO: src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import './index.css' 
// 👇 Importação nova
import { ZipCodeProvider } from './context/ZipCodeContext.jsx'

// Agora o sistema busca a chave nas variáveis de ambiente do seu PC/Vercel
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Erro: Variável VITE_CLERK_PUBLISHABLE_KEY não encontrada no arquivo .env")
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      {/* 👇 O Provider envolve tudo aqui */}
      <ZipCodeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ZipCodeProvider>
    </ClerkProvider>
  </React.StrictMode>,
)