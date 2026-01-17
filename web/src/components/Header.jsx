import React, { useState } from 'react'; 
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, ShoppingCart, Heart, User, Menu, 
  Phone, X, ArrowRight, LogIn, ChevronRight, ShieldCheck
} from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from 'framer-motion';
import useCartStore from '../store/useCartStore';
import { formatCurrency } from '../lib/utils';
import { useZipCode } from '../context/ZipCodeContext';

import CategoryMenu from "./layout/CategoryMenu";
import FeaturedMenu from "./layout/FeaturedMenu"; 

export default function Header() {
  const [isCepModalOpen, setIsCepModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const { globalCep, setGlobalCep } = useZipCode();
  const [tempCep, setTempCep] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/busca?q=${encodeURIComponent(searchTerm)}`);
      setSearchTerm('');
      setIsMenuOpen(false);
    }
  };
  
  const { user } = useUser();
  const { getTotalPrice, items, favorites } = useCartStore();
  
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const favCount = favorites?.length || 0;

  const handleSaveCep = (e) => {
    e.preventDefault();
    if (tempCep.length === 8) {
      setGlobalCep(tempCep); 
      setIsCepModalOpen(false);
    } else {
      alert("Por favor, digite um CEP válido com 8 números.");
    }
  };

  const gradientClass = "h-[3px] w-full bg-gradient-to-r from-[#4C1D95] via-[#7C3AED] to-[#4C1D95]";

  return (
    <header className="w-full bg-crocus-deep font-sans text-white sticky top-0 z-50 shadow-xl border-b border-white/10">
      
      {/* 1. BARRA DE TOPO (Apenas Desktop) */}
      <div className="hidden lg:flex justify-end items-center container mx-auto px-4 py-2 text-xs font-medium border-b border-white/20">
        <div className="flex gap-4 items-center">
          <a href="https://wa.me/5571983774301" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline opacity-90 transition-opacity">
             <Phone size={12}/> Vendas: (71) 98377-4301
          </a>
        </div>
      </div>

      {/* 2. BARRA PRINCIPAL */}
      <div className="container mx-auto px-4 py-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
        
        {/* LOGO + BOTÃO MOBILE */}
        <div className="flex items-center justify-between w-full lg:w-auto">
            {/* Botão Menu Mobile */}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg mr-2 transition-colors"
            >
                {isMenuOpen ? <X size={28}/> : <Menu size={28}/>}
            </button>

            {/* --- CORREÇÃO DO LOGO AQUI --- */}
            {/* Removi 'group-hover:rotate-3' e 'transition-transform' */}
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 group mr-auto lg:mr-0 select-none">
                <img 
                    src="/logo-p.png" 
                    alt="P Palastore" 
                    className="h-10 w-auto object-contain drop-shadow-md" 
                />
                
                <div className="leading-none drop-shadow-md">
                    <span className="block font-black text-2xl tracking-tight text-white uppercase italic">Palastore</span>
                    <span className="block font-medium text-[10px] tracking-[0.2em] opacity-80 text-white uppercase">Oficial</span>
                </div>
            </Link>
            {/* ----------------------------- */}

            {/* Carrinho Mobile */}
            <Link to="/cart" onClick={() => setIsMenuOpen(false)} className="lg:hidden relative text-white p-2">
                <ShoppingCart size={24}/>
                {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">{cartCount}</span>}
            </Link>
        </div>

        {/* BUSCA */}
        <form onSubmit={handleSearch} className="flex-1 w-full max-w-3xl relative mx-0 lg:mx-4">
          <input 
            type="text" 
            placeholder="O que você procura hoje?" 
            className="w-full h-12 pl-4 pr-12 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-inner bg-white placeholder-gray-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="absolute right-3 top-3 text-crocus-deep cursor-pointer hover:text-orange-500 transition-colors bg-transparent border-none">
            <Search />
          </button>
        </form>

        {/* ÍCONES DESKTOP */}
        <div className="hidden lg:flex items-center gap-6 text-sm font-medium justify-end">
           <div onClick={() => setIsCepModalOpen(true)} className="hidden lg:flex items-center gap-2 cursor-pointer hover:bg-white/10 p-2 rounded-xl transition-colors border border-transparent hover:border-white/20">
              <MapPin size={24} className="text-white animate-pulse"/>
              <div className="leading-tight text-white text-left">
                <span className="block text-[10px] opacity-70">Enviar para</span>
                <span className="font-black block truncate max-w-[100px] text-xs uppercase tracking-tighter">
                  {globalCep || 'Informe seu CEP'}
                </span>
              </div>
           </div>

           <Link to="/favoritos" className="flex flex-col items-center gap-1 text-white hover:text-orange-500 transition-colors relative group">
              <div className="relative">
                <Heart size={24}/>
                {favCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black animate-in zoom-in">{favCount}</span>}
              </div>
              <span className="text-[10px] hidden lg:block uppercase font-bold tracking-tighter">Favoritos</span>
           </Link>

           <div className="flex items-center gap-2 min-w-[150px]">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="flex items-center gap-2 hover:bg-white/10 p-2 rounded-xl transition-colors text-white text-left w-full group">
                    <User size={24} className="group-hover:scale-110 transition-transform"/>
                    <div className="hidden lg:block leading-tight">
                      <span className="block text-[10px] opacity-70">Minha Conta</span>
                      <span className="block font-black text-xs uppercase tracking-tighter italic">Entrar / Criar</span>
                    </div>
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center gap-3 bg-white/10 p-2 rounded-2xl border border-white/10 shadow-inner">
                  <UserButton afterSignOutUrl="/" />
                  <Link to="/profile" className="hidden lg:block leading-tight text-white text-left">
                    <span className="block text-[10px] opacity-70 uppercase tracking-tighter font-black">Portal Cliente</span>
                    <span className="block font-black text-xs truncate max-w-[80px] italic">Olá, {user?.firstName}</span>
                  </Link>
                </div>
              </SignedIn>
           </div>

           <Link to="/cart" className="flex items-center gap-2 bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg px-5 py-2.5 rounded-2xl group relative border border-orange-400">
              <div className="relative">
                <ShoppingCart size={20} className="fill-current"/>
                {cartCount > 0 && <span className="absolute -top-4 -right-4 bg-white text-orange-600 text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black shadow-xl border-2 border-orange-500 animate-bounce">{cartCount}</span>}
              </div>
              <span className="font-black hidden lg:block ml-1 text-sm">{formatCurrency(getTotalPrice())}</span>
           </Link>
        </div>
      </div>

      {/* 3. MENU / BARRA DE DEPARTAMENTOS */}
      <div className={`bg-white text-gray-800 shadow-sm relative ${isMenuOpen ? 'block' : 'hidden'} lg:block`}>
        
        <div className={gradientClass}></div>

        <div className="container mx-auto px-4">
          <ul className="flex flex-col lg:flex-row lg:items-center justify-between text-[11px] font-black uppercase tracking-tight py-2 lg:py-0 gap-4 lg:gap-0">
            
            <li className="lg:hidden flex flex-col gap-2 border-b border-gray-100 pb-4 mb-2">
                <div 
                    onClick={() => { setIsMenuOpen(false); setIsCepModalOpen(true); }}
                    className="flex items-center gap-3 bg-orange-50 p-3 rounded-xl border border-orange-100 active:scale-95 transition-transform cursor-pointer"
                >
                    <div className="bg-white p-2 rounded-full text-orange-500 shadow-sm">
                        <MapPin size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-normal uppercase">Localização de Entrega</span>
                        <span className="text-sm font-black text-gray-800">
                            {globalCep ? `CEP: ${globalCep}` : 'Toque para informar CEP'}
                        </span>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-orange-300"/>
                </div>

                <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-crocus-deep">Minha Conta</span>
                    <Link to="/favoritos" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-1 text-gray-500">
                        <Heart size={16}/> Favoritos ({favCount})
                    </Link>
                </div>
                
                <SignedOut>
                    <SignInButton mode="modal">
                        <button className="w-full bg-crocus-deep text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md active:scale-95 transition-transform">
                            <LogIn size={18}/> Entrar / Cadastrar
                        </button>
                    </SignInButton>
                </SignedOut>

                <SignedIn>
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <UserButton afterSignOutUrl="/" />
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-normal normal-case">Bem-vindo de volta,</span>
                            <span className="text-sm font-black text-gray-800">{user?.firstName}</span>
                        </div>
                        <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="ml-auto text-xs text-blue-600 underline">
                            Pedidos
                        </Link>
                    </div>
                </SignedIn>
            </li>
            
            <li className="relative group w-full lg:w-auto">
               <button 
                 onClick={() => setIsMenuOpen(!isMenuOpen)} 
                 className={`flex items-center gap-2 py-3 px-4 transition-colors border-r border-gray-100 w-full lg:w-auto rounded-lg lg:rounded-none ${isMenuOpen ? 'bg-crocus-deep text-white lg:bg-transparent lg:text-crocus-deep' : 'hover:bg-gray-50 text-crocus-deep'}`}
               >
                 <Menu size={18} className="lg:hidden text-white" /> 
                 <span className="hidden lg:inline">{isMenuOpen ? <X size={18}/> : <Menu size={18}/>}</span>
                 Todas as Categorias
               </button>

               <AnimatePresence>
                 {isMenuOpen && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 10 }}
                     className="static lg:absolute top-full left-0 w-full lg:w-80 bg-white shadow-none lg:shadow-xl border-t border-gray-100 lg:border rounded-b-2xl z-50 overflow-hidden py-2 pl-4 lg:pl-0"
                   >
                     <div onClick={() => setIsMenuOpen(false)}>
                        <CategoryMenu onItemClick={() => setIsMenuOpen(false)} />
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </li>

            <div 
                className="flex flex-row lg:flex-row gap-4 lg:gap-0 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide"
                onClick={() => setIsMenuOpen(false)}
            >
                <FeaturedMenu />
            </div>

            <li className="ml-auto lg:block py-2 lg:py-0 text-center w-full lg:w-auto border-t lg:border-none border-gray-100 mt-2 lg:mt-0">
                <span className="flex items-center justify-center lg:justify-start gap-1 py-3 px-2 text-gray-400 select-none">
                    <ShieldCheck size={14} className="text-green-500"/> Site 100% Seguro
                </span>
            </li>
          </ul>
        </div>

        <div className={gradientClass}></div>

      </div>

      <AnimatePresence>
        {isCepModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCepModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-gray-900 border border-gray-100">
               <button onClick={() => setIsCepModalOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={20}/></button>
               <div className="flex flex-col items-center text-center">
                 <div className="bg-orange-100 p-4 rounded-full text-orange-600 mb-6"><MapPin size={32} /></div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Onde você está?</h3>
                 <p className="text-gray-500 text-sm font-medium mb-8">Informe seu CEP para calcularmos frete e prazos de entrega exclusivos.</p>
                 <form onSubmit={handleSaveCep} className="w-full space-y-4">
                   <input autoFocus type="text" maxLength={8} placeholder="00000000" className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-center text-xl font-black tracking-widest focus:border-orange-500 outline-none transition-all placeholder:text-gray-300" value={tempCep} onChange={(e) => setTempCep(e.target.value.replace(/\D/g, ''))} />
                   <button type="submit" className="w-full bg-crocus-deep text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-crocus-vivid transition-all shadow-xl shadow-crocus-deep/20">Confirmar Localização <ArrowRight size={16}/></button>
                 </form>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}