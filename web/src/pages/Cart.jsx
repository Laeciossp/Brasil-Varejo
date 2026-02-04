import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trash2, ShoppingCart, ArrowRight, ShieldCheck, MapPin, Lock, Truck, CreditCard, QrCode
} from 'lucide-react';
import { useUser } from "@clerk/clerk-react";
import { createClient } from "@sanity/client"; 
import useCartStore from '../store/useCartStore';
import { formatCurrency } from '../lib/utils';

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false, 
  apiVersion: '2023-05-03',
  token: 'skEcUJ41lyHwOuSuRVnjiBKUnsV0Gnn7SQ0i2ZNKC4LqB1KkYo2vciiOrsjqmyUcvn8vLMTxp019hJRmR11iPV76mXVH7kK8PDLvxxjHHD4yw7R8eHfpNPkKcHruaVytVs58OaG6hjxTcXHSBpz0Fr2DTPck19F7oCo4NCku1o5VLi2f4wqY', 
});

const MercadoPagoTrust = () => (
  <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center gap-2">
    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
      <Lock size={12} className="text-green-600" />
      <span>Ambiente 100% Seguro</span>
    </div>
    <img src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.14.3/mercadopago/logo__large.png" className="h-5 opacity-50 grayscale hover:grayscale-0 transition-all" alt="Mercado Pago" />
  </div>
);

