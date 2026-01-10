import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingCart, ArrowRight, ShieldCheck, Minus, Plus, MapPin, X, CreditCard } from 'lucide-react';
import { client } from '../lib/sanity';
import useCartStore from '../store/useCartStore'; 
import { formatCurrency } from '../lib/utils'; 

export default function Cart() {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [recalculatingShipping, setRecalculatingShipping] = useState(false);
  
  const { 
    items, removeItem, updateQuantity, selectedShipping, setShipping,
    getTotalPrice, customer, setActiveAddress, addAddress, 
    setDocument, tipoPagamento, setTipoPagamento 
  } = useCartStore();
  
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalFinal = getTotalPrice();
  const activeAddress = customer.addresses?.find(a => a.id === customer.activeAddressId);

  // --- RECALCULAR FRETE AO MUDAR ENDEREÇO ---
  useEffect(() => {
    const recalculate = async () => {
        if (!activeAddress || items.length === 0) return;
        
        setRecalculatingShipping(true);
        try {
            const workerUrl = 'https://brasil-varejo-api.laeciossp.workers.dev/shipping';
            // Pega o primeiro produto para verificar a flag de frete grátis no backend
            const mainProduct = items[0];

            const response = await fetch(workerUrl, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  from: { postal_code: "43805000" },
                  to: { postal_code: activeAddress.zip },
                  products: items.map(p => ({
                    id: p._id, // Envia ID correto
                    width: p.logistics?.width || 15,
                    height: p.logistics?.height || 15,
                    length: p.logistics?.length || 15,
                    weight: p.logistics?.weight || 0.5,
                    insurance_value: p.price,
                    quantity: p.quantity
                  }))
                })
            });
            const options = await response.json();
            
            if (Array.isArray(options) && options.length > 0) {
                // Tenta manter a mesma opção (ex: SEDEX) se existir, senão pega a primeira (mais barata/grátis)
                const currentName = selectedShipping?.name;
                const sameOption = options.find(o => o.name === currentName);
                setShipping(sameOption || options[0]);
            } else {
                setShipping(null); // Nenhum frete disponível
            }
        } catch (error) {
            console.error("Erro ao recalcular frete", error);
        } finally {
            setRecalculatingShipping(false);
        }
    };

    recalculate();
  }, [customer.activeAddressId, items.length]); // Executa quando muda endereço ou itens

  const [newAddr, setNewAddr] = useState({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });

  const handleSaveAddress = () => {
    if (!newAddr.zip || !newAddr.street) return alert("Preencha os campos obrigatórios!");
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
      const order = {
        _type: 'order',
        orderNumber: `BV-${Math.floor(Math.random() * 10000)}`,
        status: 'pending',
        totalAmount: totalFinal,
        customerDocument: customer.document,
        shippingAddress: activeAddress,
        paymentMethod: tipoPagamento,
        items: items.map(item => ({ _key: Math.random().toString(36).substr(7), productName: item.title, quantity: item.quantity, price: item.price }))
      };
      const createdOrder = await client.create(order);
      
      const response = await fetch('https://brasil-varejo-api.laeciossp.workers.dev/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items, 
            shipping: parseFloat(selectedShipping.price), 
            email: "cliente@brasilvarejo.com", 
            orderId: createdOrder._id, 
            tipoPagamento,
            shippingAddress: activeAddress, // Envia endereço completo
            customerDocument: customer.document // Envia documento
        })
      });
      
      const data = await response.json();

      if (data.id_preferencia && window.MercadoPago) {
        const mp = new window.MercadoPago('APP_USR-fb2a68f8-969b-4624-9c81-3725b56f8b4f', { locale: 'pt-BR' });
        const checkout = mp.checkout({ preference: { id: data.id_preferencia } });
        checkout.open(); 
      } else {
        window.location.href = data.url; 
      }

    } catch (error) {
      alert("Erro no checkout.");
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
      <h1 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic">Checkout</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          
          {/* PRODUTOS */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item._id} className="flex gap-4 p-5 bg-white rounded-3xl border border-slate-100 items-center shadow-sm">
                <img src={item.image} className="w-16 h-16 object-contain" alt={item.title} />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{item.title}</h3>
                  <p className="text-blue-600 font-black">{formatCurrency(item.price)}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center bg-slate-100 rounded-xl px-2">
                      <button onClick={() => updateQuantity(item._id, item.quantity - 1)} className="p-1"><Minus size={12}/></button>
                      <span className="px-2 font-bold text-xs">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._id, item.quantity + 1)} className="p-1"><Plus size={12}/></button>
                    </div>
                    <button onClick={() => removeItem(item._id)} className="text-red-300"><Trash2 size={18}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ENDEREÇOS */}
          <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
               <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">📍 Meus Endereços</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase">Gerencie seus locais de entrega padrão</p>
               </div>
               {!showForm && (
                 <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">Novo Endereço</button>
               )}
            </div>

            {showForm && (
              <div className="bg-slate-50 p-8 rounded-[40px] border-2 border-dashed border-slate-200 mb-10 space-y-4 animate-in slide-in-from-top">
                <div className="flex justify-between items-center mb-4">
                   <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Novo Endereço</span>
                   <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500"><X/></button>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                   <input type="text" placeholder="Apelido (Ex: Casa)" className="p-4 rounded-2xl border-none shadow-sm text-sm" value={newAddr.alias} onChange={e => setNewAddr({...newAddr, alias: e.target.value})} />
                   <input type="text" placeholder="CEP" className="p-4 rounded-2xl border-none shadow-sm text-sm" value={newAddr.zip} onChange={e => setNewAddr({...newAddr, zip: e.target.value})} />
                   <input type="text" placeholder="Cidade" className="p-4 rounded-2xl border-none shadow-sm text-sm" value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})} />
                   <input type="text" placeholder="Rua" className="md:col-span-2 p-4 rounded-2xl border-none shadow-sm text-sm" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})} />
                   <input type="text" placeholder="Nº" className="p-4 rounded-2xl border-none shadow-sm text-sm" value={newAddr.number} onChange={e => setNewAddr({...newAddr, number: e.target.value})} />
                   <input type="text" placeholder="Bairro" className="p-4 rounded-2xl border-none shadow-sm text-sm" value={newAddr.neighborhood} onChange={e => setNewAddr({...newAddr, neighborhood: e.target.value})} />
                </div>
                <button onClick={handleSaveAddress} className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] uppercase tracking-widest text-xs shadow-xl">Salvar e Usar</button>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-12">
               {customer.addresses?.map(addr => (
                 <div key={addr.id} onClick={() => setActiveAddress(addr.id)} className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all relative ${addr.id === customer.activeAddressId ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-4">
                       <span className="bg-white border border-slate-100 px-3 py-1 rounded-xl text-[9px] font-black uppercase text-slate-400">{addr.alias || 'Endereço'}</span>
                       {addr.id === customer.activeAddressId && <span className="text-blue-600 font-black text-[9px] uppercase tracking-tighter">● Ativo</span>}
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase leading-tight">{addr.street}, {addr.number}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                    <p className="text-[10px] font-mono mt-3 text-slate-300 font-bold italic">CEP: {addr.zip}</p>
                 </div>
               ))}
            </div>

            <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
               <div className="relative z-10">
                  <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 mb-2"><ShieldCheck className="text-blue-400" size={24}/> FATURAR CNPJ OU CPF; INSIRA NÚMERO:</h3>
                  <div className="max-w-md space-y-4 mt-6">
                     <input type="text" placeholder="CPF/CNPJ para Nota Fiscal..." value={customer.document || ''} onChange={e => setDocument(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-[24px] outline-none focus:border-blue-400 font-mono text-sm transition-all" />
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter italic"><CreditCard size={20} className="text-blue-600"/> Pagamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all ${tipoPagamento === 'pix' ? 'border-green-500 bg-green-50' : 'border-slate-100 hover:border-green-200'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" checked={tipoPagamento === 'pix'} onChange={() => setTipoPagamento('pix')} />
                  <div><span className="block font-black text-xs uppercase">Pix</span><span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">10% OFF</span></div>
                </div>
              </label>
              <label className={`flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all ${tipoPagamento === 'cartao' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" checked={tipoPagamento === 'cartao'} onChange={() => setTipoPagamento('cartao')} />
                  <div><span className="block font-black text-xs uppercase">Cartão</span><span className="text-[10px] font-bold text-slate-400 uppercase">Até 12x</span></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* RESUMO */}
        <div className="w-full lg:w-96 bg-white p-8 rounded-[40px] shadow-2xl h-fit border border-slate-50 sticky top-24">
          <h3 className="font-black text-xl text-slate-900 mb-6 uppercase tracking-tighter">Resumo</h3>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-slate-400 font-bold text-[11px] uppercase"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-slate-400 font-bold text-[11px] uppercase">
                <span>Frete</span>
                {recalculatingShipping ? <span className="animate-pulse">...</span> : <span>{selectedShipping ? formatCurrency(selectedShipping.price) : 'R$ 0,00'}</span>}
            </div>
            {tipoPagamento === 'pix' && (
              <div className="flex justify-between text-green-600 font-black text-xs uppercase bg-green-50 p-3 rounded-xl border border-green-100">
                <span>Desconto Pix (10%)</span>
                <span>-{formatCurrency((subtotal + (selectedShipping ? parseFloat(selectedShipping.price) : 0)) * 0.1)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between mb-8 text-3xl font-black text-blue-900 border-t border-slate-50 pt-6"><span>Total</span><span>{formatCurrency(totalFinal)}</span></div>
          <button onClick={handleCheckout} disabled={loading || !selectedShipping || !activeAddress} className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${!selectedShipping || !activeAddress ? 'bg-slate-200 text-slate-400' : 'bg-orange-500 text-white hover:scale-105 shadow-orange-500/30'}`}>
            {loading ? 'Aguarde...' : 'Pagar Agora'} <ArrowRight size={22}/>
          </button>
        </div>
      </div>
    </div>
  );
}