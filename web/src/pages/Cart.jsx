import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingCart, ArrowRight, ShieldCheck, Minus, Plus, MapPin, PlusCircle, CreditCard, AlertCircle, X } from 'lucide-react';
import { client } from '../lib/sanity';
import useCartStore from '../store/useCartStore'; 
import { formatCurrency } from '../lib/utils'; 

export default function Cart() {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const { 
    items, removeItem, updateQuantity, selectedShipping, 
    getTotalPrice, customer, setActiveAddress, addAddress, setDocument 
  } = useCartStore();
  
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = getTotalPrice();
  const activeAddress = customer.addresses?.find(a => a.id === customer.activeAddressId);

  const [newAddr, setNewAddr] = useState({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });

  const handleSaveAddress = () => {
    if (!newAddr.zip || !newAddr.street || !newAddr.number) return alert("Preencha os campos obrigatórios!");
    addAddress({ ...newAddr, id: Math.random().toString(36).substr(2, 9) });
    setShowForm(false);
    setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });
  };

  const handleCheckout = async () => {
    if (items.length === 0 || !selectedShipping || !activeAddress) {
      return alert("Selecione o frete e um endereço ativo!");
    }
    setLoading(true);
    try {
      // 1. Cria o pedido no Sanity
      const order = {
        _type: 'order',
        orderNumber: `BV-${Math.floor(Math.random() * 10000)}`,
        status: 'pending',
        totalAmount: total,
        customerDocument: customer.document,
        shippingAddress: activeAddress,
        items: items.map(item => ({ 
          _key: Math.random().toString(36).substr(7), 
          productName: item.title, 
          quantity: item.quantity, 
          price: item.price 
        }))
      };
      const createdOrder = await client.create(order);
      
      // 2. Busca a preferência no Worker
      const response = await fetch('https://brasil-varejo-api.laeciossp.workers.dev/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items, 
          shipping: parseFloat(selectedShipping.price), 
          email: "cliente@brasilvarejo.com", 
          orderId: createdOrder._id 
        })
      });
      
      const data = await response.json();

      // 3. ABRE O MODAL (POPUP) DO MERCADO PAGO
      if (data.id_preferencia && window.MercadoPago) {
        // --- SUBSTITUA PELA SUA PUBLIC KEY (APP_USR-...) ---
        const mp = new window.MercadoPago('APP_USR-fb2a68f8-969b-4624-9c81-3725b56f8b4f', {
          locale: 'pt-BR'
        });

        mp.checkout({
          preference: {
            id: data.id_preferencia
          },
          autoOpen: true, // Abre o popup por cima do site
        });
      } else if (data.url) {
        // Fallback: Se o modal falhar, redireciona normalmente
        window.location.href = data.url;
      }

    } catch (error) {
      alert("Erro no processamento.");
      console.error(error);
    } finally { setLoading(false); }
  };

  if (items.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
      <ShoppingCart size={64} className="text-gray-200 mb-4" />
      <h2 className="text-2xl font-black text-slate-800 mb-2">Seu carrinho está vazio</h2>
      <Link to="/" className="text-blue-600 font-bold hover:underline">Voltar às compras</Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      <h1 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter">Meu Carrinho</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item._id} className="flex gap-4 p-5 bg-white rounded-3xl border border-slate-100 items-center shadow-sm">
                <img src={item.image} className="w-20 h-20 object-contain" alt={item.title} />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 leading-tight">{item.title}</h3>
                  <p className="text-blue-600 font-black">{formatCurrency(item.price)}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center bg-slate-100 rounded-xl px-2">
                      <button onClick={() => updateQuantity(item._id, item.quantity - 1)} className="p-2"><Minus size={14}/></button>
                      <span className="px-2 font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._id, item.quantity + 1)} className="p-2"><Plus size={14}/></button>
                    </div>
                    <button onClick={() => removeItem(item._id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><MapPin className="text-blue-600"/> Endereço de Entrega</h2>
               {!showForm && <button onClick={() => setShowForm(true)} className="text-blue-600 font-bold text-xs uppercase flex items-center gap-1"><Plus size={14}/> Novo</button>}
            </div>

            {showForm ? (
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 mb-6 space-y-3">
                <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black uppercase text-slate-400">Cadastrar Endereço</span><button onClick={() => setShowForm(false)}><X size={18}/></button></div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Apelido" className="col-span-2 p-3 rounded-xl text-sm shadow-sm" value={newAddr.alias} onChange={e => setNewAddr({...newAddr, alias: e.target.value})} />
                  <input placeholder="CEP" className="p-3 rounded-xl text-sm shadow-sm" value={newAddr.zip} onChange={e => setNewAddr({...newAddr, zip: e.target.value})} />
                  <input placeholder="Cidade" className="p-3 rounded-xl text-sm shadow-sm" value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})} />
                  <input placeholder="Rua" className="col-span-2 p-3 rounded-xl text-sm shadow-sm" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})} />
                  <input placeholder="Nº" className="p-3 rounded-xl text-sm shadow-sm" value={newAddr.number} onChange={e => setNewAddr({...newAddr, number: e.target.value})} />
                  <input placeholder="Bairro" className="p-3 rounded-xl text-sm shadow-sm" value={newAddr.neighborhood} onChange={e => setNewAddr({...newAddr, neighborhood: e.target.value})} />
                </div>
                <button onClick={handleSaveAddress} className="w-full bg-blue-600 text-white font-black py-3 rounded-xl text-xs uppercase shadow-lg">Salvar e Usar</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {customer.addresses?.map((addr) => (
                  <div key={addr.id} onClick={() => setActiveAddress(addr.id)} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${addr.id === customer.activeAddressId ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-slate-400 border border-slate-100">{addr.alias || 'Endereço'}</span>
                      {addr.id === customer.activeAddressId && <span className="text-blue-600 font-black text-[9px] uppercase tracking-tighter">● Ativo</span>}
                    </div>
                    <p className="text-xs font-black text-slate-800 uppercase">{addr.street}, {addr.number}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                    <p className="text-[10px] font-mono mt-2 text-slate-400">CEP: {addr.zip}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-800 mb-4 uppercase flex items-center gap-2"><CreditCard size={16}/> Faturamento (CPF/CNPJ)</h3>
              <input type="text" placeholder="000.000.000-00" value={customer.document || ''} onChange={(e) => setDocument(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-mono text-sm border-none" />
            </div>
          </div>
        </div>

        <div className="w-full lg:w-96 bg-white p-8 rounded-[40px] shadow-2xl h-fit border border-slate-50 sticky top-24">
          <h3 className="font-black text-xl text-slate-900 mb-6 uppercase">Resumo</h3>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-slate-500 font-medium text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className={`flex justify-between font-bold text-sm ${!selectedShipping ? 'text-red-500' : 'text-slate-800'}`}>
              <span>Frete ({selectedShipping?.name || 'Não selecionado'})</span>
              <span>{selectedShipping ? formatCurrency(selectedShipping.price) : 'R$ 0,00'}</span>
            </div>
          </div>
          <div className="flex justify-between mb-8 text-2xl font-black text-blue-900 border-t pt-4"><span>Total</span><span>{formatCurrency(total)}</span></div>
          
          <button onClick={handleCheckout} disabled={loading || !selectedShipping || !activeAddress} className={`w-full py-5 rounded-3xl font-black uppercase transition-all shadow-xl flex items-center justify-center gap-3 ${!selectedShipping || !activeAddress ? 'bg-slate-200 text-slate-400' : 'bg-orange-500 text-white hover:scale-[1.02]'}`}>
            {loading ? 'Processando...' : !selectedShipping ? 'Escolha o Frete' : !activeAddress ? 'Selecione Endereço' : 'Ir para o Pagamento'} <ArrowRight size={22}/>
          </button>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-50">
            <ShieldCheck size={14} className="text-green-500"/> Compra Segura Mercado Pago
          </div>
        </div>
      </div>
    </div>
  );
}