export default function Cart() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);
  const [recalculatingShipping, setRecalculatingShipping] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]); 
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' });
  const [customerName, setCustomerName] = useState('');
  
  const { 
    items, removeItem, updateQuantity, selectedShipping, setShipping,
    customer, setActiveAddress, addAddress, setDocument, 
    tipoPagamento, setTipoPagamento, globalCep, clearCart
  } = useCartStore();
  
  // --- LÓGICA FINANCEIRA (PRESERVADA) ---
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
  const shippingCost = (selectedShipping && typeof selectedShipping.price === 'number') ? selectedShipping.price : 0;
  const isPix = tipoPagamento === 'pix';
  const discount = isPix ? subtotal * 0.10 : 0;
  const totalFinal = subtotal - discount + shippingCost;
  const activeAddress = customer.addresses?.find(a => a.id === customer.activeAddressId);

  useEffect(() => { if (user && !customerName) setCustomerName(user.fullName || ''); }, [user]);

  // --- RECALCULAR FRETE (CORREÇÃO FRETE GRÁTIS + MISTO) ---
  useEffect(() => {
    const recalculate = async () => {
      const targetZip = activeAddress?.zip || (globalCep !== 'Informe seu CEP' ? globalCep : null);
      if (!targetZip || items.length === 0) {
          if (!targetZip) setShipping(null);
          return;
      }

      setRecalculatingShipping(true);
      const cleanZip = targetZip.replace(/\D/g, '');
      const isLocal = cleanZip === '43850000';
      const isNearby = ['40', '41', '42', '43', '44', '48'].some(p => cleanZip.startsWith(p));
      const maxHandlingTime = items.reduce((max, item) => Math.max(max, parseInt(item.handlingTime) || 4), 4);
      const extraDays = isNearby ? 4 : maxHandlingTime; 
      const postingDays = 1;
      let finalOptions = [];

      // NOVO: Filtrar itens pagos
      const paidItems = items.filter(i => !i.freeShipping);
      const hasPaidItems = paidItems.length > 0;
      const allFree = items.length > 0 && !hasPaidItems;

      // Se tiver itens pagos, mandamos SÓ eles para a API calcular o custo.
      // Se TODOS forem grátis, mandamos todos apenas para calcular prazo, mas forçamos preço 0.
      const payloadItems = hasPaidItems ? paidItems : items;

      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'https://brasil-varejo-api.laeciossp.workers.dev';
        const response = await fetch(`${baseUrl}/shipping`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: { postal_code: "43805000" }, 
            to: { postal_code: targetZip },
            products: payloadItems.map(p => ({
              id: p._id,
              width: Number(p.width) || 15,
              height: Number(p.height) || 15,
              length: Number(p.length) || 15,
              weight: Number(p.weight) || 0.5,
              insurance_value: Number(p.price),
              quantity: Number(p.quantity)
            }))
          })
        });
        const rawOptions = await response.json();

        if (Array.isArray(rawOptions) && rawOptions.length > 0) {
          const candidates = rawOptions.map(opt => {
              let val = opt.custom_price || opt.price || opt.valor || 0;
              if (typeof val === 'string') val = parseFloat(val.replace(',', '.'));
              
              let finalPrice = Number(val);
              
              // SE TODOS FOREM GRÁTIS, O PREÇO É 0
              if (allFree) {
                 finalPrice = 0;
              }

              const nameLower = (opt.name || '').toLowerCase();
              
              // Correção apenas para Vizinhos (APENAS SE NÃO FOR 100% FREE)
              if (!allFree && finalPrice === 0 && isNearby) {
                  if (nameLower.includes('pac') || nameLower.includes('econômico')) finalPrice = 16.90;
                  if (nameLower.includes('sedex') || nameLower.includes('expresso')) finalPrice = 19.90;
              }
              return { ...opt, price: finalPrice, days: parseInt(opt.delivery_time || opt.prazo) || 1, cleanName: nameLower };
          })
          .filter(c => c.price > 0 || allFree) // Permite preço 0 apenas se for tudo grátis
          .sort((a, b) => a.price - b.price);

          if (isLocal) {
             const localPrice = allFree ? 0 : (candidates[0]?.price > 0 ? candidates[0].price : 15.00);
             finalOptions.push({ name: "Palastore Expresso ⚡", price: localPrice, delivery_time: 5, company: "Própria" });
          } else {
             const pac = candidates.find(o => o.cleanName.includes('pac') || o.cleanName.includes('econômico'));
             const sedex = candidates.find(o => o.cleanName.includes('sedex') || o.cleanName.includes('expresso'));
             const pacBuffer = isNearby ? 0 : 3;
             
             if (pac) {
                let basePac = isNearby ? Math.max(7, pac.days) : pac.days;
                finalOptions.push({ name: "PAC (Econômico)", price: pac.price, delivery_time: basePac + extraDays + postingDays + pacBuffer, company: "Correios" });
             }

             if (sedex) {
                let baseSedex = isNearby ? Math.max(2, sedex.days) : sedex.days;
                let sedexBuffer = isNearby ? 0 : 1;
                let finalSedexDays = baseSedex + extraDays + postingDays + sedexBuffer;
                if (pac) {
                    let pacRef = (isNearby ? Math.max(7, pac.days) : pac.days) + extraDays + postingDays + pacBuffer;
                    if (finalSedexDays >= pacRef) finalSedexDays = Math.max(2, pacRef - 2);
                }
                finalOptions.push({ name: "SEDEX (Expresso)", price: sedex.price, delivery_time: finalSedexDays, company: "Correios" });
             }
             
             // Fallback Nacional
             if (finalOptions.length === 0 && candidates.length > 0) {
                 finalOptions.push({
                    name: candidates[0].name || "Entrega Padrão",
                    price: candidates[0].price,
                    delivery_time: candidates[0].days + extraDays + postingDays + pacBuffer,
                    company: candidates[0].company || "Transportadora"
                 });
             }
          }
        }
      } catch (error) { console.error("Erro frete API:", error); } 
      
      // RESGATE SÓ PARA LOCAL E VIZINHO
      if (finalOptions.length === 0) {
           if (isLocal) {
               finalOptions.push({ name: "Palastore Expresso ⚡", price: allFree ? 0 : 15.00, delivery_time: 5, company: "Própria" });
           } else if (isNearby) {
               finalOptions.push({ name: "PAC (Econômico)", price: allFree ? 0 : 16.90, delivery_time: 12, company: "Correios" });
               finalOptions.push({ name: "SEDEX (Expresso)", price: allFree ? 0 : 19.90, delivery_time: 7, company: "Correios" });
           }
      }

      setShippingOptions(finalOptions);
      setRecalculatingShipping(false);
      if (finalOptions.length > 0) {
          const currentName = selectedShipping?.name;
          const sameOption = finalOptions.find(o => o.name === currentName);
          setShipping(sameOption || finalOptions[0]);
      } else { setShipping(null); }
    };
    recalculate();
  }, [customer.activeAddressId, items.length, globalCep]);

  const handleSaveAddress = () => {
    if (!newAddr.zip || !newAddr.street || !newAddr.number) return alert("Preencha os dados obrigatórios.");
    addAddress({ ...newAddr, id: Math.random().toString(36).substr(2, 9) });
    setShowAddressForm(false);
    setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' });
  };

  const handleCheckout = async () => {
    if (!isLoaded || !user) return alert("Faça login para continuar.");
    if (items.length === 0 || !selectedShipping || !activeAddress) return alert("Selecione frete e endereço.");
    if (!customer.document) return alert("Informe o CPF.");
    setLoading(true);
    try {
      const orderNumber = `#PALA-${Math.floor(Date.now() / 1000)}`;
      // 1. SALVAR NO SANITY (Já estava correto, mantido)
      const orderDoc = {
        _type: 'order', orderNumber, status: 'pending',
        customer: { name: customerName, email: user.primaryEmailAddress?.emailAddress, cpf: customer.document, phone: "" },
        items: items.map(item => ({
            _key: Math.random().toString(36).substring(7),
            productName: item.title || item.name, variantName: item.variantName || "Padrão", quantity: item.quantity, price: item.price, imageUrl: item.image, product: { _type: 'reference', _ref: item._id }
        })),
        shippingAddress: activeAddress, billingAddress: activeAddress, carrier: selectedShipping.name, shippingCost: parseFloat(selectedShipping.price), totalAmount: totalFinal, paymentMethod: tipoPagamento, internalNotes: `Venda Site (Prazo: ${selectedShipping.delivery_time} dias)`
      };
      const createdOrder = await client.create(orderDoc);
      const sanityId = createdOrder._id;
      
      // 2. ENVIAR PARA WORKER/MERCADO PAGO (AQUI ESTAVA O PROBLEMA)
      const baseUrl = import.meta.env.VITE_API_URL || 'https://brasil-varejo-api.laeciossp.workers.dev';
      const response = await fetch(`${baseUrl}/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items: items.map(i => ({ 
                title: i.title || i.name, 
                quantity: i.quantity, 
                price: i.price,
                picture_url: i.image // <--- CORREÇÃO: ADICIONADO AQUI PARA APARECER NO MP E EMAIL
            })), 
            shipping: parseFloat(selectedShipping.price), 
            email: user.primaryEmailAddress.emailAddress, 
            tipoPagamento, 
            shippingAddress: activeAddress, 
            customerDocument: customer.document, 
            totalAmount: totalFinal, 
            orderId: sanityId 
        })
      });
      const data = await response.json();
      if (data.error || !data.url) throw new Error(JSON.stringify(data.details || data.error));
      clearCart();
      if (data.id_preferencia && window.MercadoPago) {
        const mp = new window.MercadoPago('APP_USR-fb2a68f8-969b-4624-9c81-3725b56f8b4f', { locale: 'pt-BR' });
        mp.checkout({ preference: { id: data.id_preferencia } }).open(); 
      } else { window.location.href = data.url; }
    } catch (error) { alert("Erro ao processar: " + error.message); } finally { setLoading(false); }
  };

  if (items.length === 0) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white">
      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
        <ShoppingCart size={40} className="text-gray-300" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Carrinho Vazio</h2>
      <Link to="/" className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold">Comprar</Link>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-10 font-sans">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">Carrinho ({items.length})</h1>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1 space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                {items.map((item) => (
                    <div key={item.sku || item._id} className="flex gap-4">
                      <div className="w-20 h-20 bg-white border rounded-lg p-2 relative">
                          <Link to={`/produto/${item.slug?.current || item.slug}`}><img src={item.image} className="w-full h-full object-contain mix-blend-multiply" alt={item.title} /></Link>
                          {item.freeShipping && (
                               <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-[8px] font-bold text-center py-0.5">
                                   FRETE GRÁTIS
                               </div>
                           )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between">
                            <div><Link to={`/produto/${item.slug?.current || item.slug}`} className="font-medium text-gray-900 hover:text-orange-600 transition-colors">{item.title}</Link>{item.variantName && <p className="text-xs text-gray-500 mt-1">{item.variantName}</p>}</div>
                            <button onClick={() => removeItem(item._id, item.sku)} className="text-red-500"><Trash2 size={18}/></button>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="flex items-center border rounded-lg">
                              <button onClick={() => updateQuantity(item._id, item.quantity - 1, item.sku)} disabled={item.quantity <= 1} className="px-3 py-1">-</button>
                              <span className="px-2 text-sm font-bold">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item._id, item.quantity + 1, item.sku)} className="px-3 py-1">+</button>
                            </div>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-lg font-bold flex gap-2"><MapPin className="text-orange-500"/> Entrega</h2><button onClick={() => setShowAddressForm(!showAddressForm)} className="text-blue-600 font-bold text-sm">+ Endereço</button></div>
                {showAddressForm && (
                   <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-3">
                      <input placeholder="Apelido" className="p-2 border rounded col-span-2" value={newAddr.alias} onChange={e => setNewAddr({...newAddr, alias: e.target.value})} />
                      <input placeholder="CEP" className="p-2 border rounded" value={newAddr.zip} onChange={e => setNewAddr({...newAddr, zip: e.target.value})} />
                      <input placeholder="Rua" className="p-2 border rounded" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})} />
                      <input placeholder="Número" className="p-2 border rounded" value={newAddr.number} onChange={e => setNewAddr({...newAddr, number: e.target.value})} />
                      <input placeholder="Bairro" className="p-2 border rounded" value={newAddr.neighborhood} onChange={e => setNewAddr({...newAddr, neighborhood: e.target.value})} />
                      <input placeholder="Complemento" className="p-2 border rounded" value={newAddr.complement} onChange={e => setNewAddr({...newAddr, complement: e.target.value})} />
                      <input placeholder="Cidade" className="p-2 border rounded" value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})} />
                      <input placeholder="UF" className="p-2 border rounded" value={newAddr.state} onChange={e => setNewAddr({...newAddr, state: e.target.value})} />
                      <button onClick={handleSaveAddress} className="col-span-2 bg-black text-white py-2 rounded font-bold">Salvar</button>
                   </div>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                    {customer.addresses?.map(addr => (
                        <div key={addr.id} onClick={() => setActiveAddress(addr.id)} className={`p-4 border-2 rounded-lg cursor-pointer ${addr.id === customer.activeAddressId ? 'border-blue-600 bg-blue-50' : 'border-gray-100'}`}>
                            <div className="flex justify-between mb-1"><span className="font-bold text-sm">{addr.alias || 'Local'}</span>{addr.id === customer.activeAddressId && <div className="w-3 h-3 bg-blue-600 rounded-full"></div>}</div>
                            <p className="text-xs text-gray-600">{addr.street}, {addr.number} {addr.complement}</p>
                            <p className="text-xs text-gray-500">{addr.city}/{addr.state}</p>
                            <p className="text-xs text-gray-400 font-mono">{addr.zip}</p>
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t space-y-3"><h2 className="text-lg font-bold flex gap-2"><ShieldCheck className="text-gray-400"/> Dados</h2><input placeholder="Nome Completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/><input placeholder="CPF / CNPJ" value={customer.document || ''} onChange={e => setDocument(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/></div>
            </div>
          </div>
          <div className="lg:w-[380px] h-fit sticky top-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold mb-6">Resumo</h3>
                <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    {isPix && discount > 0 && (<div className="flex justify-between text-green-600 font-bold bg-green-50 p-1 rounded"><span>Desconto PIX (10%)</span><span>-{formatCurrency(discount)}</span></div>)}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center"><span className="flex gap-1"><Truck size={14}/> Frete</span>{recalculatingShipping ? <span className="text-orange-500 text-xs">...</span> : <span className="font-bold">{selectedShipping ? (selectedShipping.price === 0 ? 'Grátis' : formatCurrency(selectedShipping.price)) : '--'}</span>}</div>
                        {!recalculatingShipping && shippingOptions.map(opt => (
                            <div key={opt.name} onClick={() => setShipping(opt)} className={`p-3 border rounded-lg cursor-pointer text-xs flex justify-between items-center ${selectedShipping?.name === opt.name ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'hover:bg-gray-50'}`}>
                                <div className="flex flex-col"><span className="font-bold text-gray-900">{opt.name}</span><span className="text-gray-500">Em até {opt.delivery_time} dias úteis</span></div><span className="font-bold text-sm">{opt.price === 0 ? 'Grátis' : formatCurrency(opt.price)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6 border-t pt-4">
                    <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${isPix ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500' : 'border-gray-200 hover:border-gray-300 text-gray-400 opacity-60 grayscale'}`}>
                        <div className="absolute top-2 right-2"><input type="radio" name="payment_mode" checked={isPix} onChange={() => setTipoPagamento('pix')} className="w-4 h-4 text-green-600 focus:ring-green-500"/></div>
                        <QrCode size={28} className="mb-2"/><span className="font-bold text-sm">PIX</span><span className="text-[10px] font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded-full mt-1">-10% OFF</span>
                    </label>
                    <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${!isPix ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 text-gray-400 opacity-60 grayscale'}`}>
                        <div className="absolute top-2 right-2"><input type="radio" name="payment_mode" checked={!isPix} onChange={() => setTipoPagamento('cartao')} className="w-4 h-4 text-blue-600 focus:ring-blue-500"/></div>
                        <CreditCard size={28} className="mb-2"/><span className="font-bold text-sm">Cartão</span><span className="text-[10px] text-gray-400 mt-1">Até 12x</span>
                    </label>
                </div>
                <div className="flex justify-between items-end mb-6 pt-4 border-t"><span className="font-medium">Total Final</span><span className="text-3xl font-black text-gray-900">{formatCurrency(totalFinal)}</span></div>
                <button onClick={handleCheckout} disabled={loading || !selectedShipping || !activeAddress || !customer.document || !customerName} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-200 transform active:scale-95">{loading ? 'Processando...' : 'Finalizar Compra'} <ArrowRight size={18}/></button>
                <MercadoPagoTrust />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}