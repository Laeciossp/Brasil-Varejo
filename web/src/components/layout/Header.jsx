import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, Menu, User } from 'lucide-react';
import useCartStore from '../../store/useCartStore';
import MegaMenu from './MegaMenu';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const totalItems = useCartStore((state) => state.getItemsCount());

  return (
    <>
      <header className="bg-brand-blue text-white sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          
          {/* 1. Logo e Menu */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-1 font-bold text-lg hover:text-brand-yellow transition-colors"
              aria-label="Abrir menu de departamentos"
            >
              <Menu className="w-8 h-8" />
              <span className="hidden md:inline">Menu</span>
            </button>
            
            <Link to="/" className="text-2xl font-bold tracking-tighter flex flex-col leading-none">
              <span>Mercado</span>
              <span className="text-brand-yellow">Solar</span>
            </Link>
          </div>

          {/* 2. Barra de Busca Gigante (Desktop) */}
          <div className="flex-1 max-w-3xl hidden md:block relative">
            <div className="relative group">
              <input 
                type="text" 
                placeholder="O que você procura hoje?" 
                className="w-full h-10 pl-4 pr-12 rounded-full text-gray-900 border-0 focus:ring-2 focus:ring-brand-yellow outline-none transition-shadow"
              />
              <button className="absolute right-0 top-0 h-10 w-12 flex items-center justify-center text-brand-blue bg-gray-100 rounded-r-full hover:bg-brand-yellow transition-colors">
                <Search className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* 3. Ações (Conta e Carrinho) */}
          <div className="flex items-center gap-6">
            <Link to="/profile" className="flex items-center gap-2 hover:text-gray-200 transition-opacity">
              <User className="w-7 h-7" />
              <div className="hidden lg:block leading-tight text-sm">
                <p className="font-normal text-xs opacity-90">Olá, Visitante</p>
                <p className="font-bold">Minha Conta</p>
              </div>
            </Link>

            <Link to="/cart" className="flex items-center gap-2 hover:text-brand-yellow transition-colors relative">
              <div className="relative">
                <ShoppingCart className="w-8 h-8" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand-yellow text-brand-blue text-xs font-extrabold h-5 w-5 rounded-full flex items-center justify-center shadow-sm">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="font-bold text-lg hidden sm:block">Carrinho</span>
            </Link>
          </div>

        </div>
        
        {/* Busca Mobile (Aparece só no celular) */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar produtos..." 
              className="w-full h-10 pl-4 pr-10 rounded-full text-gray-900 outline-none"
            />
            <button className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-brand-blue">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* O Menu Cascata fica "fora" do header, mas é controlado por ele */}
      <MegaMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
};

export default Header;