import React from 'react';

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter text-center">Termos de Uso</h1>
      
      <div className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 text-sm text-gray-600 leading-relaxed space-y-6">
        <p>Estes Termos de Uso regem o acesso e a utilização do site <strong>Palastore</strong>, operado por <strong>42.361.289 LAECIO SANTOS SÃO PEDRO</strong> (CNPJ 42.361.289/0001-14). Ao acessar ou comprar em nosso site, você concorda com estes termos.</p>

        <h3 className="text-lg font-bold text-slate-900">1. Produtos e Serviços</h3>
        <p>A Palastore dedica-se à venda de produtos nacionais e importados. Garantimos que as descrições, imagens e especificações dos produtos sejam as mais precisas possíveis. No entanto, pequenas variações de cor podem ocorrer devido à calibração do monitor.</p>

        <h3 className="text-lg font-bold text-slate-900">2. Preços e Pagamentos</h3>
        <p>Os preços exibidos estão em Reais (BRL). Reservamo-nos o direito de alterar os preços a qualquer momento, sem aviso prévio. As compras podem ser pagas via Cartão de Crédito, Boleto ou PIX, processadas de forma segura através do gateway <strong>Mercado Pago</strong>.</p>

        <h3 className="text-lg font-bold text-slate-900">3. Entregas e Prazos</h3>
        <p>O prazo de entrega varia de acordo com o endereço do cliente e a modalidade de frete escolhida. O prazo é contado em dias úteis a partir da confirmação do pagamento. A Palastore não se responsabiliza por atrasos decorrentes de greves, catástrofes naturais ou força maior.</p>

        <h3 className="text-lg font-bold text-slate-900">4. Trocas e Devoluções (Direito de Arrependimento)</h3>
        <p>Em conformidade com o Artigo 49 do Código de Defesa do Consumidor (CDC), o cliente tem o prazo de <strong>7 (sete) dias corridos</strong>, a contar do recebimento do produto, para desistir da compra. O produto deve ser devolvido em sua embalagem original, sem indícios de uso.</p>

        <h3 className="text-lg font-bold text-slate-900">5. Garantia</h3>
        <p>Todos os produtos possuem garantia legal de 90 dias contra defeitos de fabricação, conforme estabelecido pelo CDC.</p>

        <h3 className="text-lg font-bold text-slate-900">6. Contato</h3>
        <p>Para dúvidas sobre estes termos, entre em contato pelo e-mail <strong>laeciossp@gmail.com</strong> ou telefone <strong>(71) 98377-4301</strong>.</p>
      </div>
    </div>
  );
}