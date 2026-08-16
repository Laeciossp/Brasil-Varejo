import React, { useState, useEffect, useRef } from 'react';
import { Plane, Bus, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

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
// 3. PÁGINA PRINCIPAL: PALASTORE VIAGENS (WEB)
// ==========================================
export default function ViagensPage() {
  const [activeTab, setActiveTab] = useState('voos');

  const tabs = [
    { id: 'voos', label: 'Passagens Aéreas', icon: Plane },
    { id: 'onibus', label: 'Passagens de Ônibus', icon: Bus },
    { id: 'seguros', label: 'Seguro Viagem', icon: ShieldCheck },
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
            <h1 className="text-3xl md:text-4xl font-black text-crocus-deep uppercase tracking-tight italic mb-2">
            Central de Viagens
            </h1>
            <p className="text-gray-500 font-medium">Sua próxima aventura começa aqui. Escolha o serviço desejado.</p>
        </div>

        {/* MENU DE NAVEGAÇÃO (ABAS) */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-3 mb-8">
            {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
                <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 shadow-sm w-full md:w-auto justify-center
                    ${isActive 
                    ? 'bg-orange-500 text-white shadow-orange-500/30 scale-105 border-transparent' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-orange-500 border border-gray-200'}`}
                >
                <Icon size={20} />
                {tab.label}
                </button>
            );
            })}
        </div>

        {/* ÁREA DE CONTEÚDO PRINCIPAL (PESQUISAS) */}
        <div className="bg-white rounded-3xl shadow-xl p-2 md:p-6 border border-gray-100 min-h-[700px] flex flex-col overflow-hidden mb-12">
          
          {/* ================= ABA 1: VOOS ================= */}
          {activeTab === 'voos' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full flex-grow">
               <h2 className="text-xl md:text-2xl font-black text-crocus-deep mb-4 text-center uppercase italic">
                 Encontre as Melhores Passagens Aéreas
               </h2>
               <KiwiWidget />
            </div>
          )}

          {/* ================= ABA 2: ÔNIBUS ================= */}
          {activeTab === 'onibus' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full flex-grow flex flex-col">
               <h2 className="text-xl md:text-2xl font-black text-crocus-deep mb-4 text-center uppercase italic">
                 Viaje de Ônibus com a FlixBus
               </h2>
               
               <div className="bg-green-50 p-4 rounded-xl mb-4 flex justify-between items-center border border-green-100">
                 <p className="text-green-800 text-sm font-medium">A pesquisa e reserva são processadas com segurança pela FlixBus, parceira oficial.</p>
                 <a href="https://www.awin1.com/cread.php?awinmid=30765&awinaffid=910543" target="_blank" rel="noreferrer" className="hidden md:flex items-center gap-1 text-green-600 font-bold hover:underline">
                    Abrir em tela cheia <ArrowRight size={16}/>
                 </a>
               </div>

               <iframe 
                 src="https://www.awin1.com/cread.php?awinmid=30765&awinaffid=910543" 
                 className="w-full flex-grow min-h-[700px] border-0 rounded-2xl bg-gray-50"
                 title="Pesquisa FlixBus"
               />
            </div>
          )}

          {/* ================= ABA 3: SEGUROS (HOTSITE PALASTORE) ================= */}
          {activeTab === 'seguros' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full flex-grow flex flex-col">
               <h2 className="text-xl md:text-2xl font-black text-crocus-deep mb-4 text-center uppercase italic">
                 Seguro Viagem Oficial Palastore
               </h2>
               
               <div className="bg-blue-50 p-4 rounded-xl mb-4 flex justify-between items-center border border-blue-100">
                 <p className="text-blue-800 text-sm font-medium">Viaje protegido com cobertura completa e suporte 24h.</p>
                 <a href="https://seguroviagem.app/palastore" target="_blank" rel="noreferrer" className="hidden md:flex items-center gap-1 text-blue-600 font-bold hover:underline">
                    Abrir em tela cheia <ExternalLink size={16}/>
                 </a>
               </div>

               <iframe 
                 src="https://seguroviagem.app/palastore" 
                 className="w-full flex-grow min-h-[700px] border-0 rounded-2xl bg-gray-50"
                 title="Hotsite Seguro Viagem Palastore"
               />
            </div>
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