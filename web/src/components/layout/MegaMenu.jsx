import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu as MenuIcon, X } from 'lucide-react';
import CategoryMenu from './CategoryMenu'; // Importa o menu recursivo que está na mesma pasta

export default function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-[#fff200] text-gray-900 font-bold text-sm shadow-md relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-10">
          
          {/* BOTÃO "TODOS OS DEPARTAMENTOS" */}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="flex items-center gap-2 hover:bg-yellow-500 px-3 py-2 rounded transition-colors select-none"
          >
            {isOpen ? <X size={20}/> : <MenuIcon size={20}/>}
            <span>Todos os Departamentos</span>
          </button>

          {/* LINKS RÁPIDOS */}
          <div className="hidden md:flex gap-6 text-xs text-gray-700">
            <Link to="/ofertas" className="hover:text-black">Ofertas do Dia</Link>
            <Link to="/mercado" className="hover:text-black">Supermercado</Link>
            <Link to="/moda" className="hover:text-black">Moda</Link>
            <Link to="/historico" className="hover:text-black">Histórico</Link>
          </div>
        </div>
      </div>

      {/* --- AQUI A MÁGICA ACONTECE --- */}
      {/* Caixa flutuante que contém o menu árvore */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 ml-4 w-72 bg-white shadow-2xl rounded-md overflow-hidden border border-gray-300 animate-in fade-in zoom-in-95 duration-200">
             {/* Passamos uma prop para fechar o menu quando clicar em um link */}
            <CategoryMenu onItemClick={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
}