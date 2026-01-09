import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Importando os Layouts
import Header from './components/layout/Header';

// Importando as Páginas REAIS (que criamos nos passos anteriores)
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Category from './pages/Category';
import Cart from './pages/Cart';
import Profile from './pages/Profile'; // Aqui está a tela de Meus Pedidos/Rastreio

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
        {/* Header fixo no topo (inclui o Menu Cascata) */}
        <Header />
        
        {/* Conteúdo Principal */}
        <main className="flex-1">
          <Routes>
            {/* 1. Home (Vitrine) */}
            <Route path="/" element={<Home />} />
            
            {/* 2. Página de Produto (Clone Best Buy) */}
            <Route path="/product/:slug" element={<ProductDetails />} />
            
            {/* 3. Página de Categoria (Listagem) */}
            <Route path="/category/:slug" element={<Category />} />
            
            {/* 4. Carrinho de Compras */}
            <Route path="/cart" element={<Cart />} />
            
            {/* 5. Área do Cliente (Rastreio e Status) */}
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>

        {/* Rodapé Simples (Opcional, para fechar o layout) */}
        <footer className="bg-gray-100 py-8 mt-auto border-t border-gray-200">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Mercado Solar. Todos os direitos reservados.</p>
            <p className="mt-2">CNPJ: 00.000.000/0001-00</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;