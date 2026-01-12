import React, { useState, useEffect } from 'react';
import { client } from '../lib/sanity';
import { 
  Package, User, ShieldCheck, MessageSquare, Send, X, CheckCircle2, Pencil, Save
} from 'lucide-react';
// Importação do Clerk
import { useUser } from "@clerk/clerk-react";
import useCartStore from '../store/useCartStore';
import { formatCurrency } from '../lib/utils';

export default function Profile() {
  const { user, isLoaded } = useUser(); // Hook para pegar dados do usuário logado
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { customer, addAddress, updateAddress, setActiveAddress, setDocument } = useCartStore();

  const [messageInput, setMessageInput] = useState('');
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [newAddr, setNewAddr] = useState({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });

  // Busca dados dinamicamente baseados no usuário logado
  const fetchData = async () => {
    if (!isLoaded || !user) return;

    const email = user.primaryEmailAddress.emailAddress; // E-mail real do Clerk
    
    // Query que busca pedidos vinculados ao e-mail logado
    const ordersQuery = `*[_type == "order" && (customer.email == $email || customerEmail == $email)] | order(createdAt desc) {
      _id, orderNumber, createdAt, status, totalAmount, cancellationReason,
      "items": items[]{ productName, quantity, price },
      messages
    }`;

    try {
      const ordersResult = await client.fetch(ordersQuery, { email });
      setOrders(ordersResult);
      setLoading(false);
    } catch (err) { 
      console.error("Erro ao buscar pedidos:", err); 
      setLoading(false); 
    }
  };

  // Recarrega sempre que o usuário logar ou mudar
  useEffect(() => { 
    if (isLoaded && user) {
      fetchData(); 
    }
  }, [isLoaded, user]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Tem certeza que deseja cancelar este pedido?")) return;
    setProcessing(true);
    try {
      await client.patch(orderId).set({ status: 'cancelled', cancellationReason: 'Cancelado pelo cliente via Portal' }).commit();
      fetchData();
    } catch (err) {
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
    } catch (err) { 
      alert("Erro ao enviar mensagem."); 
    } finally { 
      setProcessing(false); 
    }
  };

  const handleEditAddress = (addr, e) => {
    e.stopPropagation();
    setNewAddr(addr);
    setEditingId(addr.id);
    setShowAddressForm(true);
  };

  const handleSaveNewAddress = () => {
    if (!newAddr.zip || !newAddr.street || !newAddr.state) return alert("Preencha CEP, Rua e Estado!");

    if (editingId) {
        updateAddress?.(editingId, newAddr);
        setEditingId(null);
    } else {
        addAddress({ ...newAddr, id: Math.random().toString(36).substr(2, 9) });
    }

    setShowAddressForm(false);
    setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });
  };

  const getStatusLabel = (status) => {
    const map = { pending: 'Aguardando Pagamento', paid: 'Pagamento Aprovado', invoiced: 'Nota Fiscal Emitida', shipped: 'Em Transporte', delivered: 'Entregue', cancelled: 'Cancelado' };
    return map[status] || status;
  };

  const getProgress = (status) => {
    const steps = { pending: 10, paid: 30, invoiced: 50, shipped: 75, delivered: 100, cancelled: 0 };
    return steps[status] || 0;
  };

  if (!isLoaded || loading) return <div className="p-20 text-center font-bold text-gray-400 animate-pulse uppercase tracking-widest">Sincronizando com Clerk...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Header do Perfil com dados do Clerk */}
      <div className="bg-crocus-deep text-white pt-10 pb-20 px-4">
        <div className="container mx-auto max-w-5xl flex items-center gap-6">
          <div className="w-20 h-20 bg-white rounded-3xl overflow-hidden border-2 border-white/20 shadow-xl">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-black bg-white/10">
                {user?.firstName?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Olá, {user?.firstName || 'Cliente'}</h1>
            <p className="text-crocus-light opacity-80 font-bold uppercase text-[10px] tracking-widest">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-[40px] shadow-2xl border border-white overflow-hidden min-h-[500px]">
          <div className="flex bg-slate-50 border-b border-slate-100">
            <button onClick={() => setActiveTab('orders')} className={`flex-1 py-5 font-black text-xs uppercase flex items-center justify-center gap-2 border-b-4 transition-all ${activeTab === 'orders' ? 'border-crocus-vivid text-crocus-deep bg-white' : 'border-transparent text-slate-400'}`}>
              <Package size={18}/> Meus Pedidos
            </button>
            <button onClick={() => setActiveTab('data')} className={`flex-1 py-5 font-black text-xs uppercase flex items-center justify-center gap-2 border-b-4 transition-all ${activeTab === 'data' ? 'border-crocus-vivid text-crocus-deep bg-white' : 'border-transparent text-slate-400'}`}>
              <User size={18}/> Meus Dados
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'orders' && (
              <div className="space-y-8">
                {orders.length === 0 ? (
                  <div className="text-center py-20 opacity-20 font-black uppercase">Nenhum pedido encontrado para este e-mail.</div>
                ) : orders.map((order) => {
                  const progress = getProgress(order.status);
                  return (
                    <div key={order._id} className={`border-2 rounded-[32px] overflow-hidden transition-all ${order.status === 'cancelled' ? 'border-red-100 opacity-60' : 'border-slate-50 hover:border-crocus-light'}`}>
                      <div className="p-6 border-b flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pedido</span>
                          <p className="font-mono font-black text-lg text-crocus-deep">#{order.orderNumber || order._id.substring(0,6).toUpperCase()}</p>
                        </div>
                        <div className="flex-1 px-4 min-w-[200px]">
                           <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                             <div className={`h-full ${order.status === 'cancelled' ? 'bg-red-500' : 'bg-crocus-vivid'}`} style={{ width: `${progress}%` }}></div>
                           </div>
                           <p className="text-[10px] font-black uppercase text-slate-500">{getStatusLabel(order.status)}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-black text-slate-800">{formatCurrency(order.totalAmount)}</p>
                        </div>
                      </div>

                      <div className="p-6 flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-3">
                          {order.items?.map((item, idx) => (
                             <div key={idx} className="flex gap-3 items-center text-sm font-bold text-slate-600">
                               <CheckCircle2 size={14} className="text-green-500"/> {item.quantity}x {item.productName}
                             </div>
                          ))}
                        </div>
                        <div className="flex flex-col gap-2 min-w-[220px]">
                           <button onClick={() => setActiveChatOrder(activeChatOrder === order._id ? null : order._id)} className="w-full bg-slate-100 text-slate-600 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-crocus-light/20 transition-all">
                             <MessageSquare size={16}/> {activeChatOrder === order._id ? 'Fechar Chat' : 'Preciso de Ajuda'}
                           </button>
                           {['pending', 'paid'].includes(order.status) && (
                             <button onClick={() => handleCancelOrder(order._id)} disabled={processing} className="w-full text-red-400 py-2 font-black text-[9px] uppercase hover:text-red-600">Cancelar Pedido</button>
                           )}
                        </div>
                      </div>

                      {activeChatOrder === order._id && (
                        <div className="bg-slate-50 p-6 border-t border-slate-100">
                           <div className="bg-white border border-slate-100 rounded-[24px] p-4 h-40 overflow-y-auto mb-4 space-y-3 shadow-inner">
                              {order.messages?.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.user === 'cliente' ? 'items-end' : 'items-start'}`}>
                                  <div className={`p-3 rounded-2xl text-xs font-bold ${msg.user === 'cliente' ? 'bg-crocus-light/20 text-crocus-deep' : 'bg-slate-100 text-slate-700'}`}>{msg.text}</div>
                                </div>
                              ))}
                           </div>
                           <div className="flex gap-2">
                             <input type="text" className="flex-1 bg-white border-none rounded-xl px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-crocus-vivid" placeholder="Sua mensagem..." value={messageInput} onChange={e => setMessageInput(e.target.value)} />
                             <button onClick={() => handleSendMessage(order._id)} className="bg-crocus-deep text-white p-3 rounded-xl shadow-lg"><Send size={20}/></button>
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'data' && (
              <div className="animate-fade-in">
                {/* Meus Dados / Endereços */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">📍 Meus Endereços</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase">Gerencie seus locais de entrega padrão</p>
                  </div>
                  {!showAddressForm && (
                    <button onClick={() => { setShowAddressForm(true); setEditingId(null); setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' }); }} className="bg-crocus-deep text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">Novo Endereço</button>
                  )}
                </div>

                {/* Formulário de Endereço */}
                {showAddressForm && (
                  <div className="bg-slate-50 p-8 rounded-[40px] border-2 border-dashed border-slate-200 mb-10 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-[10px] font-black uppercase text-crocus-deep tracking-widest">{editingId ? 'Editar Endereço' : 'Novo Endereço'}</span>
                       <button onClick={() => setShowAddressForm(false)} className="text-slate-400 hover:text-red-500"><X/></button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                       <input type="text" placeholder="Apelido (Ex: Casa)" className="p-4 rounded-2xl border-none shadow-sm text-sm font-bold" value={newAddr.alias} onChange={e => setNewAddr({...newAddr, alias: e.target.value})} />
                       <input type="text" placeholder="CEP" className="p-4 rounded-2xl border-none shadow-sm text-sm" value={newAddr.zip} onChange={e => setNewAddr({...newAddr, zip: e.target.value})} />
                       <div className="grid grid-cols-3 gap-2">
                            <input type="text" placeholder="Cidade" className="col-span-2 p-4 rounded-2xl border-none shadow-sm text-sm font-bold" value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})} />
                            <input type="text" placeholder="UF" className="p-4 rounded-2xl border-none shadow-sm text-sm font-bold text-center uppercase" maxLength={2} value={newAddr.state} onChange={e => setNewAddr({...newAddr, state: e.target.value})} />
                       </div>
                       <input type="text" placeholder="Rua" className="md:col-span-2 p-4 rounded-2xl border-none shadow-sm text-sm font-bold" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})} />
                       <input type="text" placeholder="Número" className="p-4 rounded-2xl border-none shadow-sm text-sm font-bold" value={newAddr.number} onChange={e => setNewAddr({...newAddr, number: e.target.value})} />
                       <input type="text" placeholder="Bairro" className="p-4 rounded-2xl border-none shadow-sm text-sm font-bold" value={newAddr.neighborhood} onChange={e => setNewAddr({...newAddr, neighborhood: e.target.value})} />
                    </div>
                    <button onClick={handleSaveNewAddress} className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] uppercase tracking-widest text-xs shadow-xl">{editingId ? 'Atualizar' : 'Salvar'}</button>
                  </div>
                )}

                {/* Lista de Endereços */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                   {customer.addresses?.map(addr => (
                     <div key={addr.id} onClick={() => setActiveAddress(addr.id)} className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all relative group ${addr.id === customer.activeAddressId ? 'border-crocus-vivid bg-crocus-light/5' : 'border-slate-100 hover:border-slate-200'}`}>
                        <button onClick={(e) => handleEditAddress(addr, e)} className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-400 hover:text-crocus-vivid shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <Pencil size={14} />
                        </button>
                        <div className="flex justify-between items-start mb-4">
                           <span className="bg-white border border-slate-100 px-3 py-1 rounded-xl text-[9px] font-black uppercase text-slate-400">{addr.alias || 'Endereço'}</span>
                           {addr.id === customer.activeAddressId && <span className="text-crocus-vivid font-black text-[9px] uppercase mr-8">● Ativo</span>}
                        </div>
                        <p className="text-sm font-black text-slate-800 uppercase leading-tight">{addr.street}, {addr.number}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{addr.neighborhood} - {addr.city}/{addr.state || 'UF'}</p>
                        <p className="text-[10px] font-mono mt-3 text-slate-300 font-bold">CEP: {addr.zip}</p>
                     </div>
                   ))}
                </div>

                {/* Faturamento */}
                <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
                   <div className="relative z-10">
                      <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 mb-2"><ShieldCheck className="text-crocus-vivid" size={24}/> Faturamento Oficial</h3>
                      <p className="text-xs text-slate-400 font-bold mb-8 uppercase tracking-widest">Documento padrão para Notas Fiscais</p>
                      
                      <div className="max-w-md space-y-4">
                         <input 
                           type="text" 
                           placeholder="CPF ou CNPJ..." 
                           value={customer.document || ''} 
                           onChange={e => setDocument(e.target.value)} 
                           className="w-full bg-white/5 border border-white/10 p-5 rounded-[24px] outline-none focus:border-crocus-vivid font-mono text-sm transition-all" 
                         />
                         <button onClick={() => alert("Dados salvos!")} className="w-full bg-crocus-stamen text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-2xl">Salvar Informações</button>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}