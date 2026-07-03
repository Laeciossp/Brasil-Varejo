import React from 'react';

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter text-center">Política de Privacidade</h1>
      
      <div className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 text-sm text-gray-600 leading-relaxed space-y-6">
        <p><strong>Última atualização:</strong> 03/07/2026</p>
        
        <p>Esta é a política de privacidade do <strong>Mozi GPS</strong>, operado pela empresa <strong>Laecio S S Pedro E-Commerce</strong> (nome fantasia: Palastore), inscrita no CNPJ sob o nº <strong>42.361.289/0001-14</strong>. Nossa sede está localizada na R. Erica Virginia Oliveira da Silva, 160, Agostinho Amaral - Sede, São Sebastião do Passé - BA, CEP 43.850-000.</p>

        <h3 className="text-lg font-bold text-slate-900">1. Nosso Compromisso com a Privacidade</h3>
        <p>Levamos a privacidade muito a sério. Como empresa brasileira, cumprimos integralmente a <strong>Lei Geral de Proteção de Dados (LGPD)</strong> ao processar dados pessoais. Consideramos todos os usuários de nossos Serviços como titulares de dados e nos comprometemos com a transparência e segurança de suas informações.</p>

        <h3 className="text-lg font-bold text-slate-900">2. Por que processamos seus dados pessoais?</h3>
        <p>Processamos seus dados para prestar nossos Serviços, cumprir obrigações legais ou contratuais e defender nossos interesses legítimos. As bases legais seguem o disposto na LGPD:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Prestação dos Serviços (Art. 7º, V):</strong> Ao utilizar o Mozi GPS, você celebra conosco um contrato. Isso inclui garantir a navegação, processamento de rotas, monitoramento de localização e suporte.</li>
          <li><strong>Melhoria e testes de software (Art. 7º, IX):</strong> Correção de bugs, análise de precisão de localização (GPS) e aprimoramento do desempenho.</li>
          <li><strong>Faturamento, Impostos e Contabilidade (Art. 7º, II):</strong> Como empresa, somos obrigados por lei a processar dados para emissão de notas fiscais e conformidade contábil.</li>
          <li><strong>Marketing:</strong> Apenas enviamos comunicações com consentimento específico, que pode ser revogado a qualquer momento.</li>
        </ul>

        <h3 className="text-lg font-bold text-slate-900">3. Como coletamos seus dados?</h3>
        <p>Coletamos dados diretamente de você quando:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Você utiliza o aplicativo e permite o acesso à geolocalização;</li>
          <li>Você faz login ou registra uma conta;</li>
          <li>Você preenche formulários ou entra em contato com nosso suporte;</li>
          <li>Você realiza compras dentro do aplicativo.</li>
        </ul>
        <p>O fornecimento de dados essenciais para a navegação é uma condição necessária para a execução do contrato (uso do mapa/GPS).</p>

        <h3 className="text-lg font-bold text-slate-900">4. Destinatários e Transferência de Dados</h3>
        <p>Seus dados são compartilhados apenas com pessoal autorizado da nossa empresa e com terceiros estritamente necessários para a operação, como provedores de serviços em nuvem, mapas (ex: Mapbox) ou serviços de hospedagem. Qualquer transferência atende às exigências de proteção de dados brasileiras.</p>

        <h3 className="text-lg font-bold text-slate-900">5. Por quanto tempo armazenamos seus dados?</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Dados de uso ativo:</strong> Armazenados enquanto você utiliza o serviço. Desinstalar o app pode resultar na exclusão dos dados locais.</li>
          <li><strong>Faturamento e Impostos:</strong> Armazenamos registros por até 10 anos, conforme exigência legal fiscal brasileira.</li>
          <li><strong>Solicitações de suporte:</strong> Mantidos conforme necessário para defesa legal ou conformidade.</li>
        </ul>

        <h3 className="text-lg font-bold text-slate-900">6. Quais são os seus direitos?</h3>
        <p>Conforme o Art. 18 da LGPD, você tem o direito de solicitar:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Confirmação da existência de tratamento e Acesso aos dados;</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>Portabilidade dos dados e Informação sobre compartilhamento;</li>
          <li>Revogação do consentimento.</li>
        </ul>

        <h3 className="text-lg font-bold text-slate-900">7. Contato</h3>
        <p>Para exercer qualquer um desses direitos ou caso tenha dúvidas sobre como processamos seus dados, utilize o e-mail: <strong>LAECIOSSP@GMAIL.COM</strong> ou entre em contato por correio para nosso endereço físico.</p>
      </div>
    </div>
  );
}