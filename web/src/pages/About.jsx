import React from 'react';
import { ShieldCheck, Truck, Heart } from 'lucide-react';

export default function About() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic text-center">Sobre a Palastore</h1>
      
      <div className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-6 text-gray-600 leading-relaxed">
        <p className="text-lg font-medium text-slate-800">
          A <strong>Palastore</strong> nasceu com uma missão clara: democratizar o acesso a produtos de alta qualidade, conectando as maiores inovações globais diretamente à sua casa, com segurança e agilidade.
        </p>
        
        <p>
          Operada sob a razão social <strong>42.361.289 LAECIO SANTOS SÃO PEDRO</strong> (CNPJ 42.361.289/0001-14), somos uma empresa brasileira comprometida com a transparência e a satisfação total de nossos clientes. Não somos apenas uma loja online; somos curadores de tendências e soluções para o seu dia a dia.
        </p>

        <h3 className="text-xl font-black text-slate-900 mt-8 mb-4">Nossa Missão</h3>
        <p>
          Proporcionar uma experiência de compra online segura, intuitiva e surpreendente, oferecendo um portfólio diversificado que vai desde a tecnologia de ponta até itens essenciais para o lar, sempre com o melhor custo-benefício do mercado.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-10">
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-green-500"><ShieldCheck /></div>
                <h4 className="font-bold text-slate-900 mb-2">Segurança Total</h4>
                <p className="text-xs">Ambiente criptografado e pagamentos processados pelo Mercado Pago.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-blue-500"><Truck /></div>
                <h4 className="font-bold text-slate-900 mb-2">Entrega Garantida</h4>
                <p className="text-xs">Logística eficiente para todo o Brasil com rastreamento em tempo real.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-red-500"><Heart /></div>
                <h4 className="font-bold text-slate-900 mb-2">Foco no Cliente</h4>
                <p className="text-xs">Suporte humanizado e política de troca transparente.</p>
            </div>
        </div>
      </div>
    </div>
  );
}