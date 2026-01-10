import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, MapPin, ShoppingCart, Heart, User, Menu, 
  ChevronDown, Phone, ShieldCheck, Download 
} from 'lucide-react';

export default function Header({ cartCount = 0 }) {
  const [cep, setCep] = useState('Informe seu CEP');

  return (
    // MUDANÇA AQUI: bg-crocus-deep (Roxo Sólido) em vez de degradê
    <header className="w-full bg-crocus-deep font-sans text-white sticky top-0 z-50 shadow-xl border-b border-white/10">
      
      {/* 1. BARRA DE TOPO (Institucional) */}
      <div className="hidden lg:flex justify-between items-center container mx-auto px-4 py-2 text-xs font-medium border-b border-white/20">
        <div className="flex gap-4">
          <a href="#" className="hover:underline opacity-90 hover:opacity-100 transition-opacity">Nossas lojas</a>
          <a href="#" className="hover:underline opacity-90 hover:opacity-100 transition-opacity">Tenha sua loja</a>
          <a href="#" className="hover:underline opacity-90 hover:opacity-100 transition-opacity">Regulamentos</a>
          <a href="#" className="hover:underline opacity-90 hover:opacity-100 transition-opacity">Acessibilidade</a>
        </div>
        <div className="flex gap-4 items-center">
          <a href="#" className="flex items-center gap-1 hover:underline opacity-90 hover:opacity-100 transition-opacity">
             <Download size={12}/> Baixe o SuperApp
          </a>
          <a href="#" className="flex items-center gap-1 hover:underline opacity-90 hover:opacity-100 transition-opacity">
             <Phone size={12}/> Compre pelo Tel: 0800 773 3838
          </a>
        </div>
      </div>

      {/* 2. BARRA PRINCIPAL (Busca e Ações) */}
      <div className="container mx-auto px-4 py-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-white text-crocus-deep p-1 rounded font-black text-2xl tracking-tighter group-hover:scale-105 transition-transform shadow-md">
             BV
          </div>
          <div className="leading-none drop-shadow-md">
            <span className="block font-black text-xl tracking-tight text-white">BRASIL</span>
            <span className="block font-medium text-xs tracking-widest opacity-90 text-white">VAREJO</span>
          </div>
        </Link>

        {/* Busca Inteligente (Fundo Branco para contraste total) */}
        <div className="flex-1 w-full max-w-3xl relative mx-4">
          <input 
            type="text" 
            placeholder="O que você procura hoje?" 
            className="w-full h-12 pl-4 pr-12 rounded-lg text-brand-dark focus:outline-none focus:ring-2 focus:ring-stamen-orange shadow-inner bg-white placeholder-gray-400"
          />
          <Search className="absolute right-3 top-3 text-crocus-deep cursor-pointer hover:text-stamen-orange transition-colors" />
        </div>

        {/* Ações do Usuário */}
        <div className="flex items-center gap-6 text-sm font-medium w-full lg:w-auto justify-between lg:justify-end">
           
           {/* CEP / Localização */}
           <div className="hidden xl:flex items-center gap-2 cursor-pointer hover:bg-white/10 p-2 rounded transition-colors">
              <MapPin size={24} className="text-white"/>
              <div className="leading-tight text-white">
                <span className="block text-[10px] opacity-80">Enviar para</span>
                <span className="font-bold block truncate max-w-[100px]">{cep}</span>
              </div>
           </div>

           {/* Favoritos */}
           <Link to="/favoritos" className="flex flex-col items-center gap-1 text-white hover:text-stamen-orange transition-colors relative group">
              <Heart size={24}/>
              <span className="text-[10px] hidden lg:block">Favoritos</span>
           </Link>

           {/* Conta */}
           <Link to="/profile" className="flex items-center gap-2 hover:bg-white/10 p-2 rounded transition-colors text-white">
              <User size={24}/>
              <div className="hidden lg:block leading-tight text-left">
                <span className="block text-[10px] opacity-80">Bem-vindo :)</span>
                <span className="block font-bold">Entre ou cadastre-se</span>
              </div>
           </Link>

           {/* Carrinho (CORRIGIDO: Sem fundo branco no hover, agora ele brilha) */}
           <Link to="/cart" className="flex items-center gap-2 bg-crocus-stamen text-white hover:brightness-110 transition-all shadow-lg hover:shadow-orange-500/50 px-4 py-2 rounded-full group border-2 border-transparent">
              <ShoppingCart size={20} className="fill-current"/>
              <span className="font-bold hidden lg:block">R$ 0,00</span>
              {cartCount > 0 && (
                <span className="bg-white text-crocus-deep text-[10px] w-5 h-5 flex items-center justify-center rounded-full absolute -top-1 -right-1 lg:hidden font-bold shadow-sm">
                  {cartCount}
                </span>
              )}
           </Link>
        </div>
      </div>

      {/* 3. MEGA MENU DE DEPARTAMENTOS */}
      <div className="bg-white text-gray-700 shadow-sm border-b border-gray-100 hidden lg:block">
        <div className="container mx-auto px-4">
          <ul className="flex items-center justify-between text-xs font-bold uppercase tracking-wide">
            
            <li className="group relative">
               <button className="flex items-center gap-2 py-3 px-4 hover:bg-crocus-light/20 text-crocus-deep transition-colors">
                 <Menu size={18}/> Todos os Departamentos
               </button>
               {/* Dropdown Gigante */}
               <div className="absolute top-full left-0 w-[250px] bg-white shadow-xl border border-gray-100 rounded-b-lg hidden group-hover:block z-50 animate-fade-in">
                 <a href="#" className="block px-4 py-3 hover:bg-crocus-light/10 border-b border-gray-50 text-brand-dark hover:text-crocus-vivid transition-colors">Celulares</a>
                 <a href="#" className="block px-4 py-3 hover:bg-crocus-light/10 border-b border-gray-50 text-brand-dark hover:text-crocus-vivid transition-colors">Móveis</a>
                 <a href="#" className="block px-4 py-3 hover:bg-crocus-light/10 border-b border-gray-50 text-brand-dark hover:text-crocus-vivid transition-colors">Eletrodomésticos</a>
                 <a href="#" className="block px-4 py-3 hover:bg-crocus-light/10 border-b border-gray-50 text-brand-dark hover:text-crocus-vivid transition-colors">TV e Vídeo</a>
                 <a href="#" className="block px-4 py-3 hover:bg-crocus-light/10 text-crocus-deep font-bold transition-colors">Ver tudo ›</a>
               </div>
            </li>

            {/* Links Rápidos (Corrigido para Roxo Vibrante no Hover) */}
            <li><a href="#" className="block py-3 px-2 hover:text-crocus-vivid transition-colors">Ofertas do Dia</a></li>
            <li><a href="#" className="block py-3 px-2 hover:text-crocus-vivid transition-colors">Celulares</a></li>
            <li><a href="#" className="block py-3 px-2 hover:text-crocus-vivid transition-colors">Móveis</a></li>
            <li><a href="#" className="block py-3 px-2 hover:text-crocus-vivid transition-colors">Eletrodomésticos</a></li>
            <li><a href="#" className="block py-3 px-2 hover:text-crocus-vivid transition-colors">TV e Vídeo</a></li>
            <li><a href="#" className="block py-3 px-2 hover:text-crocus-vivid transition-colors">Informática</a></li>
            <li><a href="#" className="block py-3 px-2 hover:text-crocus-vivid transition-colors text-crocus-deep font-bold">Baixe o App</a></li>
            
            <li className="ml-auto">
               <a href="#" className="flex items-center gap-1 py-3 px-2 text-gray-400 hover:text-green-600 transition-colors">
                 <ShieldCheck size={14}/> Compra Segura
               </a>
            </li>

          </ul>
        </div>
      </div>

    </header>
  );
}