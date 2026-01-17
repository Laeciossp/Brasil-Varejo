import React from 'react';
import { ShieldCheck, Camera, Truck, AlertTriangle } from 'lucide-react';

export default function Policies() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-purple-900 p-10 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-orange-500 opacity-10 rotate-3 transform scale-150"></div>
           <h1 className="text-3xl md:text-4xl font-black text-white relative z-10 tracking-tight">
             Política de Trocas, Devoluções e Cancelamentos
           </h1>
           <p className="text-purple-200 mt-2 relative z-10">Transparência total com você, cliente Palastore.</p>
        </div>

        <div className="p-8 md:p-12 space-y-10 text-gray-700 leading-relaxed">

          {/* Seção 1: Resumo */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-orange-500" /> Regras Gerais
            </h2>
            <ul className="list-disc pl-5 space-y-2 bg-orange-50 p-6 rounded-xl border border-orange-100">
              <li><strong>Prazo de Arrependimento:</strong> Até 7 (sete) dias corridos após o recebimento (Lei do E-commerce).</li>
              <li><strong>Defeito Técnico:</strong> Até 30 dias para bens não duráveis e 90 dias para duráveis (TVs, Celulares).</li>
              <li><strong>Custo da Devolução:</strong> Na primeira devolução por arrependimento, o frete é por nossa conta (Logística Reversa).</li>
            </ul>
          </section>

          {/* Seção 2: Como Cancelar */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quero Cancelar meu Pedido</h2>
            <p className="mb-4">
              Se o pedido ainda não foi enviado, você pode cancelar diretamente no seu painel:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Acesse <strong>Minha Conta</strong> {'>'} <strong>Meus Pedidos</strong>.</li>
              <li>Localize o pedido e clique no botão vermelho <strong>Cancelar Pedido</strong>.</li>
              <li>O reembolso será processado conforme a forma de pagamento (ver seção Reembolsos).</li>
            </ol>
            <div className="mt-4 bg-red-50 p-4 rounded-lg border-l-4 border-red-500 text-sm">
              <strong>Importante:</strong> Se o pedido já estiver com status <em>"Em Trânsito"</em>, não é possível cancelar pelo site. Você deverá recusar a entrega quando o transportador chegar.
            </div>
          </section>

          {/* Seção 3: Como Devolver (Regra da Foto) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="text-purple-600" /> O Processo de Devolução (Obrigatório)
            </h2>
            <p className="mb-4">
              Para garantir a segurança do transporte e o seu reembolso, seguimos um protocolo rigoroso para produtos eletrônicos (TVs, Notebooks, Celulares):
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-800 mb-2">Passo a Passo para liberar a Etiqueta:</h3>
              <ol className="list-decimal pl-5 space-y-3">
                <li>Solicite a devolução pelo Chat do Pedido ou WhatsApp.</li>
                <li><strong>Envie fotos do produto:</strong> Mostre que ele está intacto (sem trincos na tela).</li>
                <li><strong>Envie fotos da embalagem:</strong> Coloque o produto na caixa original com todos os isopores e proteções.</li>
                <li className="font-bold text-orange-600">A etiqueta de envio só será liberada após a aprovação das fotos da embalagem.</li>
              </ol>
            </div>
          </section>

          {/* Seção 4: Regras Específicas para TVs e Monitores */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="text-yellow-500" /> Atenção: TVs e Monitores
            </h2>
            <p className="mb-4">Produtos frágeis exigem cuidado redobrado. O seguro da transportadora <strong>não cobre</strong> se o produto estiver mal embalado.</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Embalagem:</strong> Use a caixa original. Se não tiver mais os isopores, preencha todos os espaços vazios com jornal ou plástico bolha. A TV não pode "balançar" dentro da caixa.</li>
              <li><strong>TVs acima de 40 polegadas:</strong> Não podem ser devolvidas em agências dos Correios. Nossa equipe agendará uma coleta ou indicará uma agência Jadlog/Azul Cargo específica.</li>
            </ul>
          </section>

          {/* Seção 5: Reembolso */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Prazos de Reembolso</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <h3 className="font-bold text-green-800 mb-1">Pagamento via PIX</h3>
                <p className="text-sm text-green-700">Restituição em até 2 horas úteis após a conferência do produto em nosso estoque.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-1">Cartão de Crédito</h3>
                <p className="text-sm text-blue-700">O estorno é solicitado à operadora em até 1 dia útil. O crédito aparecerá em até 2 faturas (regra dos bancos).</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              * O reembolso só é liberado após o produto chegar em nosso Centro de Distribuição e passar pela análise técnica (filmagem da abertura da caixa).
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}