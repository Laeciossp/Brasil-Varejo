import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

import Header from './components/Header';
import Footer from './components/Footer';

import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import CategoryPage from './pages/CategoryPage'; 
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Success from './pages/Success';
import Favorites from './pages/Favorites';
import SearchPage from './pages/SearchPage';

// Páginas Institucionais
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Policies from './pages/Policies'; // <--- 1. IMPORT NOVO

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f2f2f2] font-sans text-gray-900">
      
      <Header />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          
          <Route path="/busca" element={<SearchPage />} />

          <Route path="/cart" element={<Cart />} />
          <Route path="/favoritos" element={<Favorites />} />

          <Route path="/sobre" element={<About />} />
          <Route path="/termos-de-uso" element={<Terms />} />
          <Route path="/politica-de-privacidade" element={<Privacy />} />
          
          {/* 2. ROTA NOVA ADICIONADA AQUI */}
          <Route path="/politicas" element={<Policies />} />

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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <Footer />
      
    </div>
  );
}

export default App;