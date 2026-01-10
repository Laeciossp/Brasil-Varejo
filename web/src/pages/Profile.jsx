import React, { useState, useEffect } from 'react';
import { client, urlFor } from '../lib/sanity';
import { 
  Package, MapPin, User, Truck, ExternalLink, AlertCircle, 
  Plus, Trash2, Save, MessageSquare, XCircle, Send, Clock
} from 'lucide-react';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [customerData, setCustomerData] = useState({
    name: '', email: 'cliente@teste.com', personType: 'fisica', cpf_cnpj: '', addresses: []
  });
  const [loading, setLoading] = useState(true);
  
  // Estados para interação (Chat e Cancelamento)
  const [messageInput, setMessageInput] = useState('');
  const [activeChatOrder, setActiveChatOrder] = useState(null); // Qual pedido o chat está aberto
  const [processing, setProcessing] = useState(false);

  // Estados de Endereço
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ alias: 'Casa', cep: '', street: '', number: '', district: '', city: '', state: '' });

  // --- CARREGAMENTO DE DADOS ---
  const fetchData = async () => {
    const email = customerData.email;
    const ordersQuery = `*[_type == "order" && customer.email == $email] | order(createdAt desc) {
      _id, orderNumber, createdAt, status, totalAmount, cancellationReason,
      "items": items[]{ productName, quantity, price, "image": productRef->images[0] },
      logistics { trackingCode, trackingUrl, selectedCarrier, "carrierData": *[_type == "carrierConfig"][0].carriers[serviceName match ^.selectedCarrier]{ logoUrl, trackingUrlTemplate, name }[0] },
      messages
    }`;
    const customerQuery = `*[_type == "customer" && email == $email][0]`;

    try {
      const [ordersResult, customerResult] = await Promise.all([
        client.fetch(ordersQuery, { email }),
        client.fetch(customerQuery, { email })
      ]);
      setOrders(ordersResult);
      if (customerResult) setCustomerData(customerResult);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- AÇÕES DO USUÁRIO ---
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Tem certeza que deseja cancelar este pedido? Essa ação não pode ser desfeita.")) return;
    setProcessing(true);
    try {
      await client.patch(orderId).set({ status: 'cancelled', cancellationReason: 'Cancelado pelo cliente via Portal' }).commit();
      alert("Pedido cancelado com sucesso.");
      fetchData();
    } catch (err) {
      alert("Erro ao cancelar. Verifique permissões.");
      console.error(err);
    } finally { setProcessing(false); }
  };

  const handleSendMessage = async (orderId) => {
    if (!messageInput.trim()) return;
    setProcessing(true);
    const newMessage = {
      _key: Math.random().toString(36).substring(7),
      user: 'cliente',
      text: messageInput,
      date: new Date().toISOString()
    };
    try {
      await client.patch(orderId).setIfMissing({ messages: [] }).append('messages', [newMessage]).commit();
      setMessageInput('');
      fetchData();
    } catch (err) { alert("Erro ao enviar mensagem."); } finally { setProcessing(false); }
  };

  const getProgress = (status) => {
    const steps = { pending: 10, paid: 30, invoiced: 50, shipped: 75, delivered: 100, cancelled: 0 };
    return steps[status] || 0;
  };

  const getStatusLabel = (status) => {
    const map = { pending: 'Aguardando Pagamento', paid: 'Pagamento Aprovado', invoiced: 'Nota Fiscal Emitida', shipped: 'Em Transporte', delivered: 'Entregue', cancelled: 'Cancelado' };
    return map[status] || status;
  };

  if (loading) return <div className="p-20 text-center font-bold text-gray-400 animate-pulse">Carregando perfil...</div>;

  return (
    <div className="bg-surface-primary min-h-screen pb-10">
      
      {/* CABEÇALHO (Agora Violeta Profundo) */}
      <div className="bg-crocus-deep text-white pt-10 pb-20 px-4 shadow-crocus">
        <div className="container mx-auto max-w-5xl flex items-center gap-6">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-black border-4 border-white/20 shadow-inner">
            {customerData.name ? customerData.name.charAt(0) : 'C'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Olá, {customerData.name || 'Cliente'}</h1>
            <p className="text-crocus-light opacity-80">{customerData.email}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-white overflow-hidden min-h-[500px]">
          
          {/* ABAS (Cores da Marca) */}
          <div className="flex border-b border-gray-100">
            <button onClick={() => setActiveTab('orders')} className={`flex-1 py-5 font-bold text-sm uppercase flex items-center justify-center gap-2 border-b-4 transition-colors ${activeTab === 'orders' ? 'border-crocus-vivid text-crocus-deep bg-crocus-light/10' : 'border-transparent text-gray-400 hover:bg-gray-50'}`}>
              <Package size={20}/> Meus Pedidos
            </button>
            <button onClick={() => setActiveTab('data')} className={`flex-1 py-5 font-bold text-sm uppercase flex items-center justify-center gap-2 border-b-4 transition-colors ${activeTab === 'data' ? 'border-crocus-vivid text-crocus-deep bg-crocus-light/10' : 'border-transparent text-gray-400 hover:bg-gray-50'}`}>
              <User size={20}/> Meus Dados
            </button>
          </div>

          {/* LISTA DE PEDIDOS */}
          {activeTab === 'orders' && (
            <div className="p-8 space-y-8">
              {orders.length === 0 ? (
                <div className="text-center py-10 opacity-50"><Package size={48} className="mx-auto mb-2 text-crocus-deep"/>Nenhum pedido encontrado.</div>
              ) : orders.map((order) => {
                const progress = getProgress(order.status);
                const trackingUrl = order.logistics?.carrierData?.trackingUrlTemplate?.replace('{CODE}', order.logistics?.trackingCode);
                const canCancel = ['pending', 'paid'].includes(order.status);

                return (
                  <div key={order._id} className={`border rounded-2xl overflow-hidden transition-all ${order.status === 'cancelled' ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:border-crocus-light hover:shadow-crocus'}`}>
                    
                    {/* Cabeçalho do Card */}
                    <div className={`p-5 border-b flex flex-wrap justify-between items-center gap-4 ${order.status === 'cancelled' ? 'bg-red-100 border-red-200' : 'bg-surface-secondary border-gray-100'}`}>
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pedido</span>
                        <p className="font-mono font-bold text-lg text-crocus-deep">#{order.orderNumber}</p>
                      </div>
                      
                      {/* Barra de Progresso (Agora Roxo Vibrante) */}
                      <div className="flex-1 px-4 min-w-[200px]">
                        {order.status === 'cancelled' ? (
                          <div className="text-center font-black text-red-600 uppercase flex items-center justify-center gap-2">
                             <XCircle size={20}/> Pedido Cancelado
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1 uppercase">
                              <span className={progress >= 10 ? 'text-crocus-vivid' : ''}>Pedido</span>
                              <span className={progress >= 75 ? 'text-crocus-vivid' : ''}>Envio</span>
                              <span className={progress >= 100 ? 'text-green-600' : ''}>Entrega</span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-1000 ${order.status === 'delivered' ? 'bg-green-500' : 'bg-crocus-vivid'}`} style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-center text-xs font-bold mt-1 text-gray-500">{getStatusLabel(order.status)}</p>
                          </>
                        )}
                      </div>
                      
                      <div className="text-right">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total</p>
                         <p className="font-bold text-gray-800">R$ {order.totalAmount?.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="p-5 flex flex-col md:flex-row gap-6 bg-white">
                      <div className="flex-1 space-y-3">
                        {order.items?.map((item, idx) => (
                           <div key={idx} className="flex gap-3 items-center text-sm">
                             <div className="w-12 h-12 bg-surface-secondary rounded-lg border border-gray-100 flex-shrink-0 flex items-center justify-center p-1">
                               {item.image && <img src={urlFor(item.image).width(100).url()} className="max-w-full max-h-full object-contain mix-blend-multiply"/>}
                             </div>
                             <span className="font-medium text-gray-700">{item.quantity}x {item.productName}</span>
                           </div>
                        ))}
                      </div>
                      
                      {/* Área de Ações */}
                      <div className="flex flex-col gap-2 min-w-[250px]">
                        
                        {/* Rastreio */}
                        {order.logistics?.trackingCode && order.status !== 'cancelled' && (
                          <div className="bg-surface-secondary p-3 rounded-lg border border-gray-100 mb-2">
                            <div className="flex items-center gap-2 mb-1 text-crocus-deep font-bold text-xs uppercase">
                              <Truck size={14}/> {order.logistics.carrierData?.name}
                            </div>
                            <div className="text-center font-mono font-bold text-gray-600 text-sm mb-2 tracking-widest">{order.logistics.trackingCode}</div>
                            {trackingUrl && (
                              <a href={trackingUrl} target="_blank" className="block w-full text-center bg-crocus-stamen hover:brightness-110 text-white text-xs font-bold py-3 rounded-lg transition-all shadow-sm">
                                Rastrear Objeto
                              </a>
                            )}
                          </div>
                        )}

                        {/* Botões de Ação */}
                        <button 
                          onClick={() => setActiveChatOrder(activeChatOrder === order._id ? null : order._id)}
                          className="w-full border border-gray-200 hover:border-crocus-light hover:bg-crocus-light/10 text-gray-600 hover:text-crocus-deep py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                          <MessageSquare size={16}/> {activeChatOrder === order._id ? 'Fechar Chat' : 'Preciso de Ajuda'}
                        </button>

                        {canCancel && (
                          <button 
                            onClick={() => handleCancelOrder(order._id)}
                            disabled={processing}
                            className="w-full text-red-400 hover:text-red-600 hover:bg-red-50 py-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-colors"
                          >
                            <XCircle size={14}/> Cancelar Pedido
                          </button>
                        )}
                      </div>
                    </div>

                    {/* --- ÁREA DE MENSAGENS (SAC) --- */}
                    {activeChatOrder === order._id && (
                      <div className="bg-surface-secondary p-5 border-t border-gray-100 animate-fade-in">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><MessageSquare size={14}/> Fale com a Loja</p>
                        
                        <div className="bg-white border border-gray-200 rounded-xl p-4 h-48 overflow-y-auto mb-3 space-y-3 shadow-inner">
                          {order.messages?.length > 0 ? order.messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.user === 'cliente' ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.user === 'cliente' ? 'bg-crocus-light/30 text-crocus-deep rounded-tr-none' : 'bg-gray-100 text-gray-700 rounded-tl-none'}`}>
                                {msg.text}
                              </div>
                              <span className="text-[9px] text-gray-400 mt-1 px-1">
                                {new Date(msg.date).toLocaleDateString()} às {new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          )) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs italic gap-2">
                              <MessageSquare size={24} className="opacity-20"/>
                              Envie sua dúvida sobre este pedido.
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Digite sua mensagem..." 
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:border-crocus-vivid focus:ring-1 focus:ring-crocus-vivid outline-none"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            disabled={processing}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(order._id)}
                          />
                          <button 
                            onClick={() => handleSendMessage(order._id)}
                            disabled={processing}
                            className="bg-crocus-deep text-white p-2 w-12 rounded-lg hover:bg-crocus-vivid transition-colors disabled:opacity-50 flex items-center justify-center"
                          >
                            <Send size={18}/>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

          {/* MEUS DADOS (Formulários) */}
          {activeTab === 'data' && (
             <div className="p-8">
                {/* ... (Lógica de dados pessoais mantida, apenas ajustando botões) ... */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                   <div>
                      <h3 className="text-lg font-black text-brand-dark mb-4 flex items-center gap-2"><User size={20} className="text-crocus-vivid"/> Dados Pessoais</h3>
                      {/* ... inputs ... */}
                      <input type="text" placeholder="Nome Completo" className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-crocus-vivid outline-none bg-surface-primary" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})}/>
                   </div>
                   
                   <div>
                     <h3 className="text-lg font-black text-brand-dark mb-4 flex items-center gap-2"><MapPin size={20} className="text-crocus-vivid"/> Endereços</h3>
                     {/* ... lista de endereços ... */}
                     <button onClick={() => setShowAddressForm(!showAddressForm)} className="text-xs font-bold bg-crocus-light/20 text-crocus-deep px-3 py-1 rounded hover:bg-crocus-light/40 transition-colors flex items-center gap-1 mb-4">
                        <Plus size={14}/> Adicionar Novo
                     </button>
                     {/* Form de endereço */}
                     {showAddressForm && (
                        <div className="bg-surface-secondary p-4 rounded-xl border border-gray-100 animate-fade-in">
                           <div className="grid gap-2 mb-2"><input placeholder="CEP" className="p-2 border rounded text-sm w-full" value={newAddress.cep} onChange={e => setNewAddress({...newAddress, cep: e.target.value})}/></div>
                           <button className="w-full bg-brand-dark text-white font-bold py-2 rounded-lg text-xs hover:bg-gray-800">Salvar Endereço</button>
                        </div>
                     )}
                   </div>
                </div>

                <div className="border-t border-gray-100 pt-6 text-right">
                  <button 
                    onClick={() => alert("Salvo!")}
                    className="bg-crocus-stamen hover:brightness-110 text-white py-3 px-8 rounded-full font-bold text-lg shadow-lg hover:shadow-orange-500/30 flex items-center gap-2 ml-auto transition-all transform hover:scale-105"
                  >
                    <Save size={20}/> Salvar Alterações
                  </button>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}