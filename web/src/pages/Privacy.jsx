import React from 'react';

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter text-center">Política de Privacidade</h1>
      
      <div className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 text-sm text-gray-600 leading-relaxed space-y-6">
        <p>A <strong>Palastore</strong> (42.361.289 LAECIO SANTOS SÃO PEDRO) preza pela segurança e privacidade de seus dados. Esta política detalha como coletamos, usamos e protegemos suas informações, em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>.</p>

        <h3 className="text-lg font-bold text-slate-900">1. Coleta de Dados</h3>
        <p>Coletamos apenas os dados necessários para processar seu pedido e melhorar sua experiência de compra, incluindo: Nome completo, CPF (para emissão de Nota Fiscal), Endereço de entrega, E-mail e Telefone.</p>

        <h3 className="text-lg font-bold text-slate-900">2. Uso das Informações</h3>
        <p>Seus dados são utilizados exclusivamente para:</p>
        <ul className="list-disc pl-5 space-y-1">
            <li>Processamento e entrega de pedidos;</li>
            <li>Comunicação sobre o status da compra;</li>
            <li>Emissão de documentos fiscais;</li>
            <li>Prevenção de fraudes (em parceria com gateways de pagamento).</li>
        </ul>

        <h3 className="text-lg font-bold text-slate-900">3. Compartilhamento de Dados</h3>
        <p><strong>Não vendemos nem alugamos seus dados.</strong> O compartilhamento ocorre apenas com parceiros essenciais para a operação, como: transportadoras (para entrega), gateways de pagamento (Mercado Pago) e órgãos fiscais (para emissão de NF-e).</p>

        <h3 className="text-lg font-bold text-slate-900">4. Segurança (SSL)</h3>
        <p>Nosso site utiliza tecnologia de criptografia SSL (Secure Socket Layer). Isso garante que todos os dados transmitidos entre seu dispositivo e nossos servidores sejam codificados e inacessíveis a terceiros.</p>

        <h3 className="text-lg font-bold text-slate-900">5. Seus Direitos</h3>
        <p>Você tem o direito de solicitar, a qualquer momento, o acesso, correção ou exclusão de seus dados pessoais de nossa base, exceto os dados que somos obrigados a manter por lei para fins fiscais.</p>

        <h3 className="text-lg font-bold text-slate-900">6. Contato do Encarregado de Dados</h3>
        <p>Para exercer seus direitos de privacidade, entre em contato através do e-mail: <strong>laeciossp@gmail.com</strong>.</p>
      </div>
    </div>
  );
}