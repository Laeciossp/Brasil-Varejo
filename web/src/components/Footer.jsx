import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Youtube, Phone, Mail, ShieldCheck } from 'lucide-react';

export default function Footer() {
  // Substitua este caminho pela sua imagem real na pasta public
  const bgImage = "/footer-arte.jpg"; 

  return (
    // Adicionamos 'relative' e 'overflow-hidden' para conter a arte
    <footer className="relative mt-auto font-sans text-gray-200 overflow-hidden">
      
      {/* --- CAMADA 1: A IMAGEM DE ARTE DE FUNDO --- */}
      {/* Use uma imagem de alta qualidade, abstrata ou temática da loja */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105 blur-[2px]" // Um leve blur e scale ajuda a focar no texto
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>

      {/* --- CAMADA 2: O OVERLAY (MÁSCARA DE COR) --- */}
      {/* Essencial para legibilidade. Um gradiente roxo forte que clareia para cima */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#320a69] via-[#4C1D95]/95 to-[#4C1D95]/70"></div>

      {/* --- CAMADA 3: O CONTEÚDO (Texto Branco) --- */}
      <div className="relative z-20 container mx-auto px-4 pt-20 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 border-b border-white/10 pb-12">
          
          {/* ATENDIMENTO */}
          <div>
            <h4 className="font-black text-white uppercase mb-6 text-sm tracking-widest border-l-4 border-orange-500 pl-3">Atendimento</h4>
            <ul className="space-y-4 text-sm font-medium opacity-90">
              <li>
                <a href="https://wa.me/5571983774301" target="_blank" rel="noreferrer" className="hover:text-orange-400 transition-colors flex items-center gap-3 group">
                  <span className="bg-white/10 p-2 rounded-full group-hover:bg-orange-500 transition-all"><Phone size={16} className="text-white"/></span> 
                  (71) 98377-4301
                </a>
              </li>
              <li>
                <a href="mailto:laeciossp@gmail.com" className="hover:text-orange-400 transition-colors flex items-center gap-3 group">
                  <span className="bg-white/10 p-2 rounded-full group-hover:bg-orange-500 transition-all"><Mail size={16} className="text-white"/></span>
                  laeciossp@gmail.com
                </a>
              </li>
              <li className="text-xs text-gray-400 pt-2 pl-11">Seg. a Sex. das 09h às 18h</li>
            </ul>
          </div>

          {/* INSTITUCIONAL */}
          <div>
            <h4 className="font-black text-white uppercase mb-6 text-sm tracking-widest border-l-4 border-orange-500 pl-3">Institucional</h4>
            <ul className="space-y-3 text-sm font-medium opacity-90">
               <li><Link to="/sobre" className="hover:text-orange-400 transition-colors hover:translate-x-1 inline-block">Sobre Nós</Link></li>
               <li><Link to="/politica-de-privacidade" className="hover:text-orange-400 transition-colors hover:translate-x-1 inline-block">Política de Privacidade</Link></li>
               <li><Link to="/politicas" className="hover:text-orange-400 transition-colors hover:translate-x-1 inline-block font-bold text-orange-300">Trocas e Devoluções</Link></li>
               <li><Link to="/termos-de-uso" className="hover:text-orange-400 transition-colors hover:translate-x-1 inline-block">Termos de Uso</Link></li>
            </ul>
          </div>

          {/* PAGAMENTO E SEGURANÇA */}
          <div className="md:col-span-2 md:pl-10">
             <h4 className="font-black text-white uppercase mb-6 text-sm tracking-widest border-l-4 border-orange-500 pl-3">Pagamento Seguro</h4>
             <div className="flex flex-wrap gap-3 mb-8 items-center">
                {/* Ícones de pagamento com fundo branco para destacar */}
                <div className="h-9 px-3 bg-white text-gray-800 border border-gray-200 rounded shadow-sm flex items-center justify-center font-black text-xs">VISA</div>
                <div className="h-9 px-3 bg-white text-gray-800 border border-gray-200 rounded shadow-sm flex items-center justify-center font-black text-xs">MASTER</div>
                <div className="h-9 px-3 bg-white text-gray-800 border border-gray-200 rounded shadow-sm flex items-center justify-center font-black text-xs">PIX</div>
                <div className="h-9 px-3 bg-white text-gray-800 border border-gray-200 rounded shadow-sm flex items-center justify-center font-black text-xs">ELO</div>
                <div className="h-9 px-4 bg-[#009EE3]/10 border border-[#009EE3]/30 rounded flex items-center gap-2 bg-white">
                    <img src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.14.3/mercadopago/logo__large.png" className="h-5 object-contain" alt="Mercado Pago" />
                </div>
             </div>

             <h4 className="font-black text-white uppercase mb-6 text-sm tracking-widest border-l-4 border-orange-500 pl-3">Siga a Palastore</h4>
             <div className="flex gap-4">
                <a 
                    href="https://www.instagram.com/palastoreoficial/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-3 bg-white/10 rounded-full hover:bg-gradient-to-tr from-pink-500 to-orange-500 hover:text-white transition-all shadow-lg backdrop-blur-sm hover:-translate-y-1"
                >
                    <Instagram size={24}/>
                </a>
                <a 
                    href="https://www.youtube.com/channel/UCK-HZ2ztYPMqHdoYtXGVd9w" 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-3 bg-white/10 rounded-full hover:bg-red-600 hover:text-white transition-all shadow-lg backdrop-blur-sm hover:-translate-y-1"
                >
                    <Youtube size={24}/>
                </a>
             </div>
          </div>

        </div>
      </div>

      {/* BARRA FINAL */}
      <div className="relative z-20 bg-[#320a69]/50 py-6 border-t border-white/5 backdrop-blur-md">
         <div className="container mx-auto px-4 text-center text-[11px] text-white/60 leading-relaxed uppercase tracking-wide font-medium">
            <p className="flex justify-center items-center gap-2 mb-2 text-white/80">
                <ShieldCheck size={16} className="text-green-400"/> Site Seguro e Protegido com SSL
            </p>
            <p className="mb-1 font-bold">42.361.289 LAECIO SANTOS SÃO PEDRO - CNPJ: 42.361.289/0001-14</p>
            <p>© {new Date().getFullYear()} Palastore Oficial. Todos os direitos reservados. A cópia de qualquer conteúdo é proibida.</p>
         </div>
      </div>
    </footer>
  );
}