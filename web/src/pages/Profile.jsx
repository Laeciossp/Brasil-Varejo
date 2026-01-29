import React, { useState, useEffect } from 'react';
import { createClient } from '@sanity/client'; 
import { Link } from 'react-router-dom';
import { 
  Package, User, MapPin, LogOut, MessageSquare, Send, 
  ShoppingBag, CheckCircle2, Trash2, CreditCard, Truck,
  XCircle, ChevronRight, AlertCircle, Edit2, ExternalLink // Adicionei ExternalLink
} from 'lucide-react';
import { useUser, SignOutButton } from "@clerk/clerk-react";
import useCartStore from '../store/useCartStore';
import { formatCurrency } from '../lib/utils';

// --- CLIENTE SANITY ---
const writeClient = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false, 
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

export default function Profile() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { customer, addAddress, removeAddress, setActiveAddress, setDocument } = useCartStore();
  const [messageInput, setMessageInput] = useState('');
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Estados Endereço
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [newAddr, setNewAddr] = useState({ 
    alias: '', zip: '', street: '', number: '', 
    neighborhood: '', city: '', state: '', document: ''
  });

  const formatarData = (dataString) => {
    if (!dataString) return '-';
    const date = new Date(dataString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }).format(date);
  };

  const getPaymentLabel = (method) => {
      const map = { 
          'pix': 'Pix (À Vista)', 
          'credit_card': 'Cartão de Crédito', 
          'ticket': 'Boleto Bancário' 
      };
      return map[method] || method || 'Não informado';
  };

  useEffect(() => {
    if (customer.addresses.length === 0 && user) {
        // Lógica de fallback se necessário
    }
  }, [customer.addresses.length, user]);

  const fetchData = async () => {
    if (!isLoaded || !user) return;
    const email = user.primaryEmailAddress.emailAddress;
    
    // Substitua APENAS a constante ordersQuery dentro do seu Profile.jsx

    const ordersQuery = `*[_type == "order" && (customer.email == $email || customerEmail == $email)] | order(_createdAt desc) {
      _id, 
      orderNumber, 
      _createdAt, 
      status, 
      totalAmount, 
      paymentMethod,
      shippingAddress,
      
      // --- QUERY CORRIGIDA (Rastreio Novo + Fotos Antigas) ---
    const ordersQuery = `*[_type == "order" && (customer.email == $email || customerEmail == $email)] | order(_createdAt desc) {
      _id, 
      orderNumber, 
      _createdAt, 
      status, 
      totalAmount, 
      paymentMethod,
      shippingAddress,
      
      // --- QUERY CORRIGIDA E SIMPLIFICADA (Volta ao Padrão) ---
    const ordersQuery = `*[_type == "order" && (customer.email == $email || customerEmail == $email)] | order(_createdAt desc) {
      _id, 
      orderNumber, 
      _createdAt, 
      status, 
      totalAmount, 
      paymentMethod,
      shippingAddress,
      
      // RASTREIO (Mantido)
      "trackingCode": coalesce(trackingCode, logistics.trackingCode),
      "trackingUrl": coalesce(trackingUrl, logistics.trackingUrl),
      "carrier": coalesce(carrier, logistics.selectedCarrier, logistics.carrier),
      "shippedAt": coalesce(shippedAt, logistics.shippedAt),
      "deliveryEstimate": coalesce(deliveryEstimate, logistics.shippingMethod, shippingMethod), 

      // ITENS (Voltando ao simples que funciona)
      "items": items[]{ 
        productName, 
        quantity, 
        price,
        
        // Pega o slug direto do produto original
        "productSlug": product->slug.current, 
        
        // Pega a foto do produto original OU a foto salva no item (snapshot)
        "imageUrl": coalesce(product->images[0].asset->url, imageUrl)
      },
      
      messages[]{
        text,
        user,
        date,
        "staffName": staff->name,
        "staffImage": staff->avatar.asset->url
      }
    }`;
      
      messages[]{
        text,
        user,
        date,
        "staffName": staff->name,
        "staffImage": staff->avatar.asset->url
      }
    }`;

  useEffect(() => { if (isLoaded && user) fetchData(); }, [isLoaded, user]);

  useEffect(() => {
    if (!activeChatOrder) return;
    const subscription = writeClient
      .listen(`*[_id == $orderId]`, { orderId: activeChatOrder })
      .subscribe((update) => {
        if (update.result) {
          setOrders((prevOrders) => 
            prevOrders.map((order) => 
              order._id === activeChatOrder ? { ...order, ...update.result } : order
            )
          );
          fetchData(); 
        }
      });
    return () => subscription.unsubscribe();
  }, [activeChatOrder]);

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
      await writeClient
        .patch(orderId)
        .setIfMissing({ messages: [] })
        .append('messages', [newMessage])
        .set({ hasUnreadMessage: true }) 
        .commit();
      setMessageInput('');
    } catch (err) { console.error(err); alert("Erro ao enviar."); } 
    finally { setProcessing(false); }
  };

  const handleCancelOrder = async (orderId) => {
    if(!confirm("Tem certeza que deseja cancelar?")) return;
    setProcessing(true);
    try {
        await writeClient.patch(orderId).set({ 
            status: 'cancelled',
            cancellationReason: 'Cancelado pelo cliente'
        }).commit();
        alert("Pedido cancelado.");
    } catch (err) { console.error(err); alert("Erro ao cancelar."); } 
    finally { setProcessing(false); }
  };

  const handleEditAddress = (addr) => {
    setNewAddr({
        alias: addr.alias || '',
        zip: addr.zip || '',
        street: addr.street || '',
        number: addr.number || '',
        neighborhood: addr.neighborhood || '',
        city: addr.city || '',
        state: addr.state || '',
        document: addr.document || ''
    });
    setEditingId(addr.id);
    setShowAddressForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleSaveAddress = () => {
    if (!newAddr.zip) return alert("CEP é obrigatório");

    if (editingId) {
        removeAddress(editingId);
        addAddress({ 
            ...newAddr, 
            id: editingId, 
            name: user.firstName + ' ' + user.lastName 
        });
    } else {
        addAddress({ 
            ...newAddr, 
            id: Math.random().toString(36).substr(2, 9),
            name: user.firstName + ' ' + user.lastName 
        });
    }

    setShowAddressForm(false);
    setEditingId(null);
    setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '', document: '' });
  };

  const handleCancelEdit = () => {
    setShowAddressForm(false);
    setEditingId(null);
    setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '', document: '' });
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
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>
        <div className="container mx-auto px-4 py-8 max-w-6xl flex items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
                <div className="relative group cursor-pointer">
                    <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-lg group-hover:border-orange-200 transition-all">
                        <img src={user.imageUrl} alt="User" className="w-full h-full object-cover"/>
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white w-5 h-5 rounded-full" title="Online"></div>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Olá, {user.firstName}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                           <ShoppingBag size={10} /> Clube de Compras
                        </span>
                        <p className="text-gray-400 text-xs">{user.primaryEmailAddress.emailAddress}</p>
                    </div>
                </div>
            </div>
            <div className="hidden md:flex flex-col items-end opacity-20 select-none">
                <ShoppingBag size={64} className="text-gray-900" />
                <span className="text-xs font-black uppercase tracking-[0.2em] mt-1">Palastore</span>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* SIDEBAR */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-8">
                    <nav className="flex flex-col p-2 gap-1">
                        <button onClick={() => setActiveTab('orders')} className={`p-3 rounded-xl text-left font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'orders' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>
                            <Package size={18}/> Meus Pedidos
                        </button>
                        <button onClick={() => setActiveTab('address')} className={`p-3 rounded-xl text-left font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'address' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>
                            <MapPin size={18}/> Endereços
                        </button>
                        <div className="border-t border-gray-100 my-1 pt-1">
                             <SignOutButton>
                                <button className="w-full p-3 rounded-xl text-left font-bold text-sm flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors">
                                    <LogOut size={18}/> Sair
                                </button>
                             </SignOutButton>
                        </div>
                    </nav>
                </div>
            </div>

            {/* CONTEÚDO */}
            <div className="lg:col-span-3">
                
                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Package className="text-orange-500" /> Histórico de Pedidos
                        </h2>
                        {orders.length === 0 ? (
                            <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Package size={32} className="text-gray-300"/>
                                </div>
                                <h3 className="font-bold text-gray-900">Nenhum pedido encontrado</h3>
                                <p className="text-gray-500 text-sm mt-1">Aproveite nossas ofertas e faça sua primeira compra!</p>
                            </div>
                        ) : orders.map((order) => (
                            <div key={order._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all group">
                                {/* Header do Pedido */}
                                <div className="bg-gray-50/50 p-5 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
                                    <div className="flex gap-4 items-center">
                                        <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                                            <ShoppingBag size={20}/>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Pedido #{order.orderNumber || order._id.slice(0,8).toUpperCase()}</p>
                                            <p className="text-sm font-bold text-gray-800">{formatarData(order._createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border ${getStatusColor(order.status).replace('text-', 'border-').replace('bg-', 'bg-opacity-20 ')}`}>
                                        {getStatusLabel(order.status)}
                                    </div>
                                </div>

                                {/* CORPO DO PEDIDO */}
                                <div className="p-6">
                                    <div className="flex flex-col lg:flex-row gap-8">
                                        
                                        {/* COLUNA 1: PRODUTOS */}
                                        <div className="flex-1 space-y-4">
                                            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">Produtos Adquiridos</h4>
                                            {order.items?.map((item, i) => {
                                                const hasSlug = item.productSlug && item.productSlug !== '';
                                                const ItemWrapper = hasSlug ? Link : 'div';
                                                const wrapperProps = hasSlug ? { to: `/produto/${encodeURIComponent(item.productSlug)}`, title: `Ver produto: ${item.productSlug}` } : {};
                                                const cursorClass = hasSlug ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default opacity-90';

                                                return (
                                                    <ItemWrapper 
                                                        key={i} 
                                                        {...wrapperProps}
                                                        className={`flex gap-4 items-start py-3 border-b border-dashed border-gray-100 last:border-0 group/item transition-colors p-2 -mx-2 rounded-lg ${cursorClass}`}
                                                    >
                                                        <div className="w-20 h-20 bg-white border border-gray-200 rounded-lg p-1 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                                                            {item.imageUrl ? (
                                                                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain" />
                                                            ) : (
                                                                <Package size={24} className="text-gray-300"/>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-bold text-gray-800 leading-tight ${hasSlug ? 'group-hover/item:text-orange-600 transition-colors' : ''}`}>
                                                                {item.productName}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                                                                <span className="bg-gray-100 px-2 py-1 rounded">Qtd: {item.quantity}</span>
                                                                {!hasSlug && (
                                                                    <span className="text-orange-400 flex items-center gap-1" title="Produto indisponível ou link não encontrado"><AlertCircle size={10}/> Indisponível</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-sm font-black text-gray-900">{formatCurrency(item.price)}</span>
                                                            {hasSlug && <ChevronRight size={16} className="text-gray-300 group-hover/item:text-orange-500 mt-2"/>}
                                                        </div>
                                                    </ItemWrapper>
                                                );
                                            })}
                                        </div>

                                        {/* COLUNA 2: INFO e RASTREIO */}
                                        <div className="lg:w-1/3 space-y-6 lg:border-l lg:border-gray-100 lg:pl-6">
                                            <div>
                                                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2 flex items-center gap-1">
                                                    <MapPin size={12}/> Entrega em:
                                                </h4>
                                                {order.shippingAddress ? (
                                                    <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                        <p className="font-bold text-gray-800">{order.shippingAddress.street}, {order.shippingAddress.number}</p>
                                                        <p>{order.shippingAddress.neighborhood}</p>
                                                        <p>{order.shippingAddress.city} - {order.shippingAddress.state}</p>
                                                        <p className="text-xs text-gray-400 mt-1">CEP: {order.shippingAddress.zip}</p>
                                                    </div>
                                                ) : <p className="text-xs text-gray-400 italic bg-gray-50 p-2 rounded">Endereço não registrado.</p>}
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-1 flex items-center gap-1"><CreditCard size={12}/> Pagamento:</h4>
                                                    <p className="text-sm font-medium text-gray-800">{getPaymentLabel(order.paymentMethod)}</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-1 flex items-center gap-1"><Truck size={12}/> Prazo Estimado:</h4>
                                                    <p className="text-sm font-medium text-green-700">{order.deliveryEstimate || '5 a 12 dias úteis'}</p>
                                                </div>

                                                {/* --- ÁREA DE RASTREIO ADICIONADA --- */}
                                                {order.trackingCode && (
                                                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mt-2">
                                                        <h4 className="text-xs font-black uppercase text-blue-800 tracking-wider mb-2 flex items-center gap-1">
                                                            <Truck size={12}/> Rastreamento:
                                                        </h4>
                                                        <p className="text-sm font-bold text-gray-800 mb-1 font-mono tracking-wider bg-white p-1 rounded border border-blue-100 inline-block">
                                                            {order.trackingCode}
                                                        </p>
                                                        {order.carrier && <p className="text-xs text-gray-600 mb-2">Transportadora: {order.carrier}</p>}
                                                        {order.trackingUrl && (
                                                            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-1">
                                                                Acompanhar Entrega <ExternalLink size={10}/>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                {/* ---------------------------------- */}

                                                <div className="border-t border-gray-200 pt-3 mt-2">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-gray-500 font-bold text-xs uppercase">Total</span>
                                                        <span className="text-xl font-black text-gray-900">{formatCurrency(order.totalAmount)}</span>
                                                    </div>
                                                    {['pending', 'paid'].includes(order.status) && (
                                                        <button onClick={() => handleCancelOrder(order._id)} disabled={processing} className="w-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors shadow-sm">
                                                            <XCircle size={16} /> Cancelar Pedido
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <button onClick={() => setActiveChatOrder(activeChatOrder === order._id ? null : order._id)} className="text-gray-600 text-sm font-bold flex items-center gap-2 hover:text-orange-600 transition-colors">
                                            <MessageSquare size={16}/> {activeChatOrder === order._id ? 'Ocultar Chat' : 'Precisa de ajuda com este pedido?'}
                                        </button>
                                        {activeChatOrder === order._id && (
                                            <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200 shadow-inner animate-in fade-in slide-in-from-top-2">
                                                <div className="h-40 overflow-y-auto mb-3 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                                                    {order.messages?.length > 0 ? order.messages.map((msg, idx) => (
                                                        <div key={idx} className={`flex gap-2 ${msg.user === 'cliente' ? 'justify-end' : 'justify-start items-end'}`}>
                                                            {msg.user !== 'cliente' && (
                                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex-shrink-0 mb-1" title={msg.staffName || 'Suporte'}>
                                                                     {msg.staffImage ? <img src={msg.staffImage} alt="Staff" className="w-full h-full object-cover" /> : <User size={16} className="text-gray-500 m-2"/>}
                                                                </div>
                                                            )}
                                                            <div className={`flex flex-col ${msg.user === 'cliente' ? 'items-end' : 'items-start'}`}>
                                                                {msg.user !== 'cliente' && msg.staffName && <span className="text-[10px] text-gray-400 ml-1 mb-0.5">{msg.staffName}</span>}
                                                                <span className={`px-4 py-2 rounded-2xl text-xs max-w-[85%] leading-relaxed shadow-sm ${msg.user === 'cliente' ? 'bg-orange-500 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'}`}>{msg.text}</span>
                                                            </div>
                                                        </div>
                                                    )) : <p className="text-center text-xs text-gray-400 py-4 italic">Envie uma mensagem para nosso suporte...</p>}
                                                </div>
                                                <div className="flex gap-2 relative">
                                                    <input className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-orange-500 outline-none transition-all" placeholder="Digite sua mensagem..." value={messageInput} onChange={e => setMessageInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage(order._id)}/>
                                                    <button onClick={() => handleSendMessage(order._id)} disabled={processing} className="bg-gray-900 hover:bg-black text-white p-3 rounded-xl transition-colors"><Send size={18}/></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ABA ENDEREÇOS - COM EDIÇÃO */}
                {activeTab === 'address' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><MapPin className="text-orange-500" /> Gerenciar Endereços</h2>
                            {!showAddressForm && (
                                <button onClick={() => { setEditingId(null); setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '', document: '' }); setShowAddressForm(true); }} className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-black transition-all shadow-lg shadow-gray-200 flex items-center gap-2"><CheckCircle2 size={16}/> Cadastrar Novo</button>
                            )}
                        </div>
                        {showAddressForm && (
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl mb-8 relative border-l-4 border-l-orange-500">
                                <button onClick={handleCancelEdit} className="absolute top-4 right-4 text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                                <h3 className="font-bold mb-4 text-gray-800 text-sm uppercase tracking-wide">{editingId ? 'Editar Endereço' : 'Novo Endereço'}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <input placeholder="Apelido (ex: Casa 2, Trabalho)" className="border-2 border-gray-100 p-3 rounded-xl focus:border-orange-500 outline-none" value={newAddr.alias} onChange={e => setNewAddr({...newAddr, alias: e.target.value})}/>
                                    <input placeholder="CEP" maxLength={9} className="border-2 border-gray-100 p-3 rounded-xl focus:border-orange-500 outline-none" value={newAddr.zip} onChange={e => setNewAddr({...newAddr, zip: e.target.value})}/>
                                    <input placeholder="Rua / Logradouro" className="border-2 border-gray-100 p-3 rounded-xl md:col-span-2 focus:border-orange-500 outline-none" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})}/>
                                    <input placeholder="Número" className="border-2 border-gray-100 p-3 rounded-xl focus:border-orange-500 outline-none" value={newAddr.number} onChange={e => setNewAddr({...newAddr, number: e.target.value})}/>
                                    <input placeholder="Bairro" className="border-2 border-gray-100 p-3 rounded-xl focus:border-orange-500 outline-none" value={newAddr.neighborhood} onChange={e => setNewAddr({...newAddr, neighborhood: e.target.value})}/>
                                    <input placeholder="Cidade" className="border-2 border-gray-100 p-3 rounded-xl focus:border-orange-500 outline-none" value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})}/>
                                    <input placeholder="CPF/CNPJ para Faturamento" className="border-2 border-gray-100 p-3 rounded-xl md:col-span-2 focus:border-blue-500 outline-none bg-blue-50/50" value={newAddr.document} onChange={e => setNewAddr({...newAddr, document: e.target.value})}/>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleCancelEdit} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-xl transition-all">Cancelar</button>
                                    <button onClick={handleSaveAddress} className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-600/20 transition-all">{editingId ? 'Atualizar' : 'Salvar'}</button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-4">
                             {customer.addresses?.map(addr => {
                                const isActive = addr.id === customer.activeAddressId;
                                return (
                                <div key={addr.id} className={`p-6 rounded-2xl border-2 transition-all relative group ${isActive ? 'bg-white border-green-500 shadow-xl shadow-green-500/10' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button onClick={() => handleEditAddress(addr)} className="text-gray-300 hover:text-blue-500 transition-colors p-2 hover:bg-blue-50 rounded-full" title="Editar"><Edit2 size={16} /></button>
                                        <button onClick={() => removeAddress(addr.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full" title="Excluir"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <h4 className="font-black text-gray-800 text-lg uppercase tracking-tight">{addr.alias || 'Local'}</h4>
                                        {isActive && (<span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1"><CheckCircle2 size={10}/> Ativo</span>)}
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600 border-l-2 border-gray-100 pl-4 mb-4">
                                        <p className="font-bold text-gray-900">{addr.name || user.fullName}</p>
                                        <p>{addr.street}, {addr.number}</p>
                                        <p>{addr.neighborhood} - {addr.city}/{addr.state}</p>
                                        <p className="font-mono text-gray-400 text-xs">CEP: {addr.zip}</p>
                                    </div>
                                    <div className="pt-4 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="text-xs bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 w-full sm:w-auto">
                                            <span className="block text-gray-400 font-bold uppercase text-[10px]">Faturamento / CPF</span>
                                            <span className="font-mono font-medium text-gray-800">{addr.document || customer.document || 'Não informado'}</span>
                                        </div>
                                        {!isActive && (<button onClick={() => { setActiveAddress(addr.id); if(addr.document) setDocument(addr.document); }} className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">Usar Este</button>)}
                                        {isActive && (<span className="text-xs font-bold text-green-600 flex items-center gap-1 select-none">Endereço Selecionado</span>)}
                                    </div>
                                </div>
                             )})}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}