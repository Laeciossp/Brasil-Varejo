import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Removi o Router aqui pois ele geralmente fica no main.jsx

// --- COMPONENTES DE LAYOUT ---
// Certifique-se que eles estão na pasta web/src/components/
import Header from './components/Header';
import Footer from './components/Footer';

// --- PÁGINAS ---
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Category from './pages/Category';
import Cart from './pages/Cart';
import Profile from './pages/Profile';

function App() {
  return (
    // A div abaixo garante que o Footer sempre vá para o final (Sticky Footer)
    <div className="flex flex-col min-h-screen bg-[#f2f2f2] font-sans text-gray-900">
      
      {/* O Header aparece em todas as telas */}
      <Header />
      
      {/* Área principal onde as páginas trocam */}
      <main className="flex-grow">
        <Routes>
          {/* 1. Home (Vitrine Estilo Magalu) */}
          <Route path="/" element={<Home />} />
          
          {/* 2. Página de Produto */}
          <Route path="/product/:slug" element={<ProductDetails />} />
          
          {/* 3. Página de Categoria/Departamento */}
          <Route path="/category/:slug" element={<Category />} />
          
          {/* 4. Carrinho de Compras */}
          <Route path="/cart" element={<Cart />} />
          
          {/* 5. Área do Cliente (Pedidos, Rastreio, SAC) */}
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>

      {/* O Footer Gigante aparece no final de tudo */}
      <Footer />
      
    </div>
  );
}

export default App;