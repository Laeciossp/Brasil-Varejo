import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { client, urlFor } from '../lib/sanity';
import { PortableText } from '@portabletext/react'; // O Leitor de Texto Rico
import { ShoppingCart, Truck, ShieldCheck, PlayCircle } from 'lucide-react';

// --- CONFIGURAÇÃO DE COMO EXIBIR O TEXTO RICO ---
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
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState(null); // Controla qual foto/vídeo está grande

  // --- ESTADOS PARA O CÁLCULO DE FRETE ---
  const [cep, setCep] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [shippingOptions, setShippingOptions] = useState(null);

  useEffect(() => {
    const query = `*[_type == "product" && slug.current == $slug][0]{
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
      logistics // Traz peso e dimensões para o cálculo
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

  // --- FUNÇÃO QUE CHAMA O SEU WORKER ---
  const handleCalculateShipping = async () => {
    // Remove traços e espaços para validar
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) return alert("Digite um CEP válido com 8 dígitos");
    
    setCalculating(true);
    setShippingOptions(null); // Limpa resultados anteriores

    try {
      // URL do seu Worker local (quando subir pra nuvem, troque pelo link .workers.dev)
      const workerUrl = 'http://localhost:8787/api/shipping'; 

      const response = await fetch(workerUrl, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cepDestino: cleanCep,
          items: [{ 
            // Pega o peso do Sanity ou usa 0.5kg como padrão
            weight: product.logistics?.weight || 0.5, 
            quantity: 1 
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      // Se deu tudo certo, salva as opções para exibir
      setShippingOptions(data);
      
    } catch (err) {
      console.error(err);
      alert("Erro ao calcular frete. Verifique se o Worker está rodando (npm run dev na pasta worker).");
    } finally {
      setCalculating(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-gray-400">Carregando detalhes...</div>;
  if (!product) return <div className="p-20 text-center text-red-500">Produto não encontrado.</div>;

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* --- BLOCO SUPERIOR: GALERIA E PREÇO --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col lg:flex-row mb-10">
          
          {/* 1. GALERIA MULTIMÍDIA */}
          <div className="lg:w-3/5 p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
            {/* Mídia Principal (Grande) */}
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

            {/* Miniaturas (Carrossel) */}
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

          {/* 2. INFORMAÇÕES DE VENDA */}
          <div className="lg:w-2/5 p-8 flex flex-col">
            <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">{product.title}</h1>
            
            <div className="mb-6">
              {product.oldPrice > product.price && (
                <span className="text-gray-400 line-through text-sm">De: R$ {product.oldPrice?.toFixed(2)}</span>
              )}
              <div className="text-4xl font-black text-blue-600">
                R$ {product.price?.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                em até 12x de R$ {(product.price / 12).toFixed(2)} sem juros
              </p>
            </div>

            {/* --- CALCULADORA DE FRETE (NOVA) --- */}
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

              {/* LISTA DE OPÇÕES (SÓ APARECE DEPOIS DE CALCULAR) */}
              {shippingOptions && (
                <div className="space-y-2 mt-3 animate-fade-in border-t border-gray-200 pt-3">
                  {shippingOptions.map((opt, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        {opt.logo ? (
                          <img src={opt.logo} alt={opt.company} className="h-6 w-12 object-contain mix-blend-multiply" />
                        ) : (
                          <Truck size={20} className="text-gray-400"/>
                        )}
                        <div>
                          <p className="text-xs font-bold text-gray-800">{opt.name}</p>
                          <p className="text-[10px] text-gray-500">
                             {opt.days} dias úteis
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-green-700 text-sm">
                        {opt.price === 0 ? 'Grátis' : `R$ ${opt.price.toFixed(2)}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              <a 
                href="https://buscacepinter.correios.com.br/app/endereco/index.php" 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] text-gray-400 underline block text-right mt-1 hover:text-blue-600"
              >
                Não sei meu CEP
              </a>
            </div>

            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-black text-lg uppercase flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl mb-4 transform active:scale-95">
              <ShoppingCart /> Comprar Agora
            </button>

            <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
              <ShieldCheck size={16} /> Compra 100% Segura e Garantida
            </div>
          </div>
        </div>

        {/* --- BLOCO INFERIOR: DESCRIÇÃO RICA E ESPECIFICAÇÕES --- */}
        <div className="grid lg:grid-cols-3 gap-10">
          
          {/* Coluna Esquerda: Descrição (Blog Post) */}
          <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-gray-100 prose prose-blue max-w-none">
            <h3 className="text-xl font-black uppercase mb-6 border-b pb-2">Descrição do Produto</h3>
            
            {product.description ? (
              <PortableText value={product.description} components={myPortableTextComponents} />
            ) : (
              <p className="text-gray-400 italic">Sem descrição detalhada.</p>
            )}
          </div>

          {/* Coluna Direita: Tabela Técnica */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit sticky top-24">
            <h3 className="text-sm font-black uppercase mb-4 text-gray-500">Ficha Técnica</h3>
            {product.specifications?.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {product.specifications.map((spec, idx) => (
                  <div key={idx} className="py-3 flex justify-between text-sm">
                    <span className="font-bold text-gray-700">{spec.label}</span>
                    <span className="text-gray-500 text-right">{spec.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Nenhuma especificação cadastrada.</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}