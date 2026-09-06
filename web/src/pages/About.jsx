import React from 'react';
import { ShieldCheck, Heart, Map, Compass, Cpu, Globe } from 'lucide-react';

export default function About() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl font-sans">
      <h1 className="text-4xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic text-center">Sobre a Palastore</h1>
      
      <div className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 space-y-6 text-gray-600 leading-relaxed">
        <p className="text-lg font-medium text-slate-800">
          A <strong>Palastore</strong> consolida-se no mercado como uma empresa de tecnologia e serviços de alta performance, unindo a excelência no <strong>desenvolvimento de softwares de navegação e mobilidade</strong> à atuação especializada como <strong>Operadora Turística e Agência de Viagens</strong>.
        </p>
        
        <p>
          Operada sob a razão social <strong>LAECIO S S PEDRO E-COMMERCE</strong> (CNPJ 42.361.289/0001-14), nossa estrutura é dedicada a entregar soluções digitais inovadoras — como o avançado aplicativo de navegação <strong>Mozi GPS</strong> — e a planejar experiências de viagens memoráveis, oferecendo roteiros, hospedagens, passagens e transfers com padrões internacionais de qualidade e segurança.
        </p>

        <h3 className="text-xl font-black text-slate-900 mt-8 mb-4">Nossa Missão</h3>
        <p>
          Conectar pessoas a novos destinos e otimizar rotas através da tecnologia. Seja desenvolvendo ferramentas de navegação GNSS inteligentes para o motorista ou realizando o planejamento completo de viagens corporativas e de lazer, nosso compromisso é garantir eficiência, inovação e suporte especializado em cada jornada.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-orange-500"><Compass /></div>
                <h4 className="font-bold text-slate-900 mb-2">Agência de Viagens</h4>
                <p className="text-xs">Pacotes personalizados, roteiros nacionais e internacionais, passagens e reservas hoteleiras.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-indigo-500"><Map /></div>
                <h4 className="font-bold text-slate-900 mb-2">Mozi GPS</h4>
                <p className="text-xs">Desenvolvimento de software de navegação com mapas integrados e alta precisão para condutores.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-blue-500"><Globe /></div>
                <h4 className="font-bold text-slate-900 mb-2">Turismo Corporativo</h4>
                <p className="text-xs">Soluções completas em logísticas de traslados, transfers privativos e hospedagens executivas.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-center">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-green-500"><ShieldCheck /></div>
                <h4 className="font-bold text-slate-900 mb-2">Segurança e Conformidade</h4>
                <p className="text-xs">Transações protegidas por criptografia e total adequação às diretrizes do CDC no turismo.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl text-center md:col-span-2 lg:col-span-2">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-red-500"><Heart /></div>
                <h4 className="font-bold text-slate-900 mb-2">Suporte Especializado</h4>
                <p className="text-xs">Atendimento humanizado e dedicado para acompanhar o viajante e o usuário de software do início ao fim.</p>
            </div>
        </div>
      </div>
    </div>
  );
}