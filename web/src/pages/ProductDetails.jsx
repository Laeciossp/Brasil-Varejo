import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { client, urlFor } from '../lib/sanity';
import { PortableText } from '@portabletext/react'; 
import { ShoppingCart, Truck, ShieldCheck, PlayCircle } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
// Importação da sua Store oficial
import useCartStore from '../store/useCartStore';

// --- CONFIGURAÇÃO DE COMO EXIBIR O TEXTO RICO (PRESERVADO INTEGRALMENTE) ---
const myPortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) return null;
      return (
        <figure className="my-8 flex flex-col items-center">
          <img
            src={urlFor(value).width(800).fit('max').url()}
            alt={value.alt || 'Imagem do produto'}
            className="rounded-lg shadow-md max-h-[500px] object-contain"
          />
          {value.caption && (
            <figcaption className="text-sm text-gray-500 mt-2 italic">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
  },
  block: {
    h1: ({children}) => <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>,
    h2: ({children}) => <h2 className="text-2xl font-bold mt-6 mb-3 text-blue-900">{children}</h2>,
    ul: ({children}) => <ul className="list-disc pl-5 my-4 space-y-2">{children}</ul>,
    li: ({children}) => <li>{children}</li>,
  }
};

export default function ProductDetails() {
  const { slug } = useParams();
  
  // Conecta com a Store do Zustand
  const addItem = useCartStore((state) => state.addItem);
  const setShipping = useCartStore((state) => state.setShipping);
  const selectedShipping = useCartStore((state) => state.selectedShipping);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState(null); 

  const [cep, setCep] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [shippingOptions, setShippingOptions] = useState(null);

  useEffect(() => {
    const query = `*[_type == "product" && slug.current == $slug][0]{
      _id,
      title,
      price,
      oldPrice,
      description,
      specifications,
      "images": images[]{
        _key,
        _type,
        asset->{
          _id,
          url,
          mimeType
        }
      },
      logistics 
    }`;

    client.fetch(query, { slug })
      .then((data) => {
        setProduct(data);
        if (data?.images?.length > 0) setActiveMedia(data.images[0]);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  // --- FUNÇÃO DE FRETE (PRESERVADA) ---
  const handleCalculateShipping = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return alert("Digite um CEP válido com 8 dígitos");
    
    setCalculating(true);
    setShippingOptions(null); 

    try {
      const workerUrl = 'https://brasil-varejo-api.laeciossp.workers.dev/shipping'; 

      const response = await fetch(workerUrl, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: { postal_code: "43805000" },
          to: { postal_code: cleanCep },
          products: [{ 
            width: product.logistics?.width || 15,
            height: product.logistics?.height || 15,
            length: product.logistics?.length || 15,
            weight: product.logistics?.weight || 0.5, 
            insurance_value: product.price,
            quantity: 1 
          }]
        })
      });

      const data = await response.json();
      setShippingOptions(Array.isArray(data) ? data : []);
      
    } catch (err) {
      console.error(err);
      setShippingOptions([]); 
    } finally {
      setCalculating(false);
    }
  };

  // --- FUNÇÃO DE COMPRA (ATUALIZADA) ---
  const handleBuyNow = () => {
    if (!product) return;
    if (!selectedShipping) return alert("Selecione uma opção de frete clicando nela antes de prosseguir.");

    const cartItem = {
      ...product,
      image: product.images?.[0] ? urlFor(product.images[0].asset).url() : ''
    };

    addItem(cartItem);
    window.location.href = '/cart'; 
  };

  if (loading) return <div className="p-20 text-center font-bold text-gray-400">Carregando detalhes...</div>;
  if (!product) return <div className="p-20 text-center text-red-500">Produto não encontrado.</div>;

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col lg:flex-row mb-10">
          
          {/* 1. GALERIA MULTIMÍDIA (PRESERVADA COM VÍDEO) */}
          <div className="lg:w-3/5 p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
            <div className="aspect-video w-full bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
              {activeMedia?._type === 'file' || activeMedia?.asset?.mimeType?.includes('video') ? (
                <video 
                  src={activeMedia.asset.url} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain"
                />
              ) : (
                <img 
                  src={activeMedia ? urlFor(activeMedia.asset).width(1000).url() : ''} 
                  alt={product.title} 
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              )}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {product.images?.map((media) => (
                <button
                  key={media._key}
                  onClick={() => setActiveMedia(media)}
                  className={`w-20 h-20 flex-shrink-0 border-2 rounded-md overflow-hidden relative ${
                    activeMedia?._key === media._key ? 'border-blue-600' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {(media._type === 'file' || media.asset?.mimeType?.includes('video')) ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
                         <PlayCircle size={24} />
                      </div>
                  ) : (
                    <img 
                      src={urlFor(media.asset).width(150).url()} 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 2. INFORMAÇÕES DE VENDA E FRETE CLICÁVEL */}
          <div className="lg:w-2/5 p-8 flex flex-col">
            <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">{product.title}</h1>
            <div className="mb-6">
              {product.oldPrice > product.price && (
                <span className="text-gray-400 line-through text-sm">
                  De: {formatCurrency(product.oldPrice)}
                </span>
              )}
              <div className="text-4xl font-black text-blue-600">
                {formatCurrency(product.price)}
              </div>
             <p className="text-sm text-gray-500 mt-1">em até 12x de {formatCurrency(product.price / 12)}</p>
            </div>

            {/* FRETE */}
            <div className="bg-gray-50 p-5 rounded-lg mb-6 border border-gray-200">
              <p className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2">
                <Truck size={18} /> Calcular Frete e Prazo
              </p>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  placeholder="00000-000"
                  maxLength={9}
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-blue-500 font-mono"
                />
                <button 
                  onClick={handleCalculateShipping}
                  disabled={calculating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded text-sm transition-colors disabled:opacity-50 min-w-[60px]"
                >
                  {calculating ? '...' : 'OK'}
                </button>
              </div>

              {shippingOptions && Array.isArray(shippingOptions) && (
                <div className="space-y-2 mt-3 border-t border-gray-200 pt-3">
                  {shippingOptions.length > 0 ? shippingOptions.filter(o => !o.error).map((opt, idx) => {
                    const isSelected = selectedShipping?.name === opt.name;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setShipping(opt)} 
                        className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600 shadow-sm' : 'border-gray-100 bg-white hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {opt.company?.picture && <img src={opt.company.picture} alt={opt.name} className="h-6 w-12 object-contain mix-blend-multiply" />}
                          <div>
                            <p className="text-xs font-bold text-gray-800">{opt.name}</p>
                            <p className="text-[10px] text-gray-500">{opt.custom_delivery_range?.max || opt.delivery_range?.max} dias úteis</p>
                          </div>
                        </div>
                        <p className={`font-bold text-sm ${isSelected ? 'text-blue-700' : 'text-green-700'}`}>
                          {parseFloat(opt.price) === 0 ? 'Grátis' : formatCurrency(opt.price)}
                        </p>
                      </div>
                    )
                  }) : <p className="text-xs text-red-500 text-center py-2">Nenhuma transportadora disponível.</p>}
                </div>
              )}
            </div>

            {/* BOTÕES DE COMPRA INTEGRADOS */}
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleBuyNow}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-black text-lg uppercase flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform active:scale-95"
              >
                <ShoppingCart /> Comprar Agora
              </button>
              
              <button 
                onClick={() => {
                  addItem({ ...product, image: product.images?.[0] ? urlFor(product.images[0].asset).url() : '' });
                  alert("Produto adicionado ao carrinho!");
                }}
                className="w-full border-2 border-crocus-vivid text-crocus-vivid hover:bg-crocus-light/10 py-3 rounded-lg font-bold text-sm uppercase transition-all flex items-center justify-center gap-2"
              >
                Adicionar ao Carrinho
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 justify-center mt-4">
              <ShieldCheck size={16} /> Compra 100% Segura e Garantida
            </div>
          </div>
        </div>

        {/* DESCRIÇÃO E ESPECIFICAÇÕES */}
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-gray-100 prose prose-blue max-w-none">
            <h3 className="text-xl font-black uppercase mb-6 border-b pb-2">Descrição do Produto</h3>
            {product.description ? (
              <PortableText value={product.description} components={myPortableTextComponents} />
            ) : <p className="text-gray-400 italic">Sem descrição detalhada.</p>}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit sticky top-24">
            <h3 className="text-sm font-black uppercase mb-4 text-gray-500">Ficha Técnica</h3>
            <div className="divide-y divide-gray-100">
              {product.specifications?.map((spec, idx) => (
                <div key={idx} className="py-3 flex justify-between text-sm">
                  <span className="font-bold text-gray-700">{spec.label}</span>
                  <span className="text-gray-500 text-right">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}