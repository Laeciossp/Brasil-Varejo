import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { client, urlFor } from '../lib/sanity';
import { Smartphone, Monitor, Armchair, Hammer, ShoppingBag, Watch, ChevronRight, Truck } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CORREÇÃO 1: Adicionado o campo 'freeShipping' na consulta
    const query = `*[_type == "product"][0..7] {
      title,
      slug,
      price,
      oldPrice,
      freeShipping,
      "image": images[0]
    }`;

    client.fetch(query)
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const departments = [
    { name: 'Celulares', icon: <Smartphone size={24}/>, color: 'bg-crocus-light/30 text-crocus-deep hover:bg-crocus-light/50', link: '/category/celulares' },
    { name: 'Informática', icon: <Monitor size={24}/>, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100', link: '/category/informatica' },
    { name: 'Móveis', icon: <Armchair size={24}/>, color: 'bg-orange-50 text-stamen-orange hover:bg-orange-100', link: '/category/moveis' },
    { name: 'Ferramentas', icon: <Hammer size={24}/>, color: 'bg-gray-100 text-gray-600 hover:bg-gray-200', link: '/category/ferramentas' },
    { name: 'Moda', icon: <ShoppingBag size={24}/>, color: 'bg-pink-50 text-pink-500 hover:bg-pink-100', link: '/category/moda' },
    { name: 'Relógios', icon: <Watch size={24}/>, color: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100', link: '/category/relogios' },
  ];

  return (
    <div className="pb-10 bg-surface-primary">
      
      {/* 1. BANNER PRINCIPAL (Fundo Sólido Roxo para Contraste) */}
      <div className="bg-crocus-deep text-white relative overflow-hidden">
        
        {/* Efeito de fundo sutil (apenas textura, sem clarear) */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 transform origin-bottom-right pointer-events-none"></div>

        <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col md:flex-row items-center justify-between relative z-10">
          <div className="md:w-1/2 mb-8 md:mb-0 space-y-6">
            <span className="bg-stamen-orange text-white font-black px-3 py-1 text-xs rounded uppercase tracking-wider shadow-sm">
              Ofertas da Semana
            </span>
            <h1 className="text-4xl md:text-6xl font-black leading-tight drop-shadow-md text-white">
              A Tecnologia que <br/>você procura.
            </h1>
            <p className="text-lg opacity-90 max-w-md font-medium text-gray-100">
              Frete grátis para milhares de produtos e entrega super rápida em todo o Brasil.
            </p>
            
            {/* BOTÃO LARANJA VIBRANTE */}
            <button className="bg-stamen-orange text-white font-bold py-4 px-10 rounded-full hover:bg-white hover:text-stamen-orange transition-all shadow-lg hover:shadow-orange-500/50 transform hover:scale-105 border-2 border-transparent hover:border-stamen-orange">
              Ver Ofertas
            </button>
          </div>
          
          <div className="md:w-1/2 flex justify-center">
            <img 
              src="https://cdn.sanity.io/images/o4upb251/production/banner-hero-placeholder.png" 
              onError={(e) => e.target.style.display='none'} 
              alt="" 
              className="max-h-[350px] object-contain drop-shadow-2xl animate-fade-in-up hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-10 relative z-20">
        
        {/* 2. DEPARTAMENTOS */}
        <div className="bg-white rounded-2xl shadow-crocus p-8 mb-12 overflow-x-auto border border-white">
          <h3 className="font-bold text-brand-dark mb-6 text-sm uppercase tracking-wide flex items-center gap-2">
              Tem no Brasil Varejo <span className="w-10 h-[2px] bg-crocus-vivid block"></span>
          </h3>
          <div className="flex gap-8 min-w-max pb-2">
            {departments.map((dept, idx) => (
              <Link key={idx} to={dept.link} className="flex flex-col items-center gap-3 group cursor-pointer min-w-[80px]">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 ${dept.color}`}>
                  {dept.icon}
                </div>
                <span className="text-xs font-bold text-gray-500 group-hover:text-crocus-deep transition-colors text-center">
                  {dept.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 3. VITRINE DE OFERTAS */}
        <div className="mb-8 flex items-end justify-between">
           <div>
             <h2 className="text-2xl font-black text-brand-dark flex items-center gap-2">
                Ofertas do Dia <span className="text-stamen-orange text-4xl">.</span>
             </h2>
             <p className="text-sm text-gray-500 mt-1">Preços que valem a pena aproveitar</p>
           </div>
           <Link to="/category/todas" className="text-crocus-vivid font-bold text-sm hover:underline flex items-center gap-1 group">
             Ver tudo <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>
           </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <Link 
                key={product.slug.current} 
                to={`/product/${product.slug.current}`}
                className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-crocus-light hover:shadow-crocus transition-all group flex flex-col h-full relative"
              >
                {product.oldPrice && (
                   <span className="absolute top-3 left-3 bg-crocus-deep text-white text-[10px] font-black px-2 py-1 rounded shadow-sm z-10">
                      -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                   </span>
                )}

                <div className="aspect-square flex items-center justify-center mb-4 overflow-hidden rounded-lg bg-surface-primary/50">
                  {product.image ? (
                    <img 
                      src={urlFor(product.image).width(400).url()} 
                      alt={product.title} 
                      className="object-contain h-full w-full mix-blend-multiply group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="text-gray-300 text-xs">Sem foto</div>
                  )}
                </div>

                <div className="mt-auto">
                  <h3 className="font-bold text-brand-dark text-sm line-clamp-2 mb-2 group-hover:text-crocus-vivid transition-colors">
                    {product.title}
                  </h3>
                  
                  {product.oldPrice > product.price && (
                    <span className="text-xs text-gray-400 line-through block">
                      de R$ {product.oldPrice.toFixed(2)} por
                    </span>
                  )}
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-gray-400">R$</span>
                    <span className="text-2xl font-black text-crocus-deep">
                      {product.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-gray-500 mb-3">
                    à vista no Pix ou em até 10x sem juros
                  </p>

                  {/* CORREÇÃO 2: Só exibe se product.freeShipping for VERDADEIRO */}
                  {product.freeShipping && (
                    <div className="w-full bg-surface-primary text-crocus-deep text-[10px] font-bold py-2 px-2 rounded-lg flex items-center justify-center gap-1 group-hover:bg-crocus-light/20 transition-colors">
                      <Truck size={14}/> Frete Grátis
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        
        {/* 4. BANNER APP (Faixa Final - Roxo Sólido) */}
        <div className="mt-16 bg-crocus-deep rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center justify-between text-white overflow-hidden relative shadow-2xl">
           <div className="relative z-10 max-w-lg">
             <h2 className="text-3xl font-black mb-4">Baixe o SuperApp Brasil Varejo</h2>
             <p className="opacity-80 mb-8 text-lg">Ofertas exclusivas, rastreio de pedidos em tempo real e cupons de desconto que só tem no app.</p>
             <div className="flex gap-4">
               <button className="bg-white text-brand-dark px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors flex items-center gap-2">
                 Google Play
               </button>
               <button className="bg-transparent border border-white/30 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors flex items-center gap-2">
                 App Store
               </button>
             </div>
           </div>
           {/* Círculo decorativo */}
           <div className="absolute right-0 top-0 w-96 h-96 bg-brand-blue rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
        </div>

      </div>
    </div>
  );
}