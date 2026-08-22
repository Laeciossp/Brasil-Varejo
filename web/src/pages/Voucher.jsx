import React from 'react';
import { Plane, Scissors, Printer, CheckCircle, MapPin, Briefcase } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

// Dados Mokados ou Passados por Props (Exemplo de Estrutura)
export default function Voucher({ orderData }) {
  
  // Função para imprimir a página no formato A4 (Oculta botões e ajusta a tela)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 font-sans flex flex-col items-center">
      
      {/* Botão de Imprimir/Download - Será oculto na impressão */}
      <button 
        onClick={handlePrint} 
        className="mb-6 flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg transition-colors print:hidden"
      >
        <Printer size={18} /> Imprimir / Salvar PDF
      </button>

      {/* VOUCHER CONTAINER (Borda picotada imitando ticket) */}
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-xl overflow-hidden relative print:shadow-none print:w-[100%] print:max-w-none">
        
        {/* HEADER DO TICKET */}
        <div className="bg-purple-900 text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-center md:items-start gap-6 border-b-8 border-orange-500">
          <div className="flex flex-col items-center md:items-start">
             {/* TROQUE PELA SUA LOGO OFICIAL */}
             <div className="text-3xl font-black tracking-tighter flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-white text-purple-900 flex items-center justify-center rounded-md font-bold text-xl">P</div>
                PALASTORE
             </div>
             <p className="text-purple-200 text-sm font-medium">Agência Oficial de Turismo</p>
          </div>
          
          <div className="text-center md:text-right">
             <span className="bg-green-500 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-flex items-center gap-1">
                <CheckCircle size={12} /> Confirmado
             </span>
             <p className="text-purple-200 text-xs uppercase tracking-wider mb-1">Localizador (PNR)</p>
             <h2 className="text-4xl font-black tracking-widest">XZ89KQ</h2>
          </div>
        </div>

        {/* CORPO DO VOUCHER */}
        <div className="p-6 md:p-8">
           
           <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
             <Plane className="text-orange-500" /> Detalhes do Itinerário
           </h3>

           {/* CARD DE VOO - IDA */}
           <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                 <span className="bg-purple-100 text-purple-800 text-xs font-black uppercase px-2 py-1 rounded">Voo de Ida</span>
                 <span className="font-bold text-gray-700 text-sm">G3 1620 (GOL Linhas Aéreas)</span>
              </div>
              <div className="flex justify-between items-center">
                 <div>
                    <p className="text-3xl font-black text-gray-900">GRU</p>
                    <p className="text-sm font-bold text-gray-500">São Paulo</p>
                    <p className="text-xs text-gray-400 mt-1">26/08/2026 • 20:10</p>
                 </div>
                 <div className="flex-1 flex flex-col items-center px-4">
                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Duração: 2h 25m</p>
                    <div className="w-full relative flex items-center justify-center">
                       <div className="h-px bg-gray-300 w-full absolute"></div>
                       <Plane size={16} className="text-purple-500 relative bg-gray-50 px-1" />
                    </div>
                    <p className="text-[10px] uppercase text-green-600 font-bold mt-1">Voo Direto</p>
                 </div>
                 <div className="text-right">
                    <p className="text-3xl font-black text-gray-900">SSA</p>
                    <p className="text-sm font-bold text-gray-500">Salvador</p>
                    <p className="text-xs text-gray-400 mt-1">26/08/2026 • 22:35</p>
                 </div>
              </div>
           </div>

           {/* CARD DE VOO - VOLTA */}
           <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                 <span className="bg-orange-100 text-orange-800 text-xs font-black uppercase px-2 py-1 rounded">Voo de Volta</span>
                 <span className="font-bold text-gray-700 text-sm">G3 1697 (GOL Linhas Aéreas)</span>
              </div>
              <div className="flex justify-between items-center">
                 <div>
                    <p className="text-3xl font-black text-gray-900">SSA</p>
                    <p className="text-sm font-bold text-gray-500">Salvador</p>
                    <p className="text-xs text-gray-400 mt-1">31/08/2026 • 17:05</p>
                 </div>
                 <div className="flex-1 flex flex-col items-center px-4">
                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Duração: 2h 40m</p>
                    <div className="w-full relative flex items-center justify-center">
                       <div className="h-px bg-gray-300 w-full absolute"></div>
                       <Plane size={16} className="text-orange-500 relative bg-gray-50 px-1 transform rotate-180" />
                    </div>
                    <p className="text-[10px] uppercase text-green-600 font-bold mt-1">Voo Direto</p>
                 </div>
                 <div className="text-right">
                    <p className="text-3xl font-black text-gray-900">GRU</p>
                    <p className="text-sm font-bold text-gray-500">São Paulo</p>
                    <p className="text-xs text-gray-400 mt-1">31/08/2026 • 19:45</p>
                 </div>
              </div>
           </div>

           {/* LINHA DE CORTE (VISUAL) */}
           <div className="relative flex items-center justify-center my-8 opacity-50 print:my-4">
              <div className="w-full border-t-2 border-dashed border-gray-300"></div>
              <Scissors size={20} className="absolute text-gray-400 bg-white px-1" />
           </div>

           {/* PASSAGEIROS E VALORES */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* LISTA DE PASSAGEIROS */}
              <div>
                 <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                   <Users size={18} className="text-purple-600"/> Lista de Passageiros
                 </h4>
                 <div className="space-y-4">
                    <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-lg">
                       <p className="font-black text-gray-800">Laécio Santos São Pedro</p>
                       <p className="text-xs text-gray-500 mt-1">Adulto • CPF: 000.000.000-00</p>
                       <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-[11px] font-bold text-gray-600 uppercase">
                          <span className="flex items-center gap-1"><Luggage size={12} className="text-orange-500"/> 1 Mala Porão</span>
                          <span>Assento: Janela</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* RESUMO FINANCEIRO */}
              <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                 <h4 className="font-bold text-purple-900 mb-4 border-b border-purple-200 pb-2">Resumo do Pagamento</h4>
                 <div className="space-y-2 text-sm text-purple-800">
                    <div className="flex justify-between"><span>Tarifa Passageiros:</span> <span>R$ 4.939,00</span></div>
                    <div className="flex justify-between"><span>Bagagem Despachada:</span> <span>R$ 101,00</span></div>
                    <div className="flex justify-between"><span>Taxa de Emissão:</span> <span>R$ 0,00</span></div>
                    <div className="flex justify-between"><span>Pacote Escolhido:</span> <span>Tarifa Plus</span></div>
                    <div className="flex justify-between items-center pt-3 border-t border-purple-200 mt-3">
                       <span className="font-bold uppercase text-xs">Total Pago:</span>
                       <span className="font-black text-xl text-purple-900">R$ 5.040,00</span>
                    </div>
                    <p className="text-right text-[10px] font-bold text-green-600 mt-1">PAGO VIA PIX</p>
                 </div>
              </div>
           </div>

        </div>

        {/* FOOTER / CONTATO */}
        <div className="bg-gray-900 text-gray-400 p-6 text-xs flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
           <div className="space-y-1">
              <p className="font-bold text-white text-sm mb-2">Suporte Palastore</p>
              <p>Email: contato@palastore.com.br</p>
              <p>Whatsapp: +55 (71) 98381-0420</p>
           </div>
           <div>
              <p>Apresente este voucher impresso ou na tela do celular.</p>
              <p>O check-in abre 48h antes do voo.</p>
           </div>
        </div>

      </div>

      {/* ESTILO PARA IMPRESSÃO (Ocultar elementos desnecessários e remover margens) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .min-h-screen { background: white !important; padding: 0 !important; }
          .bg-white.max-w-3xl { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
          .bg-white.max-w-3xl * { visibility: visible; }
        }
      `}} />
    </div>
  );
}