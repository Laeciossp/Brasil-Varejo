import React from 'react';
import { ShieldCheck, Shirt, AlertTriangle, RotateCcw, Truck } from 'lucide-react';

export default function Policies() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-purple-900 p-10 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-orange-500 opacity-10 rotate-3 transform scale-150"></div>
           <h1 className="text-3xl md:text-4xl font-black text-white relative z-10 tracking-tight">
             Política de Trocas e Devoluções
           </h1>
           <p className="text-purple-200 mt-2 relative z-10">Transparência e estilo com você, cliente Palastore.</p>
        </div>

        <div className="p-8 md:p-12 space-y-10 text-gray-700 leading-relaxed">

          {/* Seção 1: Condições Gerais (Foco em Roupas) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shirt className="text-purple-600" /> Condições para Devolução de Roupas
            </h2>
            <p className="mb-4 text-gray-600">
              Queremos que você ame seu look! Mas se precisar devolver, para aceitarmos a peça de volta, ela precisa seguir estas regrinhas básicas:
            </p>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span><strong>Etiqueta Fixada:</strong> A peça deve estar com a etiqueta da marca intacta e fixada.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span><strong>Sem Uso:</strong> Não pode haver sinais de uso, lavagem, odores ou alterações (bainhas, ajustes).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span><strong>Acessórios:</strong> Deve ser devolvida com todos os acessórios (cintos, faixas, broches) que vieram juntos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span><strong>Embalagem:</strong> De preferência na embalagem original ou em um envelope pardo seguro.</span>
                </li>
              </ul>
            </div>
            <p className="mt-4 text-sm text-gray-500 italic">
              * Peças íntimas, biquínis e bodys podem ter regras restritivas de devolução por questões de higiene, exceto em caso de defeito de fabricação.
            </p>
          </section>

          {/* Seção 2: Prazos e Tipos de Devolução */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RotateCcw className="text-orange-500" /> Prazos e Modalidades
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Arrependimento */}
              <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-bold text-gray-800 text-lg mb-2">1. Arrependimento</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Não serviu ou não gostou? Você tem até <strong>7 dias corridos</strong> após o recebimento para solicitar a devolução.
                </p>
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                  Frete Reverso Grátis (1ª troca)
                </span>
              </div>

              {/* Defeito */}
              <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-bold text-gray-800 text-lg mb-2">2. Defeito de Fabricação</h3>
                <p className="text-sm text-gray-600 mb-3">
                  A peça veio com defeito? Você tem até <strong>30 dias</strong> (bens não duráveis) para nos acionar.
                </p>
                <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-semibold">
                  Análise de Qualidade
                </span>
              </div>
            </div>
          </section>

          {/* Seção 3: Cancelamento */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancelamento de Pedido</h2>
            <ul className="list-disc pl-5 space-y-2 bg-gray-50 p-6 rounded-xl border border-gray-200">
              <li><strong>Pedido não enviado:</strong> Entre em contato imediatamente com nossa Central para suspender o envio e estornarmos o valor.</li>
              <li><strong>Pedido em trânsito:</strong> Se o pedido já estiver com a transportadora, recuse a entrega no ato do recebimento. Assim que o pacote retornar ao nosso centro, faremos o estorno.</li>
              <li><strong>Pedido entregue:</strong> Você tem 7 dias para solicitar a devolução por arrependimento.</li>
            </ul>
          </section>

          {/* Seção 4: Reembolsos e Estornos */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-green-600" /> Reembolsos
            </h2>
            <p className="mb-4">
              A restituição dos valores será processada somente após o recebimento e análise das condições do(s) produto(s) em nosso Centro de Distribuição (prazo de análise: até 5 dias úteis).
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="bg-gray-100 p-2 rounded-full font-bold text-gray-600">PIX/Boleto</div>
                <div>
                  <p className="font-semibold">Transferência ou PIX</p>
                  <p className="text-sm text-gray-500">Em até 5 dias úteis na conta do titular da compra.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="bg-gray-100 p-2 rounded-full font-bold text-gray-600">Cartão</div>
                <div>
                  <p className="font-semibold">Estorno na Fatura</p>
                  <p className="text-sm text-gray-500">O estorno poderá ocorrer em até 2 faturas subsequentes (regra da administradora do cartão).</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-orange-50 border-orange-200">
                <div className="bg-white p-2 rounded-full font-bold text-orange-600">Vale-Troca</div>
                <div>
                  <p className="font-semibold text-orange-900">Crédito no Site</p>
                  <p className="text-sm text-orange-800">Receba um vale para comprar outra peça imediatamente. Disponível em até 2 dias úteis.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Seção 5: Frete */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="text-blue-500" /> Sobre o Frete
            </h2>
            <p className="text-gray-600">
              Na devolução integral do pedido, devolvemos o valor total pago (produto + frete). Na devolução parcial (apenas algumas peças), o frete é estornado proporcionalmente.
            </p>
          </section>

          {/* Rodapé de Contato */}
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="font-bold text-gray-900">Ficou com dúvidas?</p>
            <p className="text-gray-600 mb-4">Entre em contato com a nossa Central de Relacionamento</p>
            <button className="bg-green-600 text-white px-6 py-3 rounded-full font-bold hover:bg-green-700 transition-colors">
              Falar no WhatsApp
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}