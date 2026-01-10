import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { client, urlFor } from '../lib/sanity';
import { PortableText } from '@portabletext/react'; 
import { ShoppingCart, Truck, ShieldCheck, PlayCircle, Star, ArrowRight } from 'lucide-react'; 
import { formatCurrency } from '../lib/utils';
import useCartStore from '../store/useCartStore';

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
      freeShipping,
      logistics {
        width, height, length, weight
      }
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

  const handleCalculateShipping = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return alert("Digite um CEP válido.");
    
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
            id: product._id, 
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

  const handleBuyNow = () => {
    if (!product) return;
    if (!selectedShipping) return alert("Calcule o frete para continuar.");

    const cartItem = {
      ...product,
      image: product.images?.[0] ? urlFor(product.images[0].asset).url() : ''
    };

    addItem(cartItem);
    window.location.href = '/cart'; 
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-sm font-medium text-gray-400 tracking-widest uppercase">Carregando...</div>;
  if (!product) return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Produto indisponível.</div>;

  const isFreeShipping = product.freeShipping === true;

  return (
    <div className="bg-gray-50 min-h-screen py-10 font-sans selection:bg-blue-100">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col lg:flex-row mb-10">
          
          {/* FOTOS */}
          <div className="lg:w-3/5 p-8 border-r border-gray-50">
            <div className="aspect-square w-full bg-white rounded-xl flex items-center justify-center mb-6 relative overflow-hidden">
              {activeMedia?._type === 'file' || activeMedia?.asset?.mimeType?.includes('video') ? (
                <video src={activeMedia.asset.url} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <img 
                  src={activeMedia ? urlFor(activeMedia.asset).width(1200).url() : ''} 
                  alt={product.title} 
                  className="w-full h-full object-contain mix-blend-multiply transition-transform hover:scale-105 duration-500"
                />
              )}
            </div>

            <div className="flex gap-3 overflow-x-auto justify-center pb-2">
              {product.images?.map((media) => (
                <button
                  key={media._key}
                  onClick={() => setActiveMedia(media)}
                  className={`w-16 h-16 flex-shrink-0 border rounded-lg overflow-hidden transition-all ${
                    activeMedia?._key === media._key ? 'border-blue-600 ring-1 ring-blue-600' : 'border-gray-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  {(media._type === 'file' || media.asset?.mimeType?.includes('video')) ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white"><PlayCircle size={20} /></div>
                  ) : (
                    <img src={urlFor(media.asset).width(150).url()} className="w-full h-full object-cover" alt="Thumb" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* INFORMAÇÕES */}
          <div className="lg:w-2/5 p-8 lg:p-12 flex flex-col justify-center bg-white">
            
            <div className="flex items-center gap-2 mb-3">
                <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <span className="text-xs text-gray-400 font-medium">(4.9)</span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-6">
              {product.title}
            </h1>

            {/* PREÇO E FRETE GRÁTIS LIMPO */}
            <div className="mb-8">
              {/* Etiqueta de Frete Grátis Fina e Elegante */}
              {isFreeShipping && (
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide mb-3 border border-emerald-100">
                   <Truck size={12} strokeWidth={2.5} /> Frete Grátis Brasil
                </div>
              )}

              {product.oldPrice > product.price && (
                <span className="text-gray-400 line-through text-sm font-medium block">
                  De: {formatCurrency(product.oldPrice)}
                </span>
              )}
              
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-blue-600 tracking-tight">
                  {formatCurrency(product.price)}
                </span>
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                em até <span className="font-bold text-gray-900">12x</span> de <span className="font-bold text-gray-900">{formatCurrency(product.price / 12)}</span>
              </p>
            </div>

            {/* CÁLCULO DE FRETE */}
            <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <label className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-3 block">
                Calcular Entrega
              </label>
              
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  placeholder="Seu CEP"
                  maxLength={9}
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button 
                  onClick={handleCalculateShipping}
                  disabled={calculating}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 py-3 rounded-lg text-xs uppercase tracking-wide transition-all disabled:opacity-50"
                >
                  {calculating ? '...' : 'OK'}
                </button>
              </div>

              {shippingOptions && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  {shippingOptions.length > 0 ? shippingOptions.filter(o => !o.error).map((opt, idx) => {
                    const isSelected = selectedShipping?.name === opt.name;
                    const isFreeOpt = parseFloat(opt.price) === 0 || opt.name === 'FRETE GRÁTIS';

                    return (
                      <div 
                        key={idx} 
                        onClick={() => setShipping(opt)} 
                        className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50/50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isFreeOpt ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                             <Truck size={14} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-700 uppercase block">{opt.name}</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase">{opt.delivery_time} dias úteis</span>
                          </div>
                        </div>
                        <div>
                            {isFreeOpt ? (
                                <span className="text-emerald-600 text-xs font-bold uppercase">Grátis</span>
                            ) : (
                                <span className="text-gray-700 text-sm font-bold">{formatCurrency(opt.price)}</span>
                            )}
                        </div>
                      </div>
                    )
                  }) : (
                    <p className="text-xs text-red-500 mt-2 font-medium">CEP não encontrado.</p>
                  )}
                </div>
              )}
              <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer" className="text-[10px] text-gray-400 hover:text-blue-600 underline block text-right mt-2">Não sei meu CEP</a>
            </div>

            <button 
              onClick={handleBuyNow}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 transform hover:-translate-y-0.5 active:scale-95"
            >
              Comprar Agora <ArrowRight size={18} />
            </button>
            
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 uppercase font-bold mt-6 tracking-wide">
              <ShieldCheck size={14} className="text-emerald-500" /> Compra Segura
            </div>
          </div>
        </div>

        {/* DESCRIÇÃO */}
        <div className="bg-white p-8 lg:p-12 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 border-b pb-4">Detalhes do Produto</h3>
            <div className="prose prose-gray max-w-none text-gray-600">
                {product.description ? (
                <PortableText value={product.description} components={myPortableTextComponents} />
                ) : <p className="italic text-gray-400">Sem descrição.</p>}
            </div>
            
            {product.specifications && (
                <div className="mt-10 pt-10 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">Especificações</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                        {product.specifications.map((spec, idx) => (
                            <div key={idx} className="flex justify-between p-4 bg-gray-50 rounded-lg text-sm">
                                <span className="font-medium text-gray-500">{spec.label}</span>
                                <span className="font-bold text-gray-900">{spec.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}