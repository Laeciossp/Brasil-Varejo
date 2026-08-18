import React from 'react';
import { ShieldCheck, Truck, Heart, Map, Compass } from 'lucide-react';

export default function About() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl font-sans">
      <h1 className="text-4xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic text-center">Sobre a Palastore</h1>
      
      <div className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-6 text-gray-600 leading-relaxed">
        <p className="text-lg font-medium text-slate-800">
          A <strong>Palastore</strong> evoluiu. O que começou com a missão de democratizar o acesso a produtos físicos de alta qualidade, hoje engloba o desenvolvimento de inovações digitais e experiências inesquecíveis que facilitam o seu trajeto, o seu dia a dia e as suas viagens pelo mundo.
        </p>
        
        <p>
          Operada sob a razão social <strong>42.361.289 LAECIO SANTOS SÃO PEDRO</strong> (CNPJ 42.361.289/0001-14), dividimos nossa expertise em três grandes vertentes: um e-commerce de alto nível, o desenvolvimento de <strong>softwares avançados de navegação e roteamento GPS</strong>, e a atuação consolidada como <strong>Operadora Turística e Agência de Viagens</strong>, oferecendo pacotes, roteiros regulares e passagens com padrões de grandes players do mercado mundial.
        </p>

        <h3 className="text-xl font-black text-slate-900 mt-8 mb-4">Nossa Missão</h3>
        <p>
          Proporcionar uma experiência conectada, segura e surpreendente. Seja oferecendo um portfólio diversificado de produtos no nosso e-commerce, construindo rotas inteligentes através da nossa tecnologia GNSS, ou realizando o sonho de novas viagens com nossa prateleira de roteiros turísticos, nosso objetivo é garantir o melhor custo-benefício e a máxima eficiência para o usuário.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-orange-500"><Compass /></div>
                <h4 className="font-bold text-slate-900 mb-2">Operadora Turística</h4>
                <p className="text-xs">Roteiros regulares nacionais e internacionais, pacotes sob medida e experiências inesquecíveis.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-indigo-500"><Map /></div>
                <h4 className="font-bold text-slate-900 mb-2">Tecnologia GNSS</h4>
                <p className="text-xs">Aplicativos de navegação com roteamento inteligente e dados em tempo real para o motorista.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-blue-500"><Truck /></div>
                <h4 className="font-bold text-slate-900 mb-2">Logística Integrada</h4>
                <p className="text-xs">Entrega eficiente para todo o Brasil com rastreamento de ponta a ponta na loja.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-green-500"><ShieldCheck /></div>
                <h4 className="font-bold text-slate-900 mb-2">Segurança Total</h4>
                <p className="text-xs">Transações criptografadas e ambiente protegido em nossos apps, e-commerce e emissões.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-center md:col-span-2 lg:col-span-2">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-red-500"><Heart /></div>
                <h4 className="font-bold text-slate-900 mb-2">Foco no Usuário</h4>
                <p className="text-xs">Suporte humanizado dedicado ao viajante, ao motorista, ao cliente e política transparente.</p>
            </div>
        </div>
      </div>
    </div>
  );
}