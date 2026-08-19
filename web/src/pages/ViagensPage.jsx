import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from "@sanity/client";
import { formatCurrency } from '../lib/utils';
import useCartStore from '../store/useCartStore';
import { 
  Plane, Bus, ShieldCheck, ArrowRight, ExternalLink, Briefcase, 
  Building, Car, MapPin, Compass, Train, Star, Search,
  Globe, Castle, Mountain, Sun, Waves, Palmtree, Filter, X,
  Snowflake, Ship, Calendar, Tag, CheckCircle, TreePine, Gift, Coffee, Wand2
} from 'lucide-react';

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

// ==========================================
// 1. SUBCOMPONENTE: ROTEIROS QUEENSBERRY (COM FILTROS E TEMÁTICAS)
// ==========================================
const RoteirosExclusivos = () => {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados dos Filtros
  const [activeTheme, setActiveTheme] = useState('Todos');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const { addItem, setShipping } = useCartStore();
  const navigate = useNavigate();

  // Menu de Temáticas (Dados reais importados da Queensberry)
  const themes = [
    { id: 'Todos', label: 'Todos os Roteiros', icon: Globe },
    { id: 'Disney', label: 'Disney', icon: Wand2 },
    { id: 'Férias na neve', label: 'Férias na Neve', icon: Snowflake },
    { id: 'CRUZEIROS', label: 'Cruzeiros', icon: Ship },
    { id: 'RESORTS BRASIL', label: 'Resorts Brasil', icon: Sun },
    { id: 'Brasil IN', label: 'Brasil IN', icon: MapPin },
    { id: 'Parques Nacionais', label: 'Parques Nacionais', icon: TreePine },
    { id: 'Aéreo + Hotel', label: 'Aéreo + Hotel', icon: Briefcase },
    { id: 'Viagens personalizadas', label: 'Personalizadas', icon: Compass },
    { id: 'Tours regulares', label: 'Tours Regulares', icon: Bus },
    { id: 'GBM - Europa 2026', label: 'GBM Europa 2026', icon: Castle },
    { id: 'GBM - 4 Continentes 2026', label: '4 Continentes', icon: Globe },
    { id: 'GBM - Slow Travel 2026', label: 'Slow Travel', icon: Coffee },
    { id: 'GBM - Natal e Réveillon 2026/2027', label: 'Natal e Réveillon', icon: Gift },
    { id: 'GBM - SAÍDAS GARANTIDAS', label: 'Saídas Garantidas', icon: CheckCircle },
    { id: 'GBM - Baixa Temporada 2026', label: 'Baixa Temp. 2026', icon: Tag },
    { id: 'GBM - Baixa Temporada 2027', label: 'Baixa Temp. 2027', icon: Tag },
  ];

  useEffect(() => {
    const fetchTours = async () => {
      try {
        // CORREÇÃO DEFINITIVA: 
        // 1. Aceita isActive vazio ou true
        // 2. Transforma o campo "tematicas" do robô na variável "tags" do site
        const query = `*[_type == "tour" && (!defined(isActive) || isActive == true) && !(_id in path("drafts.**"))] | order(_createdAt desc) {
          _id, 
          title, 
          price,
          "slug": slug.current,
          "imageUrl": images[0].asset->url,
          "tags": coalesce(tags, tematicas, []) 
        }`;
        
        const data = await client.fetch(query);
        setTours(data);
      } catch (err) {
        console.error("Erro ao buscar roteiros:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTours();
  }, []);

  const handleQuickBook = (e, tour) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      _id: tour._id,
      title: tour.title,
      slug: { current: tour.slug },
      price: tour.price,
      image: tour.imageUrl,
      sku: `TOUR-${tour._id.slice(-6)}`,
      variantName: "Pacote Duplo",
      isTravel: true
    });
    setShipping({ name: "Emissão Digital (E-Ticket / Voucher)", price: 0, delivery_time: 1, company: "Operadora" });
    alert("Roteiro adicionado! Finalize a reserva no carrinho.");
    navigate('/cart');
  };

  // Extrai todas as tags (Países) que não são os Temas Principais
  const availableCountries = useMemo(() => {
    const macroThemes = themes.map(t => t.id);
    const allTags = tours.flatMap(t => t.tags || []);
    const uniqueTags = [...new Set(allTags)].filter(tag => !macroThemes.includes(tag) && tag.length > 2);
    return uniqueTags.sort();
  }, [tours]);

  const toggleCountry = (country) => {
    setSelectedCountries(prev => 
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
  };

  const handlePriceChange = (e) => {
    setPriceRange({ ...priceRange, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setPriceRange({ min: '', max: '' });
    setSelectedCountries([]);
    setActiveTheme('Todos');
    setSearchTerm('');
  };

  // Motor de Filtragem
  const filteredTours = tours.filter(tour => {
    const matchSearch = tour.title.toLowerCase().includes(searchTerm.toLowerCase()) || (tour.tags && tour.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchTheme = activeTheme === 'Todos' || (tour.tags && tour.tags.includes(activeTheme));
    const tourPrice = tour.price || 0;
    const matchMin = priceRange.min ? tourPrice >= parseFloat(priceRange.min) : true;
    const matchMax = priceRange.max ? tourPrice <= parseFloat(priceRange.max) : true;
    const matchCountry = selectedCountries.length === 0 || (tour.tags && selectedCountries.some(c => tour.tags.includes(c)));

    return matchSearch && matchTheme && matchMin && matchMax && matchCountry;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex flex-col">
       
       {/* 1. MENU DE TEMÁTICAS (Estilo Airbnb) */}
       <div className="w-full overflow-x-auto scrollbar-hide mb-8 pb-4 border-b border-gray-100">
          <div className="flex gap-4 px-2 min-w-max">
             {themes.map(theme => {
                const Icon = theme.icon;
                const isActive = activeTheme === theme.id;
                return (
                   <button 
                      key={theme.id}
                      onClick={() => setActiveTheme(theme.id)}
                      className={`flex flex-col items-center gap-2 pb-2 border-b-2 transition-all px-2 ${
                         isActive ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                      }`}
                   >
                      <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                      <span className="text-[11px] font-bold whitespace-nowrap">{theme.label}</span>
                   </button>
                );
             })}
          </div>
       </div>

       {/* BARRA DE TÍTULO E BOTÃO MOBILE */}
       <div className="flex justify-between items-center mb-6">
          <div>
             <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tight">
               {activeTheme === 'Todos' ? 'Descubra o Mundo' : activeTheme}
             </h2>
             <p className="text-gray-500 text-sm">{filteredTours.length} roteiros encontrados</p>
          </div>
          <button 
             onClick={() => setShowMobileFilters(true)} 
             className="lg:hidden flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 shadow-sm"
          >
             <Filter size={16} /> Filtros
          </button>
       </div>

       {/* 2. LAYOUT COM SIDEBAR E GRID */}
       <div className="flex flex-col lg:flex-row gap-8 items-start relative">
          
          {/* SIDEBAR LATERAL (Filtros) */}
          <aside className={`lg:w-64 flex-shrink-0 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm ${showMobileFilters ? 'fixed inset-0 z-50 overflow-y-auto m-0 rounded-none' : 'hidden lg:block sticky top-24'}`}>
             <div className="flex justify-between items-center mb-6 lg:hidden">
                <h3 className="font-black text-xl">Filtros</h3>
                <button onClick={() => setShowMobileFilters(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
             </div>

             <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide flex items-center gap-2"><Search size={16}/> Busca</h3>
                <input 
                   type="text" 
                   placeholder="Nome do roteiro..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-orange-500 outline-none transition-colors"
                />
             </div>

             <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Faixa de Preço</h3>
                <div className="flex gap-2 items-center">
                   <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                      <input type="number" name="min" placeholder="Mínimo" value={priceRange.min} onChange={handlePriceChange} className="w-full pl-8 pr-2 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-orange-500 outline-none"/>
                   </div>
                   <span className="text-gray-300">-</span>
                   <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                      <input type="number" name="max" placeholder="Máximo" value={priceRange.max} onChange={handlePriceChange} className="w-full pl-8 pr-2 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-orange-500 outline-none"/>
                   </div>
                </div>
             </div>

             {availableCountries.length > 0 && (
                <div className="mb-6">
                   <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">País / Região</h3>
                   <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                      {availableCountries.map(country => (
                         <label key={country} className="flex items-center gap-3 cursor-pointer group select-none hover:bg-gray-50 p-2 rounded-lg transition-colors">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedCountries.includes(country) ? 'bg-orange-600 border-orange-600' : 'border-gray-300 bg-white group-hover:border-orange-400'}`}>
                               {selectedCountries.includes(country) && <span className="text-white text-[10px] font-bold">✓</span>}
                            </div>
                            <span className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors line-clamp-1">{country}</span>
                         </label>
                      ))}
                   </div>
                </div>
             )}

             {(selectedCountries.length > 0 || priceRange.min || priceRange.max || searchTerm || activeTheme !== 'Todos') && (
                <div className="pt-4 border-t border-gray-100">
                  <button onClick={clearFilters} className="w-full text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 py-3 rounded-xl transition-all uppercase tracking-wide">Limpar Filtros</button>
                </div>
             )}
          </aside>

          {/* GRID DE RESULTADOS */}
          <div className="flex-1 w-full">
             {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                   {[...Array(6)].map((_, i) => <div key={i} className="h-72 bg-white border border-gray-100 shadow-sm animate-pulse rounded-2xl"></div>)}
                </div>
             ) : filteredTours.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                   {filteredTours.map((tour) => (
                      <Link 
                         key={tour._id} 
                         to={`/roteiro/${tour.slug}`} 
                         className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-orange-300 transition-all duration-300 group flex flex-col h-full relative"
                      >
                         <div className="h-56 w-full relative overflow-hidden bg-gray-900">
                            {tour.imageUrl ? (
                               <img src={tour.imageUrl} alt={tour.title} className="w-full h-full object-cover opacity-90 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-400"><Compass size={40}/></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            
                            {/* Tags sobre a imagem */}
                            <div className="absolute bottom-4 left-4 right-4">
                               {tour.tags && tour.tags.length > 0 && (
                                  <span className="text-[10px] font-black uppercase text-white bg-orange-600/90 backdrop-blur-sm px-2 py-1 rounded tracking-wider line-clamp-1 w-fit mb-2 block">
                                     {tour.tags.slice(0, 2).join(' • ')}
                                  </span>
                               )}
                               <h3 className="font-bold text-white text-lg leading-tight line-clamp-2 drop-shadow-md">
                                  {tour.title}
                               </h3>
                            </div>
                         </div>

                         <div className="p-5 flex flex-col flex-1 bg-white">
                            <div className="mt-auto flex justify-between items-end">
                               <div>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Valor por pessoa</p>
                                  <p className="text-2xl font-black text-gray-900 leading-none">{formatCurrency(tour.price)}</p>
                               </div>
                               <button 
                                  onClick={(e) => handleQuickBook(e, tour)}
                                  className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm transform active:scale-95 flex-shrink-0 border border-orange-100"
                                  title="Reservar Rapidamente"
                               >
                                  <ArrowRight size={20} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                               </button>
                            </div>
                         </div>
                      </Link>
                   ))}
                </div>
             ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                   <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Compass size={40} className="text-gray-300" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-800">Nenhum roteiro atende aos seus filtros.</h3>
                   <p className="text-gray-500 mt-2 mb-6">Tente ajustar o preço ou remover alguns países.</p>
                   <button onClick={clearFilters} className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition-colors">Limpar Filtros</button>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

// ==========================================
// 2. SUBCOMPONENTE: WIDGET DA KIWI (PESQUISA PRINCIPAL)
// ==========================================
const KiwiWidget = () => {
  const widgetContainerRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://widgets.kiwi.com/scripts/widget-search-iframe.js";
    script.async = true;
    script.setAttribute("data-affilid", "lptbenspalastorewidget");
    script.setAttribute("data-from", "sao-paulo_sp_br");
    script.setAttribute("data-return", "anytime");
    script.setAttribute("data-transport-types", "FLIGHT");

    if (widgetContainerRef.current) widgetContainerRef.current.appendChild(script);

    return () => {
      if (widgetContainerRef.current && widgetContainerRef.current.contains(script)) {
        widgetContainerRef.current.removeChild(script);
      }
    };
  }, []);

  return <div id="widget-holder" ref={widgetContainerRef} className="w-full h-full min-h-[600px]"></div>;
};

// ==========================================
// 3. SUBCOMPONENTE: WIDGET DA KIWI (VITRINE DE OFERTAS)
// ==========================================
const KiwiSuggestionsWidget = () => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>body { margin: 0; padding: 0; background-color: transparent; }</style>
    </head>
    <body>
      <div id="widget-holder"></div>
      <script data-width="100%" data-affilid="lptbenspacotes" data-from="sao-paulo_sp_br,rio-de-janeiro_rj_br,belo-horizonte_mg_br,brasilia_df_br,recife_pe_br" data-return="anytime" data-transport-types="FLIGHT" data-results-only="true" src="https://widgets.kiwi.com/scripts/widget-search-iframe.js"></script>
    </body>
    </html>
  `;
  return <iframe srcDoc={htmlContent} className="w-full min-h-[600px] md:min-h-[800px] border-0 rounded-xl" title="Ofertas Imperdíveis de Passagens" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation allow-popups-to-escape-sandbox"/>;
};

// ==========================================
// 4. COMPONENTE AUXILIAR PARA RENDERIZAR OS PARCEIROS (IFRAMES)
// ==========================================
const PartnerIframe = ({ title, url, noticeText, themeColor }) => {
  const themeClasses = {
    green: "bg-green-50 border-green-100 text-green-800",
    blue: "bg-blue-50 border-blue-100 text-blue-800",
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-800",
    orange: "bg-orange-50 border-orange-100 text-orange-800"
  };
  const currentTheme = themeClasses[themeColor] || themeClasses.indigo;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 w-full h-full flex-grow flex flex-col">
       <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 text-center uppercase italic tracking-tight">{title}</h2>
       <div className={`p-4 rounded-xl mb-4 flex justify-between items-center border ${currentTheme}`}>
         <p className="text-sm font-medium">{noticeText}</p>
         <a href={url} target="_blank" rel="noreferrer" className="hidden md:flex items-center gap-1 font-bold hover:underline opacity-80 hover:opacity-100">
            Abrir em tela cheia <ExternalLink size={16}/>
         </a>
       </div>
       <iframe src={url} className="w-full flex-grow min-h-[700px] border-0 rounded-2xl bg-gray-50 shadow-inner" title={title}/>
    </div>
  );
};

// ==========================================
// 5. SUBCOMPONENTE EXCLUSIVO RENTCARS
// ==========================================
const RentcarsWidget = () => {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 w-full h-full flex-grow flex flex-col items-center">
       <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 text-center uppercase italic tracking-tight">Aluguel de Carros (Rentcars)</h2>
       <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-4 rounded-xl mb-6 flex justify-between items-center w-full max-w-[800px]">
         <p className="text-sm font-medium text-center w-full">Compare as melhores locadoras do mundo e garanta o melhor preço.</p>
       </div>
       <div className="w-full max-w-[800px] bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex justify-center items-center p-4 md:p-8">
           <iframe src="https://widgets.rentcars.com/widget-v13.html?requestor=11058&locale=pt-br&utm_source=www.palastore.com.br&utm_medium=afiliado-widget" width="100%" height="450" className="max-w-[600px] w-full" style={{ border: 'none', overflow: 'hidden' }} title="Motor de Busca Rentcars" scrolling="no"></iframe>
       </div>
    </div>
  );
};

// ==========================================
// 6. PÁGINA PRINCIPAL: PALASTORE VIAGENS (WEB)
// ==========================================
export default function ViagensPage() {
  const [activeTab, setActiveTab] = useState('roteiros');

  const menuItems = [
    { id: 'roteiros', label: 'Roteiros Exclusivos', icon: Compass },
    { id: 'voos', label: 'Voos', icon: Plane },
    { id: 'hoteis', label: 'Hotéis', icon: Building },
    { id: 'ofertas_hoteis', label: 'Ofertas Hotéis', icon: Star },
    { id: 'voo_hotel', label: 'Voo + Hotel', icon: Briefcase },
    { id: 'carros', label: 'Carros (Trip)', icon: Car },
    { id: 'rentcars', label: 'Carros (Rent)', icon: Car },
    { id: 'onibus', label: 'Ônibus Nacionais', icon: Bus },
    { id: 'seguros', label: 'Seguros', icon: ShieldCheck },
    { id: 'translado', label: 'Translado', icon: MapPin },
    { id: 'passeios', label: 'Passeios', icon: Compass },
    { id: 'trens', label: 'Trens Internacionais', icon: Train },
  ];

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-20">
      <div className="w-full bg-white shadow-sm mb-8 border-b border-gray-200">
        <img src="/image_0335bf.png" alt="Palastore Viagens" className="w-full h-auto object-cover md:object-contain max-h-[250px] md:max-h-[350px]" />
      </div>

      <div className="max-w-[1440px] mx-auto px-4">
        <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 uppercase tracking-tight italic mb-2">Central de Viagens</h1>
            <p className="text-gray-500 font-medium">Sua próxima aventura começa aqui. Escolha o serviço desejado.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-10">
            {menuItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center p-3 w-[105px] h-[95px] md:w-[120px] md:h-[105px] rounded-2xl transition-all duration-300 shadow-sm border focus:outline-none
                      ${isActive ? 'bg-orange-500 border-orange-500 text-white shadow-orange-500/40 scale-105' : 'bg-white border-gray-100 text-gray-500 hover:border-orange-200 hover:shadow-md hover:text-orange-500'}`}
                >
                  <Icon size={28} className="mb-2" />
                  <span className="text-[11px] md:text-xs font-bold text-center leading-tight">{tab.label}</span>
                </button>
            );
            })}
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-4 md:p-8 border border-gray-100 min-h-[700px] flex flex-col overflow-hidden mb-12">
          {activeTab === 'roteiros' && <RoteirosExclusivos />}
          {activeTab === 'voos' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full flex-grow"><h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 text-center uppercase italic tracking-tight">Passagens Aéreas</h2><KiwiWidget /></div>}
          {activeTab === 'onibus' && <PartnerIframe title="Passagens de Ônibus" url="https://www.awin1.com/cread.php?awinmid=65292&awinaffid=910543" noticeText="Compare e reserve passagens de ônibus para milhares de destinos em todo o Brasil. Processamento seguro via parceiro oficial." themeColor="green" />}
          {activeTab === 'seguros' && <PartnerIframe title="Seguro Viagem" url="https://seguroviagem.app/palastore" noticeText="Viaje protegido com cobertura completa e suporte 24h." themeColor="blue" />}
          {activeTab === 'voo_hotel' && <PartnerIframe title="Pacotes Voo + Hotel" url="https://br.trip.com/packages/?sourceFrom=IBUBundle_home&locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374" noticeText="Economize reservando Voo e Hotel juntos através do nosso parceiro Trip.com." themeColor="indigo" />}
          {activeTab === 'hoteis' && <PartnerIframe title="Reserva de Hotéis" url="https://br.trip.com/hotels/?locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286297" noticeText="As melhores hospedagens ao redor do mundo. Parceria oficial Trip.com." themeColor="indigo" />}
          {activeTab === 'ofertas_hoteis' && <PartnerIframe title="Ofertas Especiais de Hotéis no Brasil" url="https://br.trip.com/hotels/list?flexType=1&cityId=-1&provinceId=0&countryId=19&cityName=&destName=Brasil&searchWord=Brasil&searchType=C&searchValue=140|19**19&checkin=2026-08-17&checkout=2026-08-18&crn=1&adult=2&listFilters=29~1*29*1~2*2,17~3*17*3,80~2~1*80*2&curr=BRL&locale=pt-BR&old=1&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374" noticeText="Aproveite tarifas reduzidas para hospedagens em todo o Brasil. Parceria oficial Trip.com." themeColor="indigo" />}
          {activeTab === 'rentcars' && <RentcarsWidget />}
          {activeTab === 'carros' && <PartnerIframe title="Aluguel de Carros" url="https://br.trip.com/carhire/?channelid=14409&locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374" noticeText="Alugue veículos com as melhores locadoras globais. Processado via Trip.com." themeColor="indigo" />}
          {activeTab === 'translado' && <PartnerIframe title="Translado Aeroporto" url="https://br.trip.com/airport-transfers/?locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374" noticeText="Chegue ao seu destino sem preocupações. Veículos exclusivos Trip.com." themeColor="indigo" />}
          {activeTab === 'passeios' && <PartnerIframe title="Passeios e Ingressos" url="https://br.trip.com/things-to-do/?locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374" noticeText="Compre ingressos para atrações turísticas pelo mundo com nosso parceiro Trip.com." themeColor="indigo" />}
          {activeTab === 'trens' && <PartnerIframe title="Trens Internacionais" url="https://br.trip.com/trains/?locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374" noticeText="Viaje pela Europa e Ásia com os melhores Trens Internacionais. Processado via Trip.com." themeColor="indigo" />}
        </div>

        <div className="w-full mt-12 mb-8">
            <div className="flex items-center gap-4 justify-center mb-8">
               <div className="h-[2px] w-12 bg-orange-500"></div>
               <h2 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tight italic text-center">Ofertas Imperdíveis</h2>
               <div className="h-[2px] w-12 bg-orange-500"></div>
            </div>
            <div className="bg-white rounded-3xl shadow-xl p-4 md:p-8 border border-gray-100">
                <KiwiSuggestionsWidget />
            </div>
        </div>

      </div>
    </div>
  );
}