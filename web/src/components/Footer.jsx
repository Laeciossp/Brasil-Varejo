import React from 'react';
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, CreditCard } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-100 pt-10 text-gray-600 border-t border-gray-200 mt-auto font-sans">
      
      {/* 1. ATENDIMENTO E PAGAMENTO */}
      <div className="container mx-auto px-4 pb-10 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div>
            <h4 className="font-black text-gray-800 uppercase mb-4 text-sm">Atendimento</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:underline flex items-center gap-2"><Phone size={14}/> 0800 773 3838</a></li>
              <li><a href="#" className="hover:underline flex items-center gap-2"><Mail size={14}/> meajuda@brasilvarejo.com</a></li>
              <li><a href="#" className="hover:underline">Central de Ajuda</a></li>
              <li><a href="#" className="hover:underline">Vendas Corporativas</a></li>
            </ul>
          </div>

          <div>
             <h4 className="font-black text-gray-800 uppercase mb-4 text-sm">Serviços</h4>
             <ul className="space-y-2 text-sm">
               <li><a href="#" className="hover:underline">Cartão Brasil Varejo</a></li>
               <li><a href="#" className="hover:underline">Seguros e Garantia</a></li>
               <li><a href="#" className="hover:underline">Instalação de Móveis</a></li>
               <li><a href="#" className="hover:underline">Marketplace (Venda aqui)</a></li>
             </ul>
          </div>

          <div>
            <h4 className="font-black text-gray-800 uppercase mb-4 text-sm">Institucional</h4>
            <ul className="space-y-2 text-sm">
               <li><a href="#" className="hover:underline">Sobre nós</a></li>
               <li><a href="#" className="hover:underline">Trabalhe conosco</a></li>
               <li><a href="#" className="hover:underline">Relação com Investidores</a></li>
               <li><a href="#" className="hover:underline">Política de Privacidade</a></li>
            </ul>
          </div>

          <div>
             <h4 className="font-black text-gray-800 uppercase mb-4 text-sm">Formas de Pagamento</h4>
             <div className="flex gap-2 flex-wrap mb-4">
                <div className="w-10 h-6 bg-white border rounded shadow-sm flex items-center justify-center"><span className="text-[8px] font-bold">VISA</span></div>
                <div className="w-10 h-6 bg-white border rounded shadow-sm flex items-center justify-center"><span className="text-[8px] font-bold">MASTER</span></div>
                <div className="w-10 h-6 bg-white border rounded shadow-sm flex items-center justify-center"><span className="text-[8px] font-bold">PIX</span></div>
                <div className="w-10 h-6 bg-white border rounded shadow-sm flex items-center justify-center"><span className="text-[8px] font-bold">ELO</span></div>
             </div>
             <h4 className="font-black text-gray-800 uppercase mb-4 text-sm">Redes Sociais</h4>
             <div className="flex gap-4">
                <Facebook size={20} className="hover:text-blue-600 cursor-pointer"/>
                <Instagram size={20} className="hover:text-pink-600 cursor-pointer"/>
                <Twitter size={20} className="hover:text-blue-400 cursor-pointer"/>
                <Youtube size={20} className="hover:text-red-600 cursor-pointer"/>
             </div>
          </div>

        </div>
      </div>

      {/* 2. SEO LINKS (IGUAL O DO MAGALU - "LINKS RELACIONADOS") */}
      <div className="bg-white py-8">
        <div className="container mx-auto px-4">
           <h5 className="font-bold text-xs text-gray-400 uppercase mb-4 text-center">Buscas Mais Populares</h5>
           <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-gray-500">
              <a href="#" className="hover:underline">iPhone 16</a>
              <a href="#" className="hover:underline">Geladeira Inox</a>
              <a href="#" className="hover:underline">Smart TV 50</a>
              <a href="#" className="hover:underline">Notebook Gamer</a>
              <a href="#" className="hover:underline">Guarda-Roupa Casal</a>
              <a href="#" className="hover:underline">Sofá Retrátil</a>
              <a href="#" className="hover:underline">Air Fryer</a>
              <a href="#" className="hover:underline">Pneu Aro 15</a>
              <a href="#" className="hover:underline">Fritadeira Elétrica</a>
              <a href="#" className="hover:underline">Cama Box Baú</a>
           </div>
        </div>
      </div>

      {/* 3. RODAPÉ LEGAL */}
      <div className="bg-[#f2f2f2] py-6 border-t border-gray-200">
         <div className="container mx-auto px-4 text-center text-[10px] text-gray-500 leading-relaxed">
            <p className="font-bold mb-2 text-gray-700">Brasil Varejo Ltda - CNPJ: 00.000.000/0001-00</p>
            <p>Rua Voluntários da Pátria, 1234 - São Paulo/SP - CEP 01000-000</p>
            <p>Preços e condições de pagamento exclusivos para compras via internet. Ofertas válidas na compra de até 5 peças de cada produto por cliente, até o término dos nossos estoques para internet.</p>
         </div>
      </div>
    </footer>
  );
}