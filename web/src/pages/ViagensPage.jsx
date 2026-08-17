import React, { useState, useEffect, useRef } from 'react';
import { 
  Plane, 
  Bus, 
  ShieldCheck, 
  ArrowRight, 
  ExternalLink,
  Briefcase,
  Building,
  Car,
  MapPin,
  Compass,
  Train,
  Star
} from 'lucide-react';

// ==========================================
// 1. SUBCOMPONENTE: WIDGET DA KIWI (PESQUISA PRINCIPAL)
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

    if (widgetContainerRef.current) {
      widgetContainerRef.current.appendChild(script);
    }

    return () => {
      if (widgetContainerRef.current && widgetContainerRef.current.contains(script)) {
        widgetContainerRef.current.removeChild(script);
      }
    };
  }, []);

  return (
    <div id="widget-holder" ref={widgetContainerRef} className="w-full h-full min-h-[600px]">
      {/* Script da Kiwi renderiza o buscador aqui */}
    </div>
  );
};

// ==========================================
// 2. SUBCOMPONENTE: WIDGET DA KIWI (VITRINE DE OFERTAS)
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
      <script 
        data-width="100%" 
        data-affilid="lptbenspacotes" 
        data-from="sao-paulo_sp_br,rio-de-janeiro_rj_br,belo-horizonte_mg_br,brasilia_df_br,recife_pe_br" 
        data-return="anytime" 
        data-transport-types="FLIGHT" 
        data-results-only="true" 
        src="https://widgets.kiwi.com/scripts/widget-search-iframe.js">
      </script>
    </body>
    </html>
  `;

  return (
    <iframe 
      srcDoc={htmlContent}
      className="w-full min-h-[600px] md:min-h-[800px] border-0 rounded-xl"
      title="Ofertas Imperdíveis de Passagens"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation allow-popups-to-escape-sandbox"
    />
  );
};

// ==========================================
// 3. COMPONENTE AUXILIAR PARA RENDERIZAR OS PARCEIROS (IFRAMES)
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
       <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 text-center uppercase italic tracking-tight">
         {title}
       </h2>
       
       <div className={`p-4 rounded-xl mb-4 flex justify-between items-center border ${currentTheme}`}>
         <p className="text-sm font-medium">{noticeText}</p>
         <a href={url} target="_blank" rel="noreferrer" className="hidden md:flex items-center gap-1 font-bold hover:underline opacity-80 hover:opacity-100">
            Abrir em tela cheia <ExternalLink size={16}/>
         </a>
       </div>

       <iframe 
         src={url} 
         className="w-full flex-grow min-h-[700px] border-0 rounded-2xl bg-gray-50 shadow-inner"
         title={title}
       />
    </div>
  );
};

// ==========================================
// 4. SUBCOMPONENTE EXCLUSIVO RENTCARS (<OBJECT>)
// ==========================================
const RentcarsWidget = () => {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 w-full h-full flex-grow flex flex-col items-center">
       <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 text-center uppercase italic tracking-tight">
         Aluguel de Carros (Rentcars)
       </h2>
       
       <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-4 rounded-xl mb-6 flex justify-between items-center w-full max-w-[800px]">
         <p className="text-sm font-medium text-center w-full">Compare as melhores locadoras do mundo e garanta o melhor preço.</p>
       </div>

       {/* O Container do Widget com sombra e bordas arredondadas para um visual premium */}
       <div className="w-full max-w-[800px] bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex justify-center items-center p-4 md:p-8">
           <object 
             data="https://widgets.rentcars.com/widget-v13.html?requestor=11058&locale=pt-br&utm_source=www.palastore.com.br&utm_medium=afiliado-widget" 
             width="100%" 
             height="450" 
             className="max-w-[600px] w-full"
             style={{ border: 'none', overflow: 'hidden' }}
           >
           </object>
       </div>
    </div>
  );
};

// ==========================================
// 5. PÁGINA PRINCIPAL: PALASTORE VIAGENS (WEB)
// ==========================================
export default function ViagensPage() {
  const [activeTab, setActiveTab] = useState('voos');

  // Menu de Agência Multinacional com 11 opções (adicionado Rentcars)
  const menuItems = [
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
      
      {/* CABEÇALHO COM A IMAGEM DA PALASTORE VIAGENS */}
      <div className="w-full bg-white shadow-sm mb-8 border-b border-gray-200">
        <img 
          src="/image_0335bf.png" 
          alt="Palastore Viagens" 
          className="w-full h-auto object-cover md:object-contain max-h-[250px] md:max-h-[350px]" 
        />
      </div>

      <div className="max-w-[1440px] mx-auto px-4">
        
        {/* TÍTULO E SUBTÍTULO */}
        <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 uppercase tracking-tight italic mb-2">
            Central de Viagens
            </h1>
            <p className="text-gray-500 font-medium">Sua próxima aventura começa aqui. Escolha o serviço desejado.</p>
        </div>

        {/* ========================================================
            NOVO MENU: GRID DE CARDS ELEGANTES
        ======================================================== */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-10">
            {menuItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center p-3 w-[105px] h-[95px] md:w-[120px] md:h-[105px] rounded-2xl transition-all duration-300 shadow-sm border focus:outline-none
                      ${isActive 
                      ? 'bg-orange-500 border-orange-500 text-white shadow-orange-500/40 scale-105' 
                      : 'bg-white border-gray-100 text-gray-500 hover:border-orange-200 hover:shadow-md hover:text-orange-500'}`}
                >
                  <Icon size={28} className="mb-2" />
                  <span className="text-[11px] md:text-xs font-bold text-center leading-tight">{tab.label}</span>
                </button>
            );
            })}
        </div>

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <div className="bg-white rounded-3xl shadow-xl p-2 md:p-6 border border-gray-100 min-h-[700px] flex flex-col overflow-hidden mb-12">
          
          {activeTab === 'voos' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full flex-grow">
               <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 text-center uppercase italic tracking-tight">
                 Passagens Aéreas
               </h2>
               <KiwiWidget />
            </div>
          )}

          {activeTab === 'onibus' && (
            <PartnerIframe 
              title="Viaje de Ônibus"
              url="https://www.awin1.com/cread.php?awinmid=30765&awinaffid=910543"
              noticeText="Pesquisa e reserva seguras processadas pela FlixBus, parceira oficial."
              themeColor="green"
            />
          )}

          {activeTab === 'seguros' && (
            <PartnerIframe 
              title="Seguro Viagem"
              url="https://seguroviagem.app/palastore"
              noticeText="Viaje protegido com cobertura completa e suporte 24h."
              themeColor="blue"
            />
          )}

          {activeTab === 'voo_hotel' && (
            <PartnerIframe 
              title="Pacotes Voo + Hotel"
              url="https://br.trip.com/packages/?sourceFrom=IBUBundle_home&locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374"
              noticeText="Economize reservando Voo e Hotel juntos através do nosso parceiro Trip.com."
              themeColor="indigo"
            />
          )}

          {activeTab === 'hoteis' && (
            <PartnerIframe 
              title="Reserva de Hotéis"
              url="https://br.trip.com/hotels/?locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286297"
              noticeText="As melhores hospedagens ao redor do mundo. Parceria oficial Trip.com."
              themeColor="indigo"
            />
          )}

          {activeTab === 'ofertas_hoteis' && (
            <PartnerIframe 
              title="Ofertas Especiais de Hotéis no Brasil"
              url="https://br.trip.com/hotels/list?flexType=1&cityId=-1&provinceId=0&countryId=19&cityName=&destName=Brasil&searchWord=Brasil&searchType=C&searchValue=140|19**19&checkin=2026-08-17&checkout=2026-08-18&crn=1&adult=2&listFilters=29~1*29*1~2*2,17~3*17*3,80~2~1*80*2&curr=BRL&locale=pt-BR&old=1&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374"
              noticeText="Aproveite tarifas reduzidas para hospedagens em todo o Brasil. Parceria oficial Trip.com."
              themeColor="indigo"
            />
          )}

          {/* NOVA ABA: Rentcars Widget Elegante */}
          {activeTab === 'rentcars' && (
            <RentcarsWidget />
          )}

          {activeTab === 'carros' && (
            <PartnerIframe 
              title="Aluguel de Carros"
              url="https://br.trip.com/carhire/?channelid=14409&locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374"
              noticeText="Alugue veículos com as melhores locadoras globais. Processado via Trip.com."
              themeColor="indigo"
            />
          )}

          {activeTab === 'translado' && (
            <PartnerIframe 
              title="Translado Aeroporto"
              url="https://br.trip.com/airport-transfers/?locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374"
              noticeText="Chegue ao seu destino sem preocupações. Veículos exclusivos Trip.com."
              themeColor="indigo"
            />
          )}

          {activeTab === 'passeios' && (
            <PartnerIframe 
              title="Passeios e Ingressos"
              url="https://br.trip.com/things-to-do/?locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374"
              noticeText="Compre ingressos para atrações turísticas pelo mundo com nosso parceiro Trip.com."
              themeColor="indigo"
            />
          )}

          {activeTab === 'trens' && (
            <PartnerIframe 
              title="Trens Internacionais"
              url="https://br.trip.com/trains/?locale=pt-BR&curr=BRL&Allianceid=10111564&SID=328653368&trip_sub1=&trip_sub3=D19286374"
              noticeText="Viaje pela Europa e Ásia com os melhores Trens Internacionais. Processado via Trip.com."
              themeColor="indigo"
            />
          )}
        </div>

        {/* ================= SESSÃO DE OFERTAS IMPERDÍVEIS ================= */}
        <div className="w-full mt-12 mb-8">
            <div className="flex items-center gap-4 justify-center mb-8">
               <div className="h-[2px] w-12 bg-orange-500"></div>
               <h2 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tight italic text-center">
                 Ofertas Imperdíveis
               </h2>
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