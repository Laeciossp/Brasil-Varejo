import React, { useEffect, useRef } from 'react';

export default function ViagensPage() {
  const widgetContainerRef = useRef(null);

  useEffect(() => {
    // 1. Cria a tag <script> dinamicamente
    const script = document.createElement('script');
    script.src = "https://widgets.kiwi.com/scripts/widget-search-iframe.js";
    script.async = true;
    
    // 2. Adiciona todos os atributos (data-*) exatos que você forneceu da Kiwi
    script.setAttribute("data-affilid", "lptbenspalastorewidget");
    script.setAttribute("data-from", "sao-paulo_sp_br");
    script.setAttribute("data-return", "anytime");
    script.setAttribute("data-transport-types", "FLIGHT");

    // 3. Injeta o script dentro da nossa div "widget-holder"
    if (widgetContainerRef.current) {
      widgetContainerRef.current.appendChild(script);
    }

    // 4. Limpeza de segurança (remove o script se o usuário sair da página para não duplicar)
    return () => {
      if (widgetContainerRef.current && widgetContainerRef.current.contains(script)) {
        widgetContainerRef.current.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-20">
      
      {/* CABEÇALHO COM A IMAGEM DA PALASTORE VIAGENS (OPÇÃO 1: PASTA PUBLIC) */}
      <div className="w-full bg-white shadow-sm mb-8 border-b border-gray-200">
        <img 
          src="/image_0335bf.png" 
          alt="Palastore Viagens" 
          className="w-full h-auto object-cover md:object-contain max-h-[250px] md:max-h-[350px]" 
        />
      </div>

      {/* CONTAINER PRINCIPAL */}
      <div className="max-w-[1440px] mx-auto px-4">
        
        {/* Bloco Branco onde o Widget vai ficar */}
        <div className="bg-white rounded-3xl shadow-lg p-2 md:p-6 border border-gray-100 min-h-[600px]">
          
          <h1 className="text-2xl md:text-3xl font-black text-crocus-deep mb-6 text-center uppercase tracking-tight italic">
            Encontre as Melhores Passagens
          </h1>

          {/* O WIDGET DA KIWI SERÁ RENDERIZADO EXATAMENTE AQUI DENTRO */}
          <div 
            id="widget-holder" 
            ref={widgetContainerRef} 
            className="w-full h-full min-h-[500px]"
          >
            {/* O script será injetado aqui pelo useEffect automaticamente */}
          </div>

        </div>
      </div>
    </div>
  );
}