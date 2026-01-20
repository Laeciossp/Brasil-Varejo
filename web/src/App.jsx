import React, { useEffect } from 'react'; 
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'; 
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

// 👇 IMPORTANTE: Importar a nova página de Marcas
import BrandPage from './pages/BrandPage';

// Páginas Institucionais
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Policies from './pages/Policies';

function App() {
  const { pathname } = useLocation();

  // Faz o scroll voltar ao topo sempre que mudar de página
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f2f2] font-sans text-gray-900">
      
      <Header />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          
          {/* Rotas de Produto (Inglês e Português) */}
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/produto/:slug" element={<ProductDetails />} />
          
          {/* Rotas de Categoria */}
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          
          {/* 👇 NOVA ROTA DE MARCAS AQUI */}
          <Route path="/marca/:brandName" element={<BrandPage />} />

          {/* Funcionalidades */}
          <Route path="/busca" element={<SearchPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/favoritos" element={<Favorites />} />

          {/* Páginas Institucionais */}
          <Route path="/sobre" element={<About />} />
          <Route path="/termos-de-uso" element={<Terms />} />
          <Route path="/politica-de-privacidade" element={<Privacy />} />
          <Route path="/politicas" element={<Policies />} />

          {/* Perfil do Usuário (Protegido pelo Clerk) */}
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
          
          {/* Redireciona qualquer página não encontrada para a Home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <Footer />
      
    </div>
  );
}

export default App;