import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trash2, ShoppingCart, ArrowRight, ShieldCheck, MapPin, Lock, Truck, CreditCard, QrCode, Ticket, Users, PlaneTakeoff, PlaneLanding, Luggage, Clock, UserCheck
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
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);
  const [recalculatingShipping, setRecalculatingShipping] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]); 
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' });
  const [customerName, setCustomerName] = useState('');
  
  const [passengers, setPassengers] = useState([]);

  const { 
    items, removeItem, updateQuantity, selectedShipping, setShipping,
    customer, setActiveAddress, addAddress, setDocument, 
    tipoPagamento, setTipoPagamento, globalCep, clearCart
  } = useCartStore();
  
  const isDigitalCart = items.length > 0 && items.every(item => item.isTravel === true);
  const totalTickets = items.filter(i => i.isTravel).reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
  const shippingCost = (selectedShipping && typeof selectedShipping.price === 'number') ? selectedShipping.price : 0;
  const isPix = tipoPagamento === 'pix';
  const discount = isPix ? subtotal * 0.05 : 0;
  const totalFinal = subtotal - discount + shippingCost;
  const activeAddress = customer.addresses?.find(a => a.id === customer.activeAddressId);

  const flightItem = items.find(i => i.isTravel && i.flightDetails);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!flightItem || !flightItem.addedAt) return;
    
    const interval = setInterval(() => {
        const now = Date.now();
        const expiresAt = flightItem.addedAt + 10 * 60 * 1000;
        const diff = expiresAt - now;

        if (diff <= 0) {
            clearInterval(interval);
            alert("Tempo esgotado! Os preços e a disponibilidade das passagens podem ter mudado. Por favor, busque novamente.");
            clearCart();
            navigate('/viagens');
        } else {
            setTimeLeft(diff);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [flightItem, clearCart, navigate]);

  const formatCountdown = (ms) => {
      if (!ms) return "10:00";
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => { if (user && !customerName) setCustomerName(user.fullName || ''); }, [user]);

  useEffect(() => {
    if (isDigitalCart) {
      setPassengers(prev => {
        if (prev.length === totalTickets) return prev;
        const newArr = [...prev];
        if (newArr.length < totalTickets) {
          for (let i = newArr.length; i < totalTickets; i++) {
            newArr.push({ 
                name: '', dob: '', relationship: '', gender: '', 
                cpf: '', rg: '', rgIssuer: '', nationality: 'Brasileira', 
                passport: '', passportExpiry: '', email: '', phone: '',
                seatPreference: ''
            });
          }
        } else {
          newArr.splice(totalTickets);
        }
        return newArr;
      });
    }
  }, [totalTickets, isDigitalCart]);

  const handlePaxChange = (index, field, value) => {
     setPassengers(prev => {
        const newArr = [...prev];
        newArr[index][field] = value;
        return newArr;
     });
  };

  // FUNÇÃO MÁGICA PARA IMPORTAR OS DADOS DO CLIENTE
  const handleImportMyData = (index) => {
    const nome = user?.fullName || customerName || '';
    const email = user?.primaryEmailAddress?.emailAddress || '';
    const cpf = customer?.document || '';
    
    handlePaxChange(index, 'name', nome);
    handlePaxChange(index, 'email', email);
    handlePaxChange(index, 'cpf', cpf);
    handlePaxChange(index, 'relationship', 'Titular');
  };

  useEffect(() => {
    const recalculate = async () => {
      if (isDigitalCart) {
         const digitalShipping = { name: "Emissão Digital (E-Ticket / Voucher)", price: 0, delivery_time: 1, company: "Operadora" };
         setShippingOptions([digitalShipping]);
         setShipping(digitalShipping);
         return; 
      }
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
      const physicalItems = items.filter(i => !i.isTravel);
      const paidItems = physicalItems.filter(i => !i.freeShipping);
      const hasPaidItems = paidItems.length > 0;
      const allFree = physicalItems.length > 0 && !hasPaidItems;
      const payloadItems = hasPaidItems ? paidItems : physicalItems;

      if(payloadItems.length === 0) {
          setRecalculatingShipping(false);
          return;
      }

      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'https://brasil-varejo-api.laeciossp.workers.dev';
        const response = await fetch(`${baseUrl}/shipping`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: { postal_code: "43805000" }, 
            to: { postal_code: targetZip },
            products: payloadItems.map(p => ({
              id: p._id, width: Number(p.width) || 15, height: Number(p.height) || 15, length: Number(p.length) || 15,
              weight: Number(p.weight) || 0.5, insurance_value: Number(p.price), quantity: Number(p.quantity)
            }))
          })
        });
        const rawOptions = await response.json();

        if (Array.isArray(rawOptions) && rawOptions.length > 0) {
          const candidates = rawOptions.map(opt => {
              let val = opt.custom_price || opt.price || opt.valor || 0;
              if (typeof val === 'string') val = parseFloat(val.replace(',', '.'));
              let finalPrice = Number(val);
              if (allFree) finalPrice = 0;
              const nameLower = (opt.name || '').toLowerCase();
              if (!allFree && finalPrice === 0 && isNearby) {
                  if (nameLower.includes('pac') || nameLower.includes('econômico')) finalPrice = 16.90;
                  if (nameLower.includes('sedex') || nameLower.includes('expresso')) finalPrice = 19.90;
              }
              return { ...opt, price: finalPrice, days: parseInt(opt.delivery_time || opt.prazo) || 1, cleanName: nameLower };
          }).filter(c => c.price > 0 || allFree).sort((a, b) => a.price - b.price);

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
             
             if (finalOptions.length === 0 && candidates.length > 0) {
                 finalOptions.push({
                    name: candidates[0].name || "Entrega Padrão", price: candidates[0].price,
                    delivery_time: candidates[0].days + extraDays + postingDays + pacBuffer, company: candidates[0].company || "Transportadora"
                 });
             }
          }
        }
      } catch (error) { console.error("Erro frete API:", error); } 
      
      const temItemSN = physicalItems && physicalItems.some(item => item.brand === 'SN');

      if (temItemSN) {
          let precoBase = 15.00;
          if (finalOptions.length > 0) {
              const maisBarato = finalOptions.reduce((min, p) => parseFloat(p.price) < parseFloat(min.price) ? p : min, finalOptions[0]);
              precoBase = parseFloat(maisBarato.price);
          }
          finalOptions = [{ name: 'Envio Econômico Padrão', price: allFree ? 0 : (precoBase > 0 ? precoBase : 15.00), delivery_time: 12, company: 'Transportadora' }];
      } else {
          if (finalOptions.length === 0) {
               if (isLocal) finalOptions.push({ name: "Palastore Expresso ⚡", price: allFree ? 0 : 15.00, delivery_time: 5, company: "Própria" });
               else if (isNearby) {
                   finalOptions.push({ name: "PAC (Econômico)", price: allFree ? 0 : 16.90, delivery_time: 12, company: "Correios" });
                   finalOptions.push({ name: "SEDEX (Expresso)", price: allFree ? 0 : 19.90, delivery_time: 7, company: "Correios" });
               }
          }
      }

      setShippingOptions(finalOptions);
      setRecalculatingShipping(false);
      
      if (finalOptions.length > 0) {
          const currentName = selectedShipping?.name;
          const sameOption = finalOptions.find(o => o.name === currentName);
          if (typeof setShipping === 'function') setShipping(sameOption || finalOptions[0]);
      } else { 
          if (typeof setShipping === 'function') setShipping(null);
      }
    };
    recalculate();
  }, [customer.activeAddressId, items.length, globalCep, isDigitalCart]);

  const handleSaveAddress = () => {
    if (!newAddr.zip || !newAddr.street || !newAddr.number) return alert("Preencha os dados obrigatórios.");
    addAddress({ ...newAddr, id: Math.random().toString(36).substr(2, 9) });
    setShowAddressForm(false);
    setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' });
  };

  const handleCheckout = async () => {
    if (!isLoaded || !user) return alert("Faça login para continuar.");
    if (items.length === 0 || !selectedShipping || !activeAddress) return alert("Selecione a forma de entrega e preencha seu endereço de faturamento.");
    
    if (isDigitalCart) {
        const invalidPax = passengers.some(p => !p.name || !p.cpf || !p.dob || !p.relationship || !p.gender || !p.rg);
        if (invalidPax) return alert("Por favor, preencha todos os campos obrigatórios dos passageiros (Nome, Data Nasc., Parentesco, Gênero, CPF e RG).");
    } else {
        if (!customer.document || !customerName) return alert("Informe seus dados pessoais completos.");
    }

    setLoading(true);
    try {
      const orderNumber = `#PALA-${Math.floor(Date.now() / 1000)}`;
      
      const finalCustomerName = isDigitalCart && passengers[0] ? passengers[0].name : customerName;
      const finalCustomerDoc = isDigitalCart && passengers[0] ? passengers[0].cpf : customer.document;

      let internalNotes = `Venda Site. Is Digital: ${isDigitalCart}`;
      if (isDigitalCart) {
          internalNotes += `\nPassageiros:\n${passengers.map((p, i) => `Pax ${i+1}: ${p.name} - CPF: ${p.cpf} - RG: ${p.rg} - Nasc: ${p.dob} - Assento: ${p.seatPreference || 'Sem Preferência'}`).join('\n')}`;
      }
      
      const orderDoc = {
        _type: 'order', orderNumber, status: 'pending',
        customer: { name: finalCustomerName, email: user.primaryEmailAddress?.emailAddress, cpf: finalCustomerDoc, phone: "" },
        items: items.map(item => ({
            _key: Math.random().toString(36).substring(7),
            productName: item.title || item.name, variantName: item.variantName || "Padrão", quantity: item.quantity, price: item.price, imageUrl: item.image,
            product: { _type: 'reference', _ref: item._id } 
        })),
        shippingAddress: activeAddress, billingAddress: activeAddress, carrier: selectedShipping.name, shippingCost: parseFloat(selectedShipping.price), totalAmount: totalFinal, paymentMethod: tipoPagamento, internalNotes
      };
      
      const createdOrder = await client.create(orderDoc);
      const sanityId = createdOrder._id;
      
      const baseUrl = import.meta.env.VITE_API_URL || 'https://brasil-varejo-api.laeciossp.workers.dev';
      const response = await fetch(`${baseUrl}/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items: items.map(i => ({ id: i._id, title: i.title || i.name, quantity: i.quantity, price: i.price, picture_url: i.image })), 
            shipping: parseFloat(selectedShipping.price), email: user.primaryEmailAddress.emailAddress, tipoPagamento, shippingAddress: activeAddress, 
            customerDocument: finalCustomerDoc, totalAmount: totalFinal, orderId: sanityId, customerName: finalCustomerName
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

  const canCheckout = isDigitalCart 
     ? (selectedShipping && activeAddress && passengers.length > 0 && passengers.every(p => p.name && p.cpf))
     : (selectedShipping && activeAddress && customer.document && customerName);

  if (items.length === 0) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white">
      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
        <ShoppingCart size={40} className="text-gray-300" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Carrinho Vazio</h2>
      <button onClick={() => navigate(-1)} className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold">Voltar às compras</button>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-10 font-sans">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">Carrinho ({items.length})</h1>
        
        {/* CRONÔMETRO DE URGÊNCIA */}
        {flightItem && (
            <div className="bg-red-50 border border-red-200 p-3 md:p-4 rounded-xl mb-6 flex flex-col md:flex-row items-center justify-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2">
                   <Clock className="text-red-500 animate-pulse" size={24} />
                   <span className="text-red-800 font-bold text-sm md:text-base">Conclua sua compra em</span>
                </div>
                <span className="bg-red-600 text-white font-black px-3 py-1 rounded-lg text-xl tracking-widest shadow-inner">{formatCountdown(timeLeft)}</span>
                <span className="text-red-800 font-medium text-sm md:text-base">para garantir esta tarifa e disponibilidade.</span>
            </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1 space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden space-y-0">
                {items.map((item) => (
                    item.isTravel && item.flightDetails ? (
                        <div key={item.sku || item._id} className="bg-white border border-purple-100 p-0 flex flex-col relative shadow-sm">
                            <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                         <img src={item.image} className="w-8 h-8 object-contain" alt="Cia" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-purple-200">
                                          Passagem Aérea • {item.variantName}
                                        </div>
                                        <h3 className="font-bold text-lg">{item.title}</h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { clearCart(); navigate('/viagens'); }} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-colors border border-white/30 shadow-sm whitespace-nowrap">
                                        Alterar Voo
                                    </button>
                                    <button onClick={() => removeItem(item._id, item.sku)} className="bg-purple-700 hover:bg-red-500 text-white p-1.5 md:p-2 rounded-lg transition-colors shadow-sm">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 flex flex-col md:flex-row gap-8">
                                <div className="flex-1 space-y-6">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center justify-start pt-1">
                                            <PlaneTakeoff size={24} className="text-purple-500"/>
                                            {item.flightDetails.volta && <div className="w-px h-full bg-purple-100 my-2"></div>}
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 mb-1 inline-block">Voo de Ida</span>
                                            <p className="font-bold text-gray-900 text-sm">{item.flightDetails.ida.origem} ➔ {item.flightDetails.ida.destino}</p>
                                            <p className="text-xs text-gray-500">{item.flightDetails.ida.partida} • Duração: {item.flightDetails.ida.duracao}</p>
                                        </div>
                                    </div>

                                    {item.flightDetails.volta && (
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-center justify-start pt-1">
                                                <PlaneLanding size={24} className="text-orange-500"/>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 mb-1 inline-block">Voo de Volta</span>
                                                <p className="font-bold text-gray-900 text-sm">{item.flightDetails.volta.origem} ➔ {item.flightDetails.volta.destino}</p>
                                                <p className="text-xs text-gray-500">{item.flightDetails.volta.partida} • Duração: {item.flightDetails.volta.duracao}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full md:w-64 bg-purple-50 rounded-xl p-5 border border-purple-100 flex flex-col justify-between shadow-inner">
                                    <div>
                                        <h4 className="font-bold text-sm text-purple-900 mb-3 border-b border-purple-200 pb-2">Extrato do Carrinho</h4>
                                        <div className="space-y-2 text-xs text-purple-800">
                                            <div className="flex justify-between"><span>Passageiros:</span> <span className="font-bold">{item.quantity}</span></div>
                                            <div className="flex justify-between"><span>Tarifa Escolhida:</span> <span className="font-bold">{item.flightDetails.tier}</span></div>
                                            <div className="flex justify-between items-center pt-1 border-t border-purple-200 mt-2">
                                                <span className="flex items-center gap-1"><Luggage size={12}/> Malas Inclusas:</span>
                                                <span className="font-bold text-purple-900 bg-purple-200 px-2 rounded-full">{item.flightDetails.holdBagsIda + item.flightDetails.holdBagsVolta}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-purple-200 flex justify-between items-end">
                                        <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Subtotal</span>
                                        <span className="text-xl font-black text-purple-900">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div key={item.sku || item._id} className="flex gap-4 p-6 border-b border-gray-100 last:border-0">
                          <div className="w-20 h-20 bg-white border rounded-lg p-2 relative">
                              <img src={item.image} className="w-full h-full object-contain mix-blend-multiply" alt={item.title} />
                              {item.freeShipping && !item.isTravel && (
                                   <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-[8px] font-bold text-center py-0.5">FRETE GRÁTIS</div>
                               )}
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div className="flex justify-between">
                                <div><span className="font-medium text-gray-900 line-clamp-2">{item.title}</span>{item.variantName && <p className="text-xs text-gray-500 mt-1">{item.variantName}</p>}</div>
                                <button onClick={() => removeItem(item._id, item.sku)} className="text-red-500"><Trash2 size={18}/></button>
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="flex items-center border rounded-lg">
                                  <button onClick={() => updateQuantity(item._id, item.quantity - 1, item.sku)} disabled={item.quantity <= 1} className="px-3 py-1 disabled:opacity-50">-</button>
                                  <span className="px-2 text-sm font-bold">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item._id, item.quantity + 1, item.sku)} className="px-3 py-1 hover:bg-gray-100 transition-colors">+</button>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                          </div>
                        </div>
                    )
                ))}
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                <div className="flex justify-between items-center">
                   <h2 className="text-lg font-bold flex gap-2">
                      <MapPin className="text-orange-500"/> {isDigitalCart ? "Endereço de Faturamento" : "Endereço de Entrega"}
                   </h2>
                   <button onClick={() => setShowAddressForm(!showAddressForm)} className="text-blue-600 font-bold text-sm">+ Adicionar</button>
                </div>
                
                {isDigitalCart && (
                   <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-lg text-sm mb-4">
                      Como este é um produto de viagem digital, não haverá entrega física. O endereço abaixo será usado apenas para a emissão da Nota Fiscal.
                   </div>
                )}

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

                {isDigitalCart ? (
                    <div className="pt-6 border-t border-gray-100 space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                           <Users className="text-orange-500"/> Dados dos Passageiros
                        </h2>
                        
                        <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg text-sm text-orange-800 font-medium">
                           A emissão do e-ticket depende da exatidão destes dados. Preencha conforme o seu documento oficial (RG ou Passaporte).
                        </div>

                        <div className="space-y-4">
                           {passengers.map((pax, index) => (
                              <div key={index} className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4 shadow-sm">
                                 
                                 {/* HEADER DO PASSAGEIRO COM O BOTÃO MÁGICO */}
                                 <h3 className="font-bold text-sm text-gray-800 flex items-center justify-between border-b border-gray-200 pb-2">
                                    <span className="flex items-center gap-2">
                                        <span className="bg-gray-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">{index + 1}</span> Passageiro
                                    </span>
                                    {index === 0 && (
                                        <button onClick={() => handleImportMyData(index)} className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors">
                                            <UserCheck size={14}/> Puxar meus dados
                                        </button>
                                    )}
                                 </h3>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input placeholder="Nome Completo" value={pax.name} onChange={e => handlePaxChange(index, 'name', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"/>
                                    <div className="relative">
                                      <label className="text-[10px] absolute -top-2 left-2 bg-white px-1 text-gray-500 font-bold">Data de Nasc.</label>
                                      <input type="date" value={pax.dob} onChange={e => handlePaxChange(index, 'dob', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-600 outline-none focus:border-blue-500 bg-white"/>
                                    </div>
                                    <select value={pax.relationship} onChange={e => handlePaxChange(index, 'relationship', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-600 outline-none focus:border-blue-500 bg-white">
                                       <option value="">Parentesco...</option>
                                       <option value="Titular">Titular</option>
                                       <option value="Cônjuge">Cônjuge</option>
                                       <option value="Filho(a)">Filho(a)</option>
                                       <option value="Parente">Outro Parente</option>
                                       <option value="Amigo(a)">Amigo(a)</option>
                                    </select>
                                    <select value={pax.gender} onChange={e => handlePaxChange(index, 'gender', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-600 outline-none focus:border-blue-500 bg-white">
                                       <option value="">Gênero...</option>
                                       <option value="Masculino">Masculino</option>
                                       <option value="Feminino">Feminino</option>
                                       <option value="Outro">Outro</option>
                                    </select>
                                    
                                    <div className="md:col-span-2 bg-purple-50 p-3 rounded-lg border border-purple-100 flex flex-col md:flex-row items-center gap-3">
                                       <span className="text-xs font-bold text-purple-800 w-full md:w-auto">Preferência de Assento:</span>
                                       <select value={pax.seatPreference} onChange={e => handlePaxChange(index, 'seatPreference', e.target.value)} className="w-full flex-1 p-2 border border-purple-200 rounded-md text-sm text-purple-900 outline-none focus:border-purple-500 bg-white">
                                          <option value="">Escolha seu assento...</option>
                                          <option value="Janela">Janela</option>
                                          <option value="Corredor">Corredor</option>
                                          <option value="Qualquer">Qualquer (Sem preferência)</option>
                                       </select>
                                    </div>

                                    <input placeholder="CPF" value={pax.cpf} onChange={e => handlePaxChange(index, 'cpf', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"/>
                                    <div className="flex gap-2">
                                       <input placeholder="RG" value={pax.rg} onChange={e => handlePaxChange(index, 'rg', e.target.value)} className="w-2/3 p-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"/>
                                       <input placeholder="Órgão Exp." value={pax.rgIssuer} onChange={e => handlePaxChange(index, 'rgIssuer', e.target.value)} className="w-1/3 p-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"/>
                                    </div>
                                    <input placeholder="Nacionalidade" value={pax.nationality} onChange={e => handlePaxChange(index, 'nationality', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"/>
                                    <div className="flex gap-2">
                                       <input placeholder="Passaporte (Opc. voo nac.)" value={pax.passport} onChange={e => handlePaxChange(index, 'passport', e.target.value)} className="w-1/2 p-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"/>
                                       <div className="relative w-1/2">
                                          <label className="text-[10px] absolute -top-2 left-2 bg-white px-1 text-gray-500 font-bold">Validade</label>
                                          <input type="date" value={pax.passportExpiry} onChange={e => handlePaxChange(index, 'passportExpiry', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-600 outline-none focus:border-blue-500 bg-white"/>
                                       </div>
                                    </div>
                                    <input placeholder="E-mail" value={pax.email} onChange={e => handlePaxChange(index, 'email', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"/>
                                    <input placeholder="Telefone" value={pax.phone} onChange={e => handlePaxChange(index, 'phone', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 bg-white"/>
                                 </div>
                              </div>
                           ))}
                        </div>
                    </div>
                ) : (
                    <div className="pt-6 border-t border-gray-100 space-y-3">
                        <h2 className="text-lg font-bold flex gap-2"><ShieldCheck className="text-gray-400"/> Dados Comprador</h2>
                        <input placeholder="Nome Completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                        <input placeholder="CPF / CNPJ" value={customer.document || ''} onChange={e => setDocument(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>
                )}
            </div>
          </div>

          <div className="lg:w-[380px] h-fit sticky top-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold mb-6">Resumo Final</h3>
                <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between"><span>Subtotal da Compra</span><span className="font-bold text-gray-800">{formatCurrency(subtotal)}</span></div>
                    {isPix && discount > 0 && (<div className="flex justify-between text-green-600 font-bold bg-green-50 p-1 rounded"><span>Desconto PIX (5%)</span><span>-{formatCurrency(discount)}</span></div>)}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                           <span className="flex gap-1 text-gray-600 font-medium">
                              {isDigitalCart ? <Ticket size={14}/> : <Truck size={14}/>} 
                              {isDigitalCart ? "Taxa de Emissão" : "Frete"}
                           </span>
                           {recalculatingShipping ? <span className="text-orange-500 text-xs">...</span> : <span className="font-bold">{selectedShipping ? (selectedShipping.price === 0 ? 'Grátis' : formatCurrency(selectedShipping.price)) : '--'}</span>}
                        </div>
                        
                        {!recalculatingShipping && shippingOptions.map(opt => (
                            <div key={opt.name} onClick={() => setShipping(opt)} className={`p-3 border rounded-lg cursor-pointer text-xs flex justify-between items-center ${selectedShipping?.name === opt.name ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'hover:bg-gray-50'}`}>
                                <div className="flex flex-col"><span className="font-bold text-gray-900">{opt.name}</span>{opt.delivery_time > 1 && <span className="text-gray-500">Em até {opt.delivery_time} dias úteis</span>}</div><span className="font-bold text-sm">{opt.price === 0 ? 'Grátis' : formatCurrency(opt.price)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6 border-t pt-4">
                    <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${isPix ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500' : 'border-gray-200 hover:border-gray-300 text-gray-400 opacity-60 grayscale'}`}>
                        <div className="absolute top-2 right-2"><input type="radio" name="payment_mode" checked={isPix} onChange={() => setTipoPagamento('pix')} className="w-4 h-4 text-green-600 focus:ring-green-500"/></div>
                        <QrCode size={28} className="mb-2"/><span className="font-bold text-sm">PIX</span><span className="text-[10px] font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded-full mt-1">-5% OFF</span>
                    </label>
                    <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${!isPix ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 text-gray-400 opacity-60 grayscale'}`}>
                        <div className="absolute top-2 right-2"><input type="radio" name="payment_mode" checked={!isPix} onChange={() => setTipoPagamento('cartao')} className="w-4 h-4 text-blue-600 focus:ring-blue-500"/></div>
                        <CreditCard size={28} className="mb-2"/><span className="font-bold text-sm">Cartão</span><span className="text-[10px] text-gray-400 mt-1">Até 12x</span>
                    </label>
                </div>
                <div className="flex justify-between items-end mb-6 pt-4 border-t"><span className="font-medium">Total Final</span><span className="text-3xl font-black text-gray-900">{formatCurrency(totalFinal)}</span></div>
                <button onClick={handleCheckout} disabled={loading || !canCheckout} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-200 transform active:scale-95">{loading ? 'Processando...' : 'Finalizar Compra'} <ArrowRight size={18}/></button>
                <MercadoPagoTrust />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}