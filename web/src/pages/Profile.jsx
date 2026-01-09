import React from 'react';
import { Package, Truck, CheckCircle, FileText } from 'lucide-react';

const Profile = () => {
  // Dados mockados para você ver o layout (depois virá do Sanity via user ID)
  const orders = [
    {
      id: '#9082',
      date: '04/01/2026',
      total: 'R$ 1.299,00',
      status: 'shipped', // pending, paid, shipped, delivered
      items: ['Inversor Solar 3000W'],
      tracking: 'BR123456789'
    },
    {
      id: '#8011',
      date: '20/12/2025',
      total: 'R$ 450,00',
      status: 'delivered',
      items: ['Cabos Fotovoltaicos 10m', 'Conectores MC4'],
      tracking: 'BR987654321'
    }
  ];

  const getStatusStep = (status) => {
    const steps = ['pending', 'paid', 'shipped', 'delivered'];
    return steps.indexOf(status);
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Meus Pedidos</h1>

      <div className="space-y-6">
        {orders.map((order) => {
          const currentStep = getStatusStep(order.status);
          
          return (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Cabeçalho do Pedido */}
              <div className="bg-gray-100 p-4 flex flex-col md:flex-row justify-between text-sm text-gray-600 gap-4">
                <div className="flex gap-8">
                  <div>
                    <p className="uppercase text-xs font-bold">Data do Pedido</p>
                    <p>{order.date}</p>
                  </div>
                  <div>
                    <p className="uppercase text-xs font-bold">Total</p>
                    <p>{order.total}</p>
                  </div>
                </div>
                <div>
                  <p className="uppercase text-xs font-bold">Pedido N</p>
                  <p>{order.id}</p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Foto e Nome */}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-brand-blue mb-2">{order.items[0]} {order.items.length > 1 && `+ ${order.items.length - 1} itens`}</h3>
                    <div className="flex gap-2 mt-4">
                      <button className="text-sm font-bold text-brand-blue border border-brand-blue px-4 py-2 rounded hover:bg-blue-50">
                        Comprar Novamente
                      </button>
                      <button className="text-sm font-bold text-gray-700 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Nota Fiscal
                      </button>
                    </div>
                  </div>

                  {/* Timeline de Status */}
                  <div className="flex-1 md:border-l md:pl-6">
                    <h4 className="font-bold mb-4">Status do Envio</h4>
                    
                    <div className="relative">
                      {/* Linha Vertical */}
                      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200"></div>

                      <div className="space-y-6">
                        {/* Etapa 1: Aprovado */}
                        <div className="relative flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${currentStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-300'}`}>
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <span className={currentStep >= 1 ? 'font-bold text-gray-800' : 'text-gray-500'}>Pagamento Aprovado</span>
                        </div>

                        {/* Etapa 2: Transporte */}
                        <div className="relative flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-300'}`}>
                            <Truck className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className={currentStep >= 2 ? 'font-bold text-gray-800' : 'text-gray-500'}>Em Transporte</span>
                            {currentStep >= 2 && <span className="text-xs text-blue-600 underline cursor-pointer">Rastreio: {order.tracking}</span>}
                          </div>
                        </div>

                        {/* Etapa 3: Entregue */}
                        <div className="relative flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-300'}`}>
                            <Package className="w-4 h-4" />
                          </div>
                          <span className={currentStep >= 3 ? 'font-bold text-gray-800' : 'text-gray-500'}>Entregue</span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Profile;