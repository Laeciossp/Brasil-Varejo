import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Youtube, Phone, Mail, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-100 pt-16 text-gray-600 border-t border-gray-200 mt-auto font-sans">
      
      {/* 1. LINKS E INFORMAÇÕES */}
      <div className="container mx-auto px-4 pb-10 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* ATENDIMENTO */}
          <div>
            <h4 className="font-black text-gray-800 uppercase mb-4 text-xs tracking-widest">Atendimento</h4>
            <ul className="space-y-3 text-sm font-medium">
              <li>
                <a href="https://wa.me/5571983774301" target="_blank" rel="noreferrer" className="hover:text-orange-500 transition-colors flex items-center gap-2">
                  <Phone size={16} className="text-orange-500"/> (71) 98377-4301
                </a>
              </li>
              <li>
                <a href="mailto:laeciossp@gmail.com" className="hover:text-orange-500 transition-colors flex items-center gap-2">
                  <Mail size={16} className="text-orange-500"/> laeciossp@gmail.com
                </a>
              </li>
              <li className="text-xs text-gray-400 pt-2">Seg. a Sex. das 09h às 18h</li>
            </ul>
          </div>

          {/* INSTITUCIONAL */}
          <div>
            <h4 className="font-black text-gray-800 uppercase mb-4 text-xs tracking-widest">Institucional</h4>
            <ul className="space-y-3 text-sm font-medium">
               <li><Link to="/sobre" className="hover:text-orange-500 transition-colors">Sobre Nós</Link></li>
               <li><Link to="/politica-de-privacidade" className="hover:text-orange-500 transition-colors">Política de Privacidade</Link></li>
               <li><Link to="/termos-de-uso" className="hover:text-orange-500 transition-colors">Termos de Uso</Link></li>
            </ul>
          </div>

          {/* PAGAMENTO E SEGURANÇA */}
          <div className="md:col-span-2">
             <h4 className="font-black text-gray-800 uppercase mb-4 text-xs tracking-widest">Pagamento Seguro</h4>
             <div className="flex flex-wrap gap-3 mb-6 items-center">
                {/* Ícones de Cartão */}
                <div className="h-8 px-2 bg-white border rounded shadow-sm flex items-center justify-center"><span className="text-[10px] font-black">VISA</span></div>
                <div className="h-8 px-2 bg-white border rounded shadow-sm flex items-center justify-center"><span className="text-[10px] font-black">MASTER</span></div>
                <div className="h-8 px-2 bg-white border rounded shadow-sm flex items-center justify-center"><span className="text-[10px] font-black">PIX</span></div>
                <div className="h-8 px-2 bg-white border rounded shadow-sm flex items-center justify-center"><span className="text-[10px] font-black">ELO</span></div>
                
                {/* Logo Mercado Pago */}
                <div className="h-8 px-3 bg-[#009EE3]/10 border border-[#009EE3]/30 rounded flex items-center gap-2">
                    <img src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.14.3/mercadopago/logo__large.png" className="h-4 object-contain" alt="Mercado Pago" />
                </div>
             </div>

             <h4 className="font-black text-gray-800 uppercase mb-4 text-xs tracking-widest">Redes Sociais</h4>
             <div className="flex gap-4">
                <a href="#" className="p-2 bg-white rounded-full border hover:border-pink-500 hover:text-pink-600 transition-all shadow-sm"><Instagram size={20}/></a>
                <a href="#" className="p-2 bg-white rounded-full border hover:border-red-600 hover:text-red-600 transition-all shadow-sm"><Youtube size={20}/></a>
             </div>
          </div>

        </div>
      </div>

      {/* 2. RODAPÉ LEGAL (DADOS DA EMPRESA) */}
      <div className="bg-[#f2f2f2] py-8 border-t border-gray-200">
         <div className="container mx-auto px-4 text-center text-[10px] text-gray-400 leading-relaxed uppercase tracking-wide font-medium">
            <p className="flex justify-center items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-green-600"/> Site Seguro e Protegido
            </p>
            <p className="mb-1">42.361.289 LAECIO SANTOS SÃO PEDRO - CNPJ: 42.361.289/0001-14</p>
            <p>© {new Date().getFullYear()} Palastore Oficial. Todos os direitos reservados.</p>
         </div>
      </div>
    </footer>
  );
}