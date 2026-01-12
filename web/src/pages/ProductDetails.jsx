import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { client, urlFor } from '../lib/sanity';
import { PortableText } from '@portabletext/react'; 
import { 
  ShoppingCart, Truck, ShieldCheck, PlayCircle, Star, ArrowRight, 
  Heart, Share2, ChevronLeft, ChevronRight, AlertCircle 
} from 'lucide-react'; 
import { formatCurrency } from '../lib/utils';
import useCartStore from '../store/useCartStore';

// --- CONFIGURAÇÃO DO TEXTO RICO (Mantida) ---
const myPortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) return null;
      return (
        <figure className="my-10 flex flex-col items-center">
          <img
            src={urlFor(value).width(800).fit('max').url()}
            alt={value.alt || 'Imagem do produto'}
            className="rounded-xl shadow-sm border border-gray-100 max-h-[500px] object-contain"
          />
        </figure>
      );
    },
  },
  block: {
    h1: ({children}) => <h1 className="text-2xl font-bold mt-8 mb-4 text-gray-900">{children}</h1>,
    h2: ({children}) => <h2 className="text-xl font-bold mt-6 mb-3 text-gray-800">{children}</h2>,
    ul: ({children}) => <ul className="list-disc pl-5 my-4 space-y-2 text-gray-600">{children}</ul>,
    li: ({children}) => <li className="pl-1">{children}</li>,
    normal: ({children}) => <p className="mb-4 leading-relaxed text-gray-600">{children}</p>,
  }
};

