import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from "@sanity/client";
import { PortableText } from '@portabletext/react';
import { 
  MapPin, Calendar, ShieldCheck, ArrowRight, Plane, 
  CheckCircle, XCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import useCartStore from '../store/useCartStore';

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

// ==========================================
// RENDERIZADOR INTELIGENTE (LIMPADOR DE HTML)
// ==========================================
const cleanHTML = (html) => {
  if (!html) return '';
  // Substitui <br> e </p> por quebras de linha reais
  let text = html.replace(/<br\s*[\/]?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
  // Remove todas as outras tags HTML e o &nbsp;
  text = text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  return text.trim();
};

const SafeContent = ({ content }) => {
  if (!content) return <p className="text-gray-500 italic py-4">Informação não disponível.</p>;

  // Se for Array de blocos do Sanity (Padrão)
  if (Array.isArray(content)) {
    // Vamos verificar se o primeiro bloco tem muito HTML escondido dentro dele (caso do robô)
    const firstBlockText = content[0]?.children?.[0]?.text || '';
    if (firstBlockText.includes('<p>') || firstBlockText.includes('<strong>')) {
      const fullText = content.map(block => block.children.map(c => c.text).join('')).join('\n');
      return <div className="prose prose-sm text-gray-600 max-w-none whitespace-pre-line">{cleanHTML(fullText)}</div>;
    }
    return <div className="prose prose-sm text-gray-600 max-w-none"><PortableText value={content} /></div>;
  }

  // Se for String com HTML (Fallback)
  return <div className="prose prose-sm text-gray-600 max-w-none whitespace-pre-line">{cleanHTML(content)}</div>;
};

// ==========================================
// RENDERIZADOR DO DIA-A-DIA EM SANFONA
// ==========================================
const ItineraryAccordion = ({ content }) => {
  const [openDay, setOpenDay] = useState(null);

  if (!content) return <p className="text-gray-500 italic">Itinerário não disponível.</p>;

  // Transforma o conteúdo bruto em texto limpo
  let fullText = '';
  if (Array.isArray(content)) {
    fullText = content.map(block => block.children.map(c => c.text).join('')).join('\n');
  } else if (typeof content === 'string') {
    fullText = content;
  }
  fullText = cleanHTML(fullText);

  // Lógica Ninja para separar o texto por "Dias" (1º DIA, 2º DIA, etc)
  const daysArray = [];
  const regex = /(\d+º\s*DIA.*?(?=\d+º\s*DIA|$))/gis;
  let match;

  while ((match = regex.exec(fullText)) !== null) {
    const rawMatch = match[0].trim();
    // Separa o título (Ex: "1º DIA – TER – AUCKLAND") do corpo do texto
    const titleMatch = rawMatch.match(/^(.*?)(?:\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : 'Dia da Viagem';
    const description = rawMatch.replace(title, '').trim();
    
    daysArray.push({ title, description });
  }

  // Se a lógica ninja não achar os "Dias", renderiza tudo como texto normal para não ficar branco
  if (daysArray.length === 0) {
    return <div className="prose prose-sm text-gray-600 whitespace-pre-line">{fullText}</div>;
  }

  return (
    <div className="space-y-3 w-full">
      {daysArray.map((day, index) => {
        const isOpen = openDay === index;
        return (
          <div key={index} className={`border rounded-xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-orange-500 bg-orange-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <button 
              onClick={() => setOpenDay(isOpen ? null : index)}
              className="w-full px-5 py-4 flex justify-between items-center text-left focus:outline-none"
            >
              <h3 className="font-bold text-gray-900 pr-4">{day.title}</h3>
              {isOpen ? <ChevronUp className="text-orange-500 flex-shrink-0" size={20}/> : <ChevronDown className="text-gray-400 flex-shrink-0" size={20}/>}
            </button>
            <div className={`px-5 overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 pb-5' : 'max-h-0 opacity-0 pb-0'}`}>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line border-t border-orange-100 pt-4">
                {day.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==========================================
// TELA PRINCIPAL DO TOUR
// ==========================================
export default function TourDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, setShipping } = useCartStore();

  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('itinerary'); 
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    const fetchTour = async () => {
      setLoading(true);
      try {
        const query = `*[_type == "tour" && slug.current == $slug][0]{
          _id, title, price,
          "imageUrl": images[0].asset->url,
          "images": images[].asset->url,
          tags, itinerary, included, excluded
        }`;
        
        const data = await client.fetch(query, { slug });
        if (data) {
          setTour(data);
          if (data.images && data.images.length > 0) setActiveImage(data.images[0]);
        }
      } catch (err) {
        console.error("Erro ao buscar roteiro:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTour();
  }, [slug]);

  const handleBookNow = () => {
    addItem({
      _id: tour._id,
      title: tour.title,
      slug: { current: slug },
      price: tour.price,
      image: tour.imageUrl || activeImage,
      sku: `TOUR-${tour._id.slice(-6)}`,
      variantName: "Pacote Duplo", 
      isTravel: true
    });

    setShipping({
        name: "Emissão Digital (E-Ticket / Voucher)",
        price: 0,
        delivery_time: 1,
        company: "Operadora"
    });

    navigate('/cart');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 rounded-full animate-spin"></div></div>;
  if (!tour) return <div className="p-20 text-center text-gray-500 font-bold">Roteiro não encontrado.</div>;

  return (
    <div className="bg-gray-50 min-h-screen font-sans pb-20">
      
      {/* HEADER DE LUXO */}
      <div className="relative w-full h-[35vh] md:h-[50vh] bg-gray-900">
        <img 
          src={tour.imageUrl || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80'} 
          alt={tour.title} 
          className="w-full h-full object-cover opacity-50" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-10">
           <div className="container mx-auto max-w-6xl">
              {tour.tags && (
                 <div className="flex flex-wrap gap-2 mb-3">
                    {tour.tags.slice(0,4).map((tag, i) => (
                       <span key={i} className="bg-orange-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-wide shadow-md">
                          {tag}
                       </span>
                    ))}
                 </div>
              )}
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2 max-w-4xl drop-shadow-lg">
                 {tour.title}
              </h1>
           </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            
            {/* COLUNA ESQUERDA (Galeria e Conteúdo) */}
            <div className="flex-1 w-full min-w-0">
               
               {/* GALERIA FIXA: VISUALIZADOR GRANDE EM CIMA + MINIATURAS EMBAIXO */}
               {tour.images && tour.images.length > 0 && (
                  <div className="mb-10 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                     {/* FOTO PRINCIPAL (Visualizador) */}
                     <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-gray-100 rounded-xl overflow-hidden mb-2 relative">
                         <img 
                            src={activeImage} 
                            alt="Visualização do Destino" 
                            className="w-full h-full object-cover transition-opacity duration-500" 
                         />
                     </div>
                     
                     {/* MINIATURAS (Scroll horizontal no celular, quebra de linha no desktop) */}
                     {tour.images.length > 1 && (
                         <div className="flex overflow-x-auto md:grid md:grid-cols-6 lg:grid-cols-8 gap-2 scrollbar-hide">
                            {tour.images.map((img, i) => (
                               <button 
                                  key={i} 
                                  onClick={() => setActiveImage(img)} 
                                  className={`flex-shrink-0 w-20 h-14 md:w-full md:h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${activeImage === img ? 'border-orange-500 opacity-100 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100 bg-gray-100'}`}
                               >
                                  <img src={img} className="w-full h-full object-cover" alt={`Foto ${i}`} loading="lazy" />
                               </button>
                            ))}
                         </div>
                     )}
                  </div>
               )}

               {/* Abas de Navegação */}
               <div className="flex gap-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
                  <button onClick={() => setActiveTab('itinerary')} className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === 'itinerary' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Dia a Dia</button>
                  <button onClick={() => setActiveTab('included')} className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === 'included' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>O que inclui</button>
               </div>

               {/* CONTEÚDO DAS ABAS */}
               <div className="bg-white p-6 md:p-8 rounded-b-2xl rounded-tr-2xl shadow-sm border border-gray-100 mt-[-1px]">
                  
                  {activeTab === 'itinerary' && (
                     <div className="w-full animate-in fade-in duration-500">
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                           <MapPin className="text-orange-500"/> Itinerário da Viagem
                        </h2>
                        <ItineraryAccordion content={tour.itinerary} />
                     </div>
                  )}

                  {activeTab === 'included' && (
                     <div className="grid md:grid-cols-2 gap-10 w-full animate-in fade-in duration-500">
                        <div className="bg-green-50/50 p-6 rounded-2xl border border-green-100">
                           <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                              <CheckCircle className="text-green-600" size={20} /> Serviços Inclusos
                           </h3>
                           <SafeContent content={tour.included} />
                        </div>
                        <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100">
                           <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                              <XCircle className="text-red-500" size={20} /> Não Inclusos
                           </h3>
                           <SafeContent content={tour.excluded} />
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* COLUNA DIREITA (Preço e Checkout) */}
            <div className="w-full lg:w-[360px] flex-shrink-0">
               <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100 sticky top-24">
                  <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide mb-6 inline-block border border-orange-100">
                     Pacote Oficial Queensberry
                  </span>
                  
                  <div className="mb-6">
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">A partir de</p>
                     <p className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter truncate">
                        {formatCurrency(tour.price)}
                     </p>
                     <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 mt-4">
                         <p className="text-[10px] font-medium text-gray-500 leading-relaxed text-center">
                            Valores calculados com base no câmbio referencial. Taxas de processamento e impostos locais já inclusos no valor total.
                         </p>
                     </div>
                  </div>

                  <div className="space-y-4 mb-8 pt-6 border-t border-gray-100">
                     <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0"><Calendar size={14}/></div>
                        <span>Saídas Garantidas</span>
                     </div>
                     <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0"><Plane size={14}/></div>
                        <span>Recepção no Destino</span>
                     </div>
                     <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0"><ShieldCheck size={14}/></div>
                        <span>Suporte Operacional</span>
                     </div>
                  </div>

                  <button 
                     onClick={handleBookNow} 
                     className="w-full py-4 bg-gray-900 hover:bg-orange-600 text-white rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-lg transform active:scale-95"
                  >
                     Reservar Agora <ArrowRight size={18} />
                  </button>
               </div>
            </div>

        </div>
      </div>
    </div>
  );
}