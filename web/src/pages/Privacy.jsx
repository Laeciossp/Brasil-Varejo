import React from 'react';

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter text-center">Política de Privacidade</h1>
      
      <div className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 text-sm text-gray-600 leading-relaxed space-y-6">
        <p><strong>Última atualização:</strong> 03/07/2026</p>
        
        <p>Esta é a política de privacidade unificada das plataformas <strong>Mozi GPS</strong> e <strong>Palastore Viagens</strong> (operadora turística e agência), ambas operadas pela empresa <strong>Laecio S S Pedro E-Commerce</strong> (nome fantasia: Palastore), inscrita no CNPJ sob o nº <strong>42.361.289/0001-14</strong>. Nossa sede está localizada na R. Erica Virginia Oliveira da Silva, 160, Agostinho Amaral - Sede, São Sebastião do Passé - BA, CEP 43.850-000.</p>

        <h3 className="text-lg font-bold text-slate-900">1. Nosso Compromisso com a Privacidade</h3>
        <p>Levamos a sua privacidade com a máxima seriedade. Como empresa brasileira de tecnologia e turismo devidamente credenciada (CADASTUR), cumprimos integralmente a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong> ao processar dados pessoais. Consideramos todos os usuários e passageiros de nossos Serviços como titulares de dados e nos comprometemos com a total transparência e segurança no tratamento dessas informações.</p>

        <h3 className="text-lg font-bold text-slate-900">2. Por que processamos seus dados pessoais?</h3>
        <p>Processamos seus dados para viabilizar as operações de mobilidade, navegação e turismo, além de cumprir obrigações legais, regulatórias e defender nossos interesses legítimos. As bases legais incluem:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Operações Turísticas e Intermediação (Art. 7º, V - Palastore Viagens):</strong> Processamento essencial para a execução do contrato de prestação de serviços turísticos, incluindo emissão de passagens aéreas, reservas de hospedagem, locação de veículos, cruzeiros, seguro viagem e roteiros.</li>
          <li><strong>Navegação e Mobilidade (Art. 7º, V - Mozi GPS):</strong> Prestação de serviços de mapas, processamento de rotas em tempo real e monitoramento de geolocalização.</li>
          <li><strong>Melhoria e Segurança (Art. 7º, IX):</strong> Correção de bugs, análise de precisão de localização, prevenção a fraudes em pagamentos e aprimoramento da infraestrutura de software.</li>
          <li><strong>Faturamento, Impostos e Contabilidade (Art. 7º, II):</strong> Cumprimento de obrigações legais e regulatórias para emissão de notas fiscais, relatórios contábeis e conformidade com o Ministério do Turismo.</li>
        </ul>

        <h3 className="text-lg font-bold text-slate-900">3. Como coletamos seus dados?</h3>
        <p>Coletamos informações essenciais fornecidas diretamente por você e de forma automatizada ao interagir com nossos ecossistemas:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Dados de Identificação e Viagem:</strong> Nome completo, CPF, RG/Passaporte, data de nascimento e contatos de emergência, exigidos por autoridades e fornecedores para emissão de bilhetes e vouchers de viagem (Palastore Viagens).</li>
          <li><strong>Geolocalização:</strong> Dados de GPS (latitude/longitude) coletados em tempo real quando você autoriza e utiliza os recursos de navegação (Mozi GPS).</li>
          <li><strong>Dados Financeiros:</strong> Informações de pagamento (processadas de forma criptografada por gateways parceiros) necessárias para a concretização de compras em nossas plataformas.</li>
          <li><strong>Dados de Conta e Interação:</strong> Informações de login, histórico de buscas, reservas e contatos realizados com nossas centrais de atendimento e suporte.</li>
        </ul>

        <h3 className="text-lg font-bold text-slate-900">4. Destinatários e Compartilhamento de Dados</h3>
        <p>Garantimos que seus dados sejam compartilhados estritamente com entidades necessárias para a conclusão dos serviços contratados:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Fornecedores de Turismo (Palastore Viagens):</strong> Companhias aéreas, redes hoteleiras, armadoras de cruzeiros, locadoras, plataformas B2B de distribuição (ex: Restel, Hotelbeds) e seguradoras. Este compartilhamento é inerente à prestação do serviço e frequentemente envolve <strong>Transferência Internacional de Dados</strong> (Art. 33, LGPD) para confirmação de reservas no exterior.</li>
          <li><strong>Parceiros de Tecnologia (Mozi GPS e Web):</strong> Provedores de serviços em nuvem, provedores de mapas (ex: Mapbox) e gateways de pagamento seguros.</li>
          <li><strong>Autoridades Governamentais:</strong> Ministério do Turismo (CADASTUR), Receita Federal, órgãos de segurança da aviação (ex: ANAC, TSA) ou mediante ordem judicial.</li>
        </ul>

        <h3 className="text-lg font-bold text-slate-900">5. Por quanto tempo armazenamos seus dados?</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Dados de Viagens e Reservas:</strong> Mantidos pelo tempo necessário para garantir o cumprimento do serviço, suporte pós-viagem e cumprimento de prazos prescricionais legais vinculados à defesa do consumidor e regulamentações do setor aéreo e hoteleiro (geralmente 5 anos).</li>
          <li><strong>Dados de Navegação (GPS):</strong> Armazenados e processados durante o uso ativo do serviço. Desinstalar o aplicativo pode resultar na exclusão dos dados locais de rotas e históricos não sincronizados.</li>
          <li><strong>Faturamento e Impostos:</strong> Notas fiscais e registros de transações financeiras são mantidos por até 10 anos, conforme as leis contábeis e fiscais brasileiras.</li>
        </ul>

        <h3 className="text-lg font-bold text-slate-900">6. Quais são os seus direitos?</h3>
        <p>Como titular dos dados, sob o Art. 18 da LGPD, você possui controle sobre suas informações. Você tem o direito de solicitar:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Confirmação da existência de tratamento e amplo acesso aos seus dados;</li>
          <li>Correção de informações incompletas, inexatas ou desatualizadas (como nomes ou documentos atrelados a reservas turísticas);</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
          <li>Portabilidade dos dados a outro fornecedor de serviço ou produto;</li>
          <li>Revogação do consentimento (quando aplicável, sabendo que isso pode inviabilizar o uso do GPS ou a conclusão de reservas de viagens).</li>
        </ul>

        <h3 className="text-lg font-bold text-slate-900">7. Contato e Encarregado de Dados (DPO)</h3>
        <p>Nossa equipe está à disposição para esclarecer qualquer dúvida ou atender às suas solicitações de direitos de privacidade. Entre em contato com nosso Encarregado pelo Tratamento de Dados Pessoais através do e-mail: <strong>laeciossp@gmail.com</strong>, ou via correspondência para nossa sede administrativa em São Sebastião do Passé - BA.</p>
      </div>
    </div>
  );
}