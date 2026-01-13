import React, { useState, useEffect } from 'react';
import { client } from '../lib/sanity';
import { 
  Package, User, MapPin, LogOut, MessageSquare, Send, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { useUser, SignOutButton } from "@clerk/clerk-react";
import useCartStore from '../store/useCartStore';
import { formatCurrency } from '../lib/utils';

export default function Profile() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'address'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { customer, addAddress, setActiveAddress, setDocument } = useCartStore();
  const [messageInput, setMessageInput] = useState('');
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Estados Endereço
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });

  const fetchData = async () => {
    if (!isLoaded || !user) return;
    const email = user.primaryEmailAddress.emailAddress;
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
      console.error(err); setLoading(false); 
    }
  };

  useEffect(() => { if (isLoaded && user) fetchData(); }, [isLoaded, user]);

  const handleSendMessage = async (orderId) => {
    if (!messageInput.trim()) return;
    setProcessing(true);
    const newMessage = { _key: Math.random().toString(36).substring(7), user: 'cliente', text: messageInput, date: new Date().toISOString() };
    try {
      await client.patch(orderId).setIfMissing({ messages: [] }).append('messages', [newMessage]).commit();
      setMessageInput('');
      fetchData();
    } catch (err) { alert("Erro ao enviar."); } finally { setProcessing(false); }
  };

  const handleSaveAddress = () => {
    if (!newAddr.zip) return;
    addAddress({ ...newAddr, id: Math.random().toString(36).substr(2, 9) });
    setShowAddressForm(false);
    setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });
  };

  const getStatusColor = (status) => {
    const map = { pending: 'bg-yellow-100 text-yellow-700', paid: 'bg-blue-100 text-blue-700', invoiced: 'bg-purple-100 text-purple-700', shipped: 'bg-indigo-100 text-indigo-700', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  const getStatusLabel = (status) => {
    const map = { pending: 'Aguardando Pagamento', paid: 'Pagamento Aprovado', invoiced: 'Nota Fiscal Emitida', shipped: 'Em Trânsito', delivered: 'Entregue', cancelled: 'Cancelado' };
    return map[status] || status;
  };

  if (!isLoaded || loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      
      {/* HEADER SIMPLES */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8 max-w-6xl flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                <img src={user.imageUrl} alt="User" className="w-full h-full object-cover"/>
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Olá, {user.firstName}</h1>
                <p className="text-gray-500 text-sm">{user.primaryEmailAddress.emailAddress}</p>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* SIDEBAR DE NAVEGAÇÃO */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-8">
                    <nav className="flex flex-col">
                        <button onClick={() => setActiveTab('orders')} className={`p-4 text-left font-medium flex items-center gap-3 transition-colors ${activeTab === 'orders' ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <Package size={20}/> Meus Pedidos
                        </button>
                        <button onClick={() => setActiveTab('address')} className={`p-4 text-left font-medium flex items-center gap-3 transition-colors ${activeTab === 'address' ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <MapPin size={20}/> Endereços
                        </button>
                        <div className="border-t border-gray-100 mt-2">
                             <SignOutButton>
                                <button className="w-full p-4 text-left font-medium flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors">
                                    <LogOut size={20}/> Sair
                                </button>
                             </SignOutButton>
                        </div>
                    </nav>
                </div>
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="lg:col-span-3">
                
                {/* --- ABA PEDIDOS --- */}
                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Histórico de Pedidos</h2>
                        {orders.length === 0 ? (
                            <div className="bg-white p-12 text-center rounded-xl border border-gray-100">
                                <Package size={48} className="mx-auto text-gray-300 mb-4"/>
                                <p className="text-gray-500">Você ainda não tem pedidos.</p>
                            </div>
                        ) : orders.map((order) => (
                            <div key={order._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                {/* Header do Pedido */}
                                <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
                                    <div className="flex gap-4 items-center">
                                        <div className="bg-white p-2 rounded border border-gray-200"><Package className="text-gray-400" size={20}/></div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold">Pedido #{order.orderNumber || order._id.slice(0,6).toUpperCase()}</p>
                                            <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                        {getStatusLabel(order.status)}
                                    </div>
                                </div>

                                {/* Corpo do Pedido */}
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                                        <div className="flex-1 space-y-3">
                                            {order.items?.map((item, i) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-gray-600 font-medium"><span className="text-gray-400 font-bold">{item.quantity}x</span> {item.productName}</span>
                                                    <span className="text-gray-900 font-bold">{formatCurrency(item.price)}</span>
                                                </div>
                                            ))}
                                            <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between items-center">
                                                <span className="text-gray-500 font-bold text-sm">Total</span>
                                                <span className="text-xl font-black text-gray-900">{formatCurrency(order.totalAmount)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ações e Chat */}
                                    <div className="border-t border-gray-100 pt-4">
                                        <button 
                                            onClick={() => setActiveChatOrder(activeChatOrder === order._id ? null : order._id)} 
                                            className="text-blue-600 text-sm font-bold flex items-center gap-2 hover:underline"
                                        >
                                            <MessageSquare size={16}/> {activeChatOrder === order._id ? 'Ocultar Mensagens' : 'Precisa de ajuda? Fale conosco'}
                                        </button>

                                        {activeChatOrder === order._id && (
                                            <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                                <div className="h-40 overflow-y-auto mb-3 space-y-2 pr-2">
                                                    {order.messages?.length > 0 ? order.messages.map((msg, idx) => (
                                                        <div key={idx} className={`flex ${msg.user === 'cliente' ? 'justify-end' : 'justify-start'}`}>
                                                            <span className={`px-3 py-2 rounded-lg text-xs max-w-[80%] ${msg.user === 'cliente' ? 'bg-blue-100 text-blue-800' : 'bg-white border text-gray-700'}`}>
                                                                {msg.text}
                                                            </span>
                                                        </div>
                                                    )) : <p className="text-center text-xs text-gray-400 py-4">Nenhuma mensagem. Digite abaixo para iniciar o suporte.</p>}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input 
                                                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:border-orange-500 outline-none" 
                                                        placeholder="Digite sua dúvida..."
                                                        value={messageInput}
                                                        onChange={e => setMessageInput(e.target.value)}
                                                    />
                                                    <button onClick={() => handleSendMessage(order._id)} disabled={processing} className="bg-gray-900 text-white p-2 rounded-lg">
                                                        <Send size={18}/>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- ABA ENDEREÇOS --- */}
                {activeTab === 'address' && (
                    <div>
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Meus Endereços</h2>
                            <button onClick={() => setShowAddressForm(!showAddressForm)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors">
                                + Adicionar Novo
                            </button>
                        </div>

                        {showAddressForm && (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg mb-8">
                                <h3 className="font-bold mb-4 text-gray-800">Novo Endereço</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <input placeholder="Apelido (ex: Casa)" className="border p-2 rounded" value={newAddr.alias} onChange={e => setNewAddr({...newAddr, alias: e.target.value})}/>
                                    <input placeholder="CEP" className="border p-2 rounded" value={newAddr.zip} onChange={e => setNewAddr({...newAddr, zip: e.target.value})}/>
                                    <input placeholder="Rua" className="border p-2 rounded md:col-span-2" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})}/>
                                    <input placeholder="Número" className="border p-2 rounded" value={newAddr.number} onChange={e => setNewAddr({...newAddr, number: e.target.value})}/>
                                    <input placeholder="Bairro" className="border p-2 rounded" value={newAddr.neighborhood} onChange={e => setNewAddr({...newAddr, neighborhood: e.target.value})}/>
                                    <input placeholder="Cidade" className="border p-2 rounded" value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})}/>
                                    <input placeholder="UF" className="border p-2 rounded" maxLength={2} value={newAddr.state} onChange={e => setNewAddr({...newAddr, state: e.target.value})}/>
                                </div>
                                <button onClick={handleSaveAddress} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg">Salvar Endereço</button>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                             {customer.addresses?.map(addr => (
                                <div key={addr.id} className="bg-white p-6 rounded-xl border border-gray-200 relative group hover:border-orange-200 transition-colors">
                                    {addr.id === customer.activeAddressId && (
                                        <span className="absolute top-4 right-4 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Padrão</span>
                                    )}
                                    <h4 className="font-bold text-gray-900 mb-1">{addr.alias}</h4>
                                    <p className="text-gray-600 text-sm">{addr.street}, {addr.number}</p>
                                    <p className="text-gray-500 text-xs mt-1">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                                    <p className="text-gray-400 text-xs mt-2 font-mono">CEP: {addr.zip}</p>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3">
                                        <button onClick={() => setActiveAddress(addr.id)} className="text-xs font-bold text-blue-600 hover:underline">Definir como Padrão</button>
                                    </div>
                                </div>
                             ))}
                        </div>
                        
                        <div className="mt-10 bg-gray-100 p-6 rounded-xl">
                             <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><User size={18}/> Dados Fiscais</h3>
                             <p className="text-sm text-gray-500 mb-4">CPF/CNPJ padrão para emissão de Nota Fiscal em todas as compras.</p>
                             <div className="flex gap-2">
                                <input 
                                    className="border border-gray-300 rounded-lg p-2 w-full max-w-xs" 
                                    value={customer.document || ''} 
                                    onChange={e => setDocument(e.target.value)}
                                    placeholder="000.000.000-00"
                                />
                                <button className="bg-gray-800 text-white px-4 rounded-lg font-bold text-sm">Salvar</button>
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