import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingCart, ArrowRight, ShieldCheck, Minus, Plus, MapPin, X, CreditCard } from 'lucide-react';
import { client } from '../lib/sanity';
import useCartStore from '../store/useCartStore'; 
import { formatCurrency } from '../lib/utils'; 

export default function Cart() {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const { 
    items, removeItem, updateQuantity, selectedShipping, 
    getTotalPrice, customer, setActiveAddress, addAddress, 
    setDocument, tipoPagamento, setTipoPagamento 
  } = useCartStore();
  
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalFinal = getTotalPrice();
  const activeAddress = customer.addresses?.find(a => a.id === customer.activeAddressId);

  const [newAddr, setNewAddr] = useState({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });

  const handleCheckout = async () => {
    if (items.length === 0 || !selectedShipping || !activeAddress) {
      return alert("Selecione o frete e um endereço!");
    }
    setLoading(true);
    
    try {
      // 1. Criar pedido no Sanity
      const order = {
        _type: 'order',
        orderNumber: `BV-${Math.floor(Math.random() * 10000)}`,
        status: 'pending',
        totalAmount: totalFinal,
        customerDocument: customer.document,
        shippingAddress: activeAddress,
        paymentMethod: tipoPagamento,
        items: items.map(item => ({ 
          _key: Math.random().toString(36).substr(7), 
          productName: item.title, 
          quantity: item.quantity, 
          price: item.price 
        }))
      };
      const createdOrder = await client.create(order);
      
      // 2. Chamar o Worker
      const response = await fetch('https://brasil-varejo-api.laeciossp.workers.dev/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items, 
          shipping: parseFloat(selectedShipping.price), 
          email: "cliente@brasilvarejo.com", 
          orderId: createdOrder._id,
          tipoPagamento // Enviamos o tipo para o Worker bloquear o resto
        })
      });
      
      const data = await response.json();

      // 3. ABRIR MODAL (POPUP) SEM REDIRECIONAR
      if (data.id_preferencia && window.MercadoPago) {
        const mp = new window.MercadoPago('APP_USR-fb2a68f8-969b-4624-9c81-3725b56f8b4f', {
          locale: 'pt-BR'
        });

        // O segredo está em usar o builder de checkout
        const checkout = mp.checkout({
          preference: {
            id: data.id_preferencia
          }
        });

        checkout.open(); // Abre na mesma tela como um modal profissional
      } else if (data.url) {
        window.location.href = data.url;
      }

    } catch (error) {
      alert("Erro ao processar pagamento.");
    } finally { setLoading(false); }
  };

  if (items.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
      <ShoppingCart size={64} className="text-gray-200 mb-4" />
      <h2 className="text-2xl font-black text-slate-800 mb-2">Carrinho Vazio</h2>
      <Link to="/" className="text-blue-600 font-bold hover:underline">Voltar à Loja</Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      <h1 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter">Meu Checkout</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          
          {/* LISTA DE PRODUTOS */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item._id} className="flex gap-4 p-5 bg-white rounded-3xl border border-slate-100 items-center shadow-sm">
                <img src={item.image} className="w-16 h-16 object-contain" alt={item.title} />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                  <p className="text-blue-600 font-black">{formatCurrency(item.price)}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center bg-slate-100 rounded-lg px-2">
                      <button onClick={() => updateQuantity(item._id, item.quantity - 1)} className="p-1"><Minus size={12}/></button>
                      <span className="px-2 font-bold text-xs">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._id, item.quantity + 1)} className="p-1"><Plus size={12}/></button>
                    </div>
                    <button onClick={() => removeItem(item._id)} className="text-red-400"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ENDEREÇO */}
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><MapPin size={20} className="text-blue-600"/> Endereço de Entrega</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {customer.addresses?.map((addr) => (
                <div key={addr.id} onClick={() => setActiveAddress(addr.id)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${addr.id === customer.activeAddressId ? 'border-blue-600 bg-blue-50' : 'border-slate-100'}`}>
                  <p className="text-xs font-black text-slate-800 uppercase">{addr.street}, {addr.number}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                </div>
              ))}
              <button onClick={() => setShowForm(true)} className="border-2 border-dashed rounded-2xl p-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50">Adicionar Endereço</button>
            </div>
            
            {/* FATURAMENTO */}
            <div className="mt-6 pt-6 border-t border-slate-100">
               <h3 className="text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">Documento para Nota Fiscal</h3>
               <input type="text" placeholder="CPF ou CNPJ" value={customer.document || ''} onChange={(e) => setDocument(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-mono text-sm border-none shadow-inner" />
            </div>
          </div>

          {/* SELETOR DE PAGAMENTO COM DESCONTO */}
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><CreditCard size={20} className="text-blue-600"/> Forma de Pagamento</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${tipoPagamento === 'pix' ? 'border-green-500 bg-green-50 shadow-md' : 'border-slate-100 hover:border-green-200'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="pay" checked={tipoPagamento === 'pix'} onChange={() => setTipoPagamento('pix')} className="accent-green-600" />
                  <div>
                    <span className="block font-black text-xs uppercase text-slate-800">Pix ou Boleto</span>
                    <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">10% DE DESCONTO</span>
                  </div>
                </div>
                <span className="text-xl">💠</span>
              </label>

              <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${tipoPagamento === 'cartao' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-100 hover:border-blue-200'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="pay" checked={tipoPagamento === 'cartao'} onChange={() => setTipoPagamento('cartao')} className="accent-blue-600" />
                  <div>
                    <span className="block font-black text-xs uppercase text-slate-800">Cartão de Crédito</span>
                    <span className="text-[10px] font-bold text-slate-400">Parcelamento em até 12x</span>
                  </div>
                </div>
                <span className="text-xl">💳</span>
              </label>
            </div>
          </div>
        </div>

        {/* RESUMO FIXO */}
        <div className="w-full lg:w-96 bg-white p-8 rounded-[40px] shadow-2xl h-fit border border-slate-50 sticky top-24">
          <h3 className="font-black text-xl text-slate-900 mb-6 uppercase">Resumo</h3>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-slate-400 font-bold text-xs uppercase"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-slate-400 font-bold text-xs uppercase"><span>Frete</span><span>{selectedShipping ? formatCurrency(selectedShipping.price) : 'R$ 0,00'}</span></div>
            
            {tipoPagamento === 'pix' && (
              <div className="flex justify-between text-green-600 font-black text-xs uppercase bg-green-50 p-2 rounded-lg">
                <span>Desconto Pix (10%)</span>
                <span>-{formatCurrency((subtotal + (selectedShipping ? parseFloat(selectedShipping.price) : 0)) * 0.1)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between mb-8 text-3xl font-black text-blue-900 border-t pt-6">
            <span>Total</span>
            <span>{formatCurrency(totalFinal)}</span>
          </div>
          
          <button onClick={handleCheckout} disabled={loading || !selectedShipping || !activeAddress} className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${!selectedShipping || !activeAddress ? 'bg-slate-200 text-slate-400' : 'bg-orange-500 text-white hover:scale-105 active:scale-95 shadow-orange-500/30'}`}>
            {loading ? 'Aguarde...' : 'Pagar Agora'} <ArrowRight size={22}/>
          </button>
          
          <p className="mt-6 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-green-500"/> Compra Segura SSL
          </p>
        </div>
      </div>
    </div>
  );
}