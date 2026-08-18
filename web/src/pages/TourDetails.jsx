import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from "@sanity/client";
import { PortableText } from '@portabletext/react';
import { 
  MapPin, Calendar, Compass, ShieldCheck, ArrowRight, Plane, 
  ChevronDown, ChevronUp, CheckCircle, XCircle 
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import useCartStore from '../store/useCartStore';

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

// Componente para renderizar blocos do Sanity
const PortableTextHtml = ({ value }) => {
  if (!value) return null;
  return (
    <div className="prose prose-sm text-gray-600 max-w-none">
      <PortableText value={value} />
    </div>
  );
};

export default function TourDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, setShipping } = useCartStore();

  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('itinerary'); 
  const [expandedDay, setExpandedDay] = useState(null);
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    const fetchTour = async () => {
      setLoading(true);
      try {
        const query = `*[_type == "tour" && slug.current == $slug && isActive == true][0]{
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
    // 1. Adiciona o produto ao carrinho com a flag isTravel = true
    addItem({
      _id: tour._id,
      title: tour.title,
      slug: { current: slug },
      price: tour.price,
      image: tour.imageUrl,
      sku: `TOUR-${tour._id.slice(-6)}`,
      variantName: "Pacote Duplo", 
      isTravel: true // <--- A CHAVE MESTRA!
    });

    // 2. Força o frete automático para Viagem
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
      {/* HEADER DE LUXO (IMAGEM EXPANDIDA) */}
      <div className="relative w-full h-[50vh] md:h-[60vh] bg-gray-900 overflow-hidden">
        <img src={activeImage} alt={tour.title} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
           <div className="container mx-auto max-w-6xl flex flex-col md:flex-row gap-6 justify-between items-end">
              <div>
                 {tour.tags && (
                    <div className="flex gap-2 mb-3">
                       {tour.tags.slice(0,3).map((tag, i) => (
                          <span key={i} className="bg-orange-500/80 text-white text-[10px] font-black uppercase px-2 py-1 rounded backdrop-blur-sm tracking-wide">
                             {tag}
                          </span>
                       ))}
                    </div>
                 )}
                 <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2 max-w-3xl drop-shadow-lg">
                    {tour.title}
                 </h1>
              </div>
           </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-10">
            
            {/* COLUNA ESQUERDA (Detalhes e Itinerário) */}
            <div className="flex-1 space-y-8">
               
               {/* Galeria Rápida */}
               {tour.images && tour.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                     {tour.images.map((img, i) => (
                        <button key={i} onClick={() => setActiveImage(img)} className={`w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${activeImage === img ? 'border-orange-500' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                           <img src={img} className="w-full h-full object-cover" />
                        </button>
                     ))}
                  </div>
               )}

               {/* Abas de Navegação */}
               <div className="flex gap-6 border-b border-gray-200">
                  <button onClick={() => setActiveTab('itinerary')} className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'itinerary' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Dia a Dia</button>
                  <button onClick={() => setActiveTab('included')} className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'included' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>O que inclui</button>
               </div>

               {/* CONTEÚDO DAS ABAS */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  
                  {activeTab === 'itinerary' && (
                     <div>
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2"><MapPin className="text-orange-500"/> Itinerário Completo</h2>
                        <div className="space-y-4">
                           {/* Como a estrutura HTML do seu bloco pode variar muito, vamos renderizá-la usando o PortableText */}
                           <PortableTextHtml value={tour.itinerary} />
                        </div>
                     </div>
                  )}

                  {activeTab === 'included' && (
                     <div className="grid md:grid-cols-2 gap-8">
                        <div>
                           <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2 text-green-700">
                              <CheckCircle size={18} /> Serviços Inclusos
                           </h3>
                           <PortableTextHtml value={tour.included} />
                        </div>
                        <div>
                           <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2 text-red-600">
                              <XCircle size={18} /> Não Inclusos
                           </h3>
                           <PortableTextHtml value={tour.excluded} />
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* COLUNA DIREITA (Preço e Checkout) */}
            <div className="lg:w-[380px]">
               <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 sticky top-8">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide mb-4 inline-block">
                     Roteiro Regular Premium
                  </span>
                  
                  <div className="mb-6">
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Valor por pessoa (Duplo)</p>
                     <p className="text-4xl font-black text-gray-900 tracking-tighter">
                        {formatCurrency(tour.price)}
                     </p>
                     <p className="text-xs font-medium text-gray-400 mt-2">Valores calculados com base no câmbio referencial. Taxas de processamento e impostos locais já inclusos no valor total.</p>
                  </div>

                  <div className="space-y-4 mb-6 pt-6 border-t border-gray-100">
                     <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <Calendar size={18} className="text-gray-400" />
                        <span>Saídas Garantidas ao longo do ano</span>
                     </div>
                     <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <Plane size={18} className="text-gray-400" />
                        <span>Recepção e Translado no destino</span>
                     </div>
                     <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <ShieldCheck size={18} className="text-gray-400" />
                        <span>Suporte e Garantia Operacional</span>
                     </div>
                  </div>

                  <button 
                     onClick={handleBookNow} 
                     className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-lg shadow-orange-500/30"
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