export default function ProductDetails() {
  const { slug } = useParams();
  
  // Store Global
  const { addItem, setShipping, selectedShipping, toggleFavorite, favorites, globalCep } = useCartStore();

  // Estados do Produto Principal
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]); // Novo: Produtos Relacionados
  const [loading, setLoading] = useState(true);
  
  // Estados de Variação (Novo)
  const [selectedVariant, setSelectedVariant] = useState(null); // Qual variação está escolhida?
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentOldPrice, setCurrentOldPrice] = useState(0);

  // Estados de Mídia
  const [activeMedia, setActiveMedia] = useState(null); 

  // Estados de Frete
  const [cep, setCep] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [shippingOptions, setShippingOptions] = useState(null);

  // Ref para o Carrossel
  const carouselRef = useRef(null);

  // --- 1. BUSCA DADOS DO PRODUTO + RELACIONADOS ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Query Principal Atualizada para pegar VARIAÇÕES
        const query = `*[_type == "product" && slug.current == $slug][0]{
          _id,
          title,
          description,
          specifications,
          "slug": slug,
          categories[]->{_id, title},
          
          // Dados Legados (Raiz)
          price, 
          oldPrice,
          
          // Imagens Gerais
          "images": images[]{
            _key, _type, 
            asset->{_id, url, mimeType}
          },

          // Novas Variações
          variants[] {
            _key, variantName, price, oldPrice, stock,
            colorHex, voltage, capacity, ram,
            "variantImage": variantImage.asset->{_id, url, mimeType}
          },

          freeShipping,
          logistics { width, height, length, weight }
        }`;

        const data = await client.fetch(query, { slug });
        
        if (data) {
          setProduct(data);

          // Lógica de Inicialização de Preço e Variação
          if (data.variants && data.variants.length > 0) {
            // Se tem variações, seleciona a primeira por padrão
            const firstVar = data.variants[0];
            setSelectedVariant(firstVar);
            setCurrentPrice(firstVar.price);
            setCurrentOldPrice(firstVar.oldPrice || 0);
            
            // Se a variação tem foto específica, usa ela. Se não, usa a primeira da galeria
            if (firstVar.variantImage) {
              setActiveMedia({ _key: 'varImg', asset: firstVar.variantImage });
            } else if (data.images?.length > 0) {
              setActiveMedia(data.images[0]);
            }

          } else {
            // Produto Simples (Sem variação)
            setCurrentPrice(data.price);
            setCurrentOldPrice(data.oldPrice || 0);
            if (data.images?.length > 0) setActiveMedia(data.images[0]);
          }

          // BUSCA PRODUTOS RELACIONADOS (Quem viu, viu também)
          if (data.categories && data.categories.length > 0) {
            const catId = data.categories[0]._id;
            const relatedQuery = `
              *[_type == "product" && references($catId) && _id != $id][0...8] {
                _id, title, slug, price,
                "imageUrl": images[0].asset->url,
                variants[0] { price } // Tenta pegar preço da variação se existir
              }
            `;
            const related = await client.fetch(relatedQuery, { catId, id: data._id });
            setRelatedProducts(related);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  // --- 2. AO TROCAR DE VARIAÇÃO ---
  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    setCurrentPrice(variant.price);
    setCurrentOldPrice(variant.oldPrice || 0);
    
    // Se a variação tiver foto, muda a foto principal
    if (variant.variantImage) {
      setActiveMedia({ _key: `var-${variant._key}`, asset: variant.variantImage });
    }
  };

  // --- 3. SINCRONIZAÇÃO CEP (Mantida) ---
  useEffect(() => {
    if (product && globalCep && globalCep !== 'Informe seu CEP') {
        const cleanGlobal = globalCep.replace(/\D/g, '');
        if (cleanGlobal.length === 8) {
            setCep(cleanGlobal);
            handleCalculateShipping(cleanGlobal);
        }
    }
  }, [product, globalCep]);

  // --- 4. CÁLCULO DE FRETE (Mantido) ---
  const handleCalculateShipping = async (cepOverride) => {
    const targetCep = typeof cepOverride === 'string' ? cepOverride : cep;
    const cleanCep = targetCep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) return; // Validação silenciosa
    
    setCalculating(true);
    try {
      const workerUrl = 'https://brasil-varejo-api.laeciossp.workers.dev/shipping'; 
      const response = await fetch(workerUrl, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: { postal_code: "43805000" },
          to: { postal_code: cleanCep },
          products: [{ 
            id: product._id, 
            width: product.logistics?.width || 15,
            height: product.logistics?.height || 15,
            length: product.logistics?.length || 15,
            weight: product.logistics?.weight || 0.5, 
            insurance_value: currentPrice, // Usa o preço ATUAL (da variação)
            quantity: 1 
          }]
        })
      });
      const data = await response.json();
      const options = Array.isArray(data) ? data : [];
      setShippingOptions(options);
      if (options.length > 0 && !selectedShipping) setShipping(options[0]);
    } catch (err) {
      console.error(err);
      setShippingOptions([]); 
    } finally {
      setCalculating(false);
    }
  };

  // --- 5. COMPRAR AGORA (Atualizado para Variações) ---
  const handleBuyNow = () => {
    if (!product) return;
    if (!selectedShipping) return alert("Por favor, calcule o frete para continuar.");

    const cartItem = {
      _id: product._id,
      title: product.title,
      slug: product.slug,
      // Usa dados da variação se existir, senão usa do produto raiz
      price: currentPrice,
      image: activeMedia ? urlFor(activeMedia.asset).url() : '',
      variantName: selectedVariant ? selectedVariant.variantName : null,
      sku: selectedVariant ? selectedVariant._key : product._id
    };

    addItem(cartItem);
    window.location.href = '/cart'; 
  };

  // --- 6. LÓGICA DO CARROSSEL HÍBRIDO ---
  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 300; // Largura do card + gap
      const newPos = direction === 'left' 
        ? carouselRef.current.scrollLeft - scrollAmount 
        : carouselRef.current.scrollLeft + scrollAmount;
      
      carouselRef.current.scrollTo({
        left: newPos,
        behavior: 'smooth'
      });
    }
  };

  // --- RENDERIZAÇÃO ---
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
    </div>
  );

  if (!product) return <div className="p-10 text-center">Produto não encontrado.</div>;

  const isFreeShipping = product.freeShipping === true;
  const isFavorite = favorites.some((fav) => fav._id === product._id);
  const isVideo = activeMedia?.asset?.mimeType?.includes('video');

  return (
    <div className="bg-gray-50 min-h-screen py-10 font-sans selection:bg-blue-100">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* --- BLOCO PRINCIPAL DO PRODUTO --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col lg:flex-row mb-10">
          
          {/* ESQUERDA: FOTOS E VÍDEOS */}
          <div className="lg:w-3/5 p-8 border-r border-gray-50">
            <div className="aspect-square w-full bg-white rounded-xl flex items-center justify-center mb-6 relative overflow-hidden shadow-inner border border-gray-50">
              {activeMedia && (
                isVideo ? (
                    <video src={activeMedia.asset.url} controls className="w-full h-full object-contain" />
                ) : (
                    <img src={urlFor(activeMedia.asset).width(1200).url()} alt={product.title} className="w-full h-full object-contain mix-blend-multiply" />
                )
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3 overflow-x-auto justify-center pb-2 px-2 scrollbar-hide">
              {product.images?.map((media) => (
                <button
                  key={media._key}
                  onClick={() => setActiveMedia(media)}
                  className={`w-20 h-20 flex-shrink-0 border rounded-xl overflow-hidden ${activeMedia?._key === media._key ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 opacity-70'}`}
                >
                  <img src={urlFor(media.asset).width(150).url()} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* DIREITA: INFORMAÇÕES E COMPRA */}
          <div className="lg:w-2/5 p-8 lg:p-12 flex flex-col justify-center bg-white relative">
            <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{product.categories?.[0]?.title || 'Oferta'}</span>
                <button onClick={() => toggleFavorite(product)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Heart size={24} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
                </button>
            </div>

            <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">{product.title}</h1>

            {/* SELETOR DE VARIAÇÕES (Importante para o novo Schema) */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-6">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-widest block mb-2">Escolha uma opção:</span>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isSelected = selectedVariant?._key === variant._key;
                    return (
                      <button
                        key={variant._key}
                        onClick={() => handleVariantChange(variant)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                          isSelected 
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' 
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {variant.variantName || variant.color || variant.voltage || 'Padrão'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* PREÇO DINÂMICO */}
<div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
    {isFreeShipping && (
    <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-3">
        <Truck size={12} /> Frete Grátis
    </div>
    )}
    
    {currentOldPrice > currentPrice && (
        <span className="text-gray-400 line-through text-sm block mb-1">De: {formatCurrency(currentOldPrice)}</span>
    )}
    
    <span className="text-5xl font-black text-gray-900 tracking-tighter block">{formatCurrency(currentPrice)}</span>
    
    {/* AQUI ESTÁ A CORREÇÃO: REMOVIDA A FÓRMULA MATEMÁTICA */}
    <p className="text-sm text-gray-500 mt-2 font-bold bg-gray-100 inline-block px-3 py-1 rounded-lg">
        Em até 12x
    </p>
</div>

            {/* CÁLCULO DE FRETE */}
            <div className="mb-6">
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" placeholder="CEP" maxLength={9} value={cep} onChange={(e) => setCep(e.target.value)}
                    className="flex-1 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                  <button onClick={() => handleCalculateShipping()} disabled={calculating} className="bg-gray-900 text-white px-6 rounded-xl font-bold uppercase text-xs">
                    {calculating ? '...' : 'OK'}
                  </button>
                </div>
                {/* Lista Opções Frete */}
                {shippingOptions && (
                    <div className="space-y-2">
                        {shippingOptions.length > 0 ? shippingOptions.filter(o => !o.error).map((opt, idx) => (
                            <div key={idx} onClick={() => setShipping(opt)} className={`flex justify-between p-3 border-2 rounded-xl cursor-pointer ${selectedShipping?.name === opt.name ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-3">
                                    <Truck size={16} className="text-gray-400"/>
                                    <div>
                                        <span className="text-xs font-black block text-gray-700">{opt.name}</span>
                                        <span className="text-[10px] text-gray-400 font-bold">{opt.delivery_time} dias</span>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-gray-800">{parseFloat(opt.price) === 0 ? 'GRÁTIS' : formatCurrency(opt.price)}</span>
                            </div>
                        )) : (
                            <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg text-center">CEP Inválido</div>
                        )}
                    </div>
                )}
            </div>

            <button onClick={handleBuyNow} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                Comprar Agora <ArrowRight />
            </button>
          </div>
        </div>

        {/* --- DESCRIÇÃO --- */}
        <div className="bg-white p-8 lg:p-12 rounded-[32px] shadow-sm border border-gray-100 mb-10">
           <h3 className="text-2xl font-black text-gray-900 mb-8 border-b pb-4">Detalhes do Produto</h3>
           <div className="prose prose-lg max-w-none text-gray-600">
             {product.description ? <PortableText value={product.description} components={myPortableTextComponents} /> : <p>Sem descrição.</p>}
           </div>
           
           {/* Especificações Técnicas */}
           {product.specifications && (
             <div className="mt-10 pt-10 border-t">
               <h4 className="text-sm font-black uppercase tracking-widest mb-6">Ficha Técnica</h4>
               <div className="grid md:grid-cols-2 gap-4">
                 {product.specifications.map((spec, i) => (
                   <div key={i} className="flex justify-between p-4 bg-gray-50 rounded-xl text-sm border hover:border-gray-200">
                     <span className="font-bold text-gray-500">{spec.label}</span>
                     <span className="font-black text-gray-900">{spec.value}</span>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>

        {/* --- NOVO: CARROSSEL "QUEM VIU TAMBÉM VIU" (HÍBRIDO) --- */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-gray-900">Quem viu este produto, também viu</h3>
              
              {/* Setas de Navegação (Apenas Desktop) */}
              <div className="hidden md:flex gap-2">
                <button onClick={() => scrollCarousel('left')} className="p-2 rounded-full border border-gray-200 hover:bg-white hover:shadow-md transition-all">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => scrollCarousel('right')} className="p-2 rounded-full border border-gray-200 hover:bg-white hover:shadow-md transition-all">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Container do Carrossel */}
            <div 
              ref={carouselRef}
              className="flex gap-6 overflow-x-auto pb-8 snap-x scrollbar-hide scroll-smooth"
            >
              {relatedProducts.map((rel) => {
                // Tenta pegar o preço da variação ou do produto raiz
                const relPrice = rel.variants && rel.variants[0] ? rel.variants[0].price : rel.price;
                
                return (
                  <Link 
                    to={`/product/${rel.slug.current}`} 
                    key={rel._id} 
                    className="min-w-[280px] md:min-w-[300px] snap-start bg-white p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all group flex flex-col"
                  >
                    <div className="h-48 w-full bg-gray-50 rounded-xl mb-4 overflow-hidden flex items-center justify-center relative">
                      {rel.imageUrl ? (
                        <img src={rel.imageUrl} alt={rel.title} className="h-full object-contain group-hover:scale-105 transition-transform duration-500 mix-blend-multiply" />
                      ) : (
                        <div className="text-gray-300"><ShoppingCart size={32} /></div>
                      )}
                    </div>
                    
                    <h4 className="font-bold text-gray-800 mb-2 line-clamp-2 h-12 text-sm">{rel.title}</h4>
                    
                    <div className="mt-auto">
                        <span className="block text-xs text-gray-400 font-bold uppercase mb-1">A partir de</span>
                        <span className="text-2xl font-black text-gray-900">{formatCurrency(relPrice)}</span>
                        <span className="text-xs text-green-600 font-bold block mt-1">12x sem juros</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}