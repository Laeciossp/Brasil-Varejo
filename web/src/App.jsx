import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

// --- COMPONENTES DE LAYOUT ---
import Header from './components/Header';
import Footer from './components/Footer';

// --- PÁGINAS ---
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import CategoryPage from './pages/CategoryPage'; 
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Success from './pages/Success';
import Favorites from './pages/Favorites';

// Páginas Institucionais
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f2f2f2] font-sans text-gray-900">
      
      <Header />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          
          {/* --- SOLUÇÃO DO PROBLEMA DE ROTA --- */}
          {/* Mantemos as duas opções ativas para garantir que o link funcione 
              tanto se vier do Sanity (Inglês) quanto se digitado (Português) */}
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          
          <Route path="/cart" element={<Cart />} />
          <Route path="/favoritos" element={<Favorites />} />

          {/* ROTAS INSTITUCIONAIS */}
          <Route path="/sobre" element={<About />} />
          <Route path="/termos-de-uso" element={<Terms />} />
          <Route path="/politica-de-privacidade" element={<Privacy />} />

          {/* ROTA PROTEGIDA */}
          <Route 
            path="/profile" 
            element={
              <>
                <SignedIn>
                  <Profile />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            } 
          />

          <Route path="/sucesso" element={<Success />} />
          
          {/* Se a rota não existir, volta para a Home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <Footer />
      
    </div>
  );
}

export default App;