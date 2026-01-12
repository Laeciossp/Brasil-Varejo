import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trash2, ShoppingCart, ArrowRight, ShieldCheck, Minus, Plus, 
  MapPin, X, CreditCard, Barcode, QrCode, Pencil 
} from 'lucide-react';
import { useUser } from "@clerk/clerk-react";
// Removemos a importação do client Sanity aqui, pois o Worker fará isso
import useCartStore from '../store/useCartStore';
import { formatCurrency } from '../lib/utils';

// --- SELO MERCADO PAGO CORRIGIDO (PNG Oficial) ---
const MercadoPagoTrust = () => (
  <div className="mt-6 flex flex-col items-center justify-center gap-4 pt-6 border-t border-slate-100">
    <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
      {/* Imagem PNG oficial - Não distorce e carrega sempre */}
      <img 
        src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.14.3/mercadopago/logo__large.png" 
        className="h-6 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" 
        alt="Mercado Pago" 
      />
      <div className="h-6 w-[1px] bg-slate-200" />
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pagamento via</span>
        <span className="text-xs font-black text-slate-600 uppercase italic tracking-tighter">Mercado Pago</span>
      </div>
    </div>
    <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-slate-400">
      <ShieldCheck className="h-3 w-3 text-green-500" />
      <span>Compra Segura, Criptografada e Garantida</span>
    </div>
  </div>
);
export default function Cart() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState('cpf');
  const [showForm, setShowForm] = useState(false);
  const [recalculatingShipping, setRecalculatingShipping] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { 
    items, removeItem, updateQuantity, selectedShipping, setShipping,
    getTotalPrice, customer, setActiveAddress, addAddress, updateAddress, 
    setDocument, tipoPagamento, setTipoPagamento, globalCep 
  } = useCartStore();
  
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalFinal = getTotalPrice();
  const activeAddress = customer.addresses?.find(a => a.id === customer.activeAddressId);

  // --- RECALCULAR FRETE REAL NO WORKER ---
  useEffect(() => {
    const recalculate = async () => {
      const targetZip = activeAddress?.zip || (globalCep !== 'Informe seu CEP' ? globalCep : null);
      if (!targetZip || items.length === 0) return;

      setRecalculatingShipping(true);
      try {
        const workerUrl = 'https://brasil-varejo-api.laeciossp.workers.dev/shipping';
        const response = await fetch(workerUrl, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: { postal_code: "43805000" }, 
            to: { postal_code: targetZip },
            products: items.map(p => ({
              id: p._id,
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
          const currentName = selectedShipping?.name;
          const sameOption = options.find(o => o.name === currentName);
          setShipping(sameOption || options[0]);
        }
      } catch (error) {
        console.error("Erro no cálculo Melhor Envio", error);
      } finally {
        setRecalculatingShipping(false);
      }
    };
    recalculate();
  }, [customer.activeAddressId, items.length, globalCep, setShipping]);

  const [newAddr, setNewAddr] = useState({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });

  const handleEditAddress = (addr, e) => {
    e.stopPropagation();
    setNewAddr(addr);
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleSaveAddress = () => {
    if (!newAddr.zip || !newAddr.street || !newAddr.state) return alert("Preencha CEP, Rua e Estado!");
    if (editingId) {
      updateAddress(editingId, newAddr);
      setEditingId(null);
    } else {
      addAddress({ ...newAddr, id: Math.random().toString(36).substr(2, 9) });
    }
    setShowForm(false);
    setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });
  };

  // --- CHECKOUT AGORA 100% VIA WORKER (Resolve Erro 403) ---
  const handleCheckout = async () => {
    if (!isLoaded || !user) return alert("Por favor, faça login para finalizar a compra.");
    if (items.length === 0 || !selectedShipping || !activeAddress) {
      return alert("Selecione o frete e um endereço ativo!");
    }
    if (!customer.document) return alert("Informe seu CPF ou CNPJ para emissão da nota fiscal.");

    setLoading(true);
    try {
      // ATENÇÃO: Removemos a criação do pedido no Sanity pelo frontend para evitar erro 403.
      // Agora mandamos tudo para o Worker, que é seguro.
      
      const response = await fetch('https://brasil-varejo-api.laeciossp.workers.dev/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items, 
            shipping: parseFloat(selectedShipping.price), 
            email: user.primaryEmailAddress.emailAddress, 
            tipoPagamento, 
            shippingAddress: activeAddress,
            customerDocument: customer.document,
            totalAmount: totalFinal // Enviamos o total calculado
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
      console.error(error);
      alert("Houve um problema ao processar seu checkout. Tente novamente.");
    } finally { setLoading(false); }
  };

  if (items.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
      <div className="bg-slate-100 p-8 rounded-full mb-6 text-slate-300">
        <ShoppingCart size={80} />
      </div>
      <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase italic tracking-tighter">Seu carrinho está vazio</h2>
      <p className="text-slate-400 mb-6 font-bold uppercase text-[10px] tracking-widest">Encontre as melhores ofertas na Palastore</p>
      <Link to="/" className="bg-crocus-deep text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-crocus-deep/20">Ir para a Loja</Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingCart className="text-crocus-deep" size={32} />
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Finalizar Pedido</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 space-y-8">
          
          {/* 1. LISTA DE PRODUTOS */}
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 border-b border-slate-50 pb-4">Itens Selecionados</h2>
            {items.map((item) => (
              <div key={item._id} className="flex gap-6 p-4 hover:bg-slate-50 rounded-3xl transition-colors items-center">
                <img src={item.image} className="w-20 h-20 object-contain bg-white rounded-xl shadow-sm border border-slate-100 p-2" alt={item.title} />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 leading-tight mb-1">{item.name || item.title}</h3>
                  <p className="text-crocus-deep font-black text-lg">{formatCurrency(item.price)}</p>
                  <div className="flex items-center gap-6 mt-3">
                    <div className="flex items-center bg-slate-100 rounded-2xl p-1 px-3 gap-4 border border-slate-200">
                      <button onClick={() => updateQuantity(item._id, item.quantity - 1)} className="text-slate-500 hover:text-red-500"><Minus size={14}/></button>
                      <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._id, item.quantity + 1)} className="text-slate-500 hover:text-green-500"><Plus size={14}/></button>
                    </div>
                    <button onClick={() => removeItem(item._id)} className="text-slate-300 hover:text-red-400 flex items-center gap-1 font-bold text-[10px] uppercase">
                      <Trash2 size={16}/> Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 2. ENDEREÇOS */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
               <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">📍 Onde entregamos?</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escolha ou cadastre um endereço de entrega</p>
               </div>
               {!showForm && (
                 <button onClick={() => { setShowForm(true); setEditingId(null); }} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-crocus-deep transition-all">Novo Endereço</button>
               )}
            </div>

            {showForm && (
              <div className="bg-slate-50 p-8 rounded-[40px] border-2 border-dashed border-slate-200 mb-10 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                   <input type="text" placeholder="Apelido (Ex: Minha Casa)" className="p-4 rounded-2xl border-none shadow-sm text-sm font-bold" value={newAddr.alias} onChange={e => setNewAddr({...newAddr, alias: e.target.value})} />
                   <input type="text" placeholder="CEP" className="p-4 rounded-2xl border-none shadow-sm text-sm font-mono" value={newAddr.zip} onChange={e => setNewAddr({...newAddr, zip: e.target.value})} />
                   <div className="grid grid-cols-3 gap-2">
                        <input type="text" placeholder="Cidade" className="col-span-2 p-4 rounded-2xl border-none shadow-sm text-sm" value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})} />
                        <input type="text" placeholder="UF" className="p-4 rounded-2xl border-none shadow-sm text-sm text-center uppercase font-bold" maxLength={2} value={newAddr.state} onChange={e => setNewAddr({...newAddr, state: e.target.value})} />
                   </div>
                   <input type="text" placeholder="Rua / Logradouro" className="md:col-span-2 p-4 rounded-2xl border-none shadow-sm text-sm font-bold" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})} />
                   <input type="text" placeholder="Nº" className="p-4 rounded-2xl border-none shadow-sm text-sm font-bold" value={newAddr.number} onChange={e => setNewAddr({...newAddr, number: e.target.value})} />
                   <input type="text" placeholder="Bairro" className="p-4 rounded-2xl border-none shadow-sm text-sm font-bold" value={newAddr.neighborhood} onChange={e => setNewAddr({...newAddr, neighborhood: e.target.value})} />
                </div>
                <div className="flex gap-4">
                   <button onClick={handleSaveAddress} className="flex-1 bg-green-600 text-white font-black py-5 rounded-[24px] uppercase tracking-widest text-xs shadow-xl">Confirmar Endereço</button>
                   <button onClick={() => setShowForm(false)} className="px-6 py-5 border-2 border-slate-200 text-slate-400 rounded-[24px] uppercase font-black text-xs hover:bg-slate-100 transition-all">Cancelar</button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
               {customer.addresses?.map(addr => (
                 <div key={addr.id} onClick={() => setActiveAddress(addr.id)} className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all relative group ${addr.id === customer.activeAddressId ? 'border-crocus-vivid bg-crocus-light/5 ring-4 ring-crocus-light/10' : 'border-slate-50 hover:border-slate-200'}`}>
                    <button onClick={(e) => handleEditAddress(addr, e)} className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-300 hover:text-crocus-vivid shadow-sm opacity-0 group-hover:opacity-100 transition-all"><Pencil size={14} /></button>
                    <span className="bg-white border border-slate-100 px-3 py-1 rounded-xl text-[9px] font-black uppercase text-slate-400 mb-3 block w-fit">{addr.alias || 'Local'}</span>
                    <p className="text-sm font-black text-slate-800 uppercase">{addr.street}, {addr.number}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                 </div>
               ))}
            </div>
          </div>

          {/* 3. FATURAMENTO */}
          <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="max-w-xs">
                  <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 mb-2"><ShieldCheck className="text-crocus-vivid" size={24}/> Nota Fiscal Oficial</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Documento obrigatório para emissão da NF-e Palastore</p>
                </div>
                <div className="flex-1 w-full max-w-sm">
                  <div className="flex bg-white/5 p-1 rounded-xl mb-4 border border-white/10">
                    <button onClick={() => { setTipoDocumento('cpf'); setDocument(''); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${tipoDocumento === 'cpf' ? 'bg-white text-crocus-deep' : 'text-slate-400'}`}>Pessoa Física (CPF)</button>
                    <button onClick={() => { setTipoDocumento('cnpj'); setDocument(''); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${tipoDocumento === 'cnpj' ? 'bg-white text-crocus-deep' : 'text-slate-400'}`}>Empresa (CNPJ)</button>
                  </div>
                  <input 
                    type="text" 
                    maxLength={tipoDocumento === 'cpf' ? 11 : 14} 
                    placeholder={tipoDocumento === 'cpf' ? "000.000.000-00" : "00.000.000/0000-00"}
                    value={customer.document || ''} 
                    onChange={e => setDocument(e.target.value.replace(/\D/g, ''))} 
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-[24px] outline-none focus:border-crocus-vivid font-mono text-center text-lg transition-all" 
                  />
                </div>
              </div>
          </div>
        </div>

        {/* --- COLUNA DE RESUMO --- */}
        <div className="w-full lg:w-[400px] space-y-6">
          <div className="bg-white p-10 rounded-[50px] shadow-2xl h-fit border border-slate-50 sticky top-24">
            <h3 className="font-black text-2xl text-slate-900 mb-8 uppercase tracking-tighter italic">Resumo da Palastore</h3>
            
            <div className="space-y-4 mb-8 border-b border-slate-50 pb-8">
              <div className="flex justify-between text-slate-400 font-bold text-xs uppercase tracking-widest"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-slate-400 font-bold text-xs uppercase tracking-widest">
                  <span>Frete {selectedShipping?.name}</span>
                  {recalculatingShipping ? <span className="animate-pulse text-crocus-deep">Calculando...</span> : <span>{selectedShipping ? formatCurrency(selectedShipping.price) : 'Pendente'}</span>}
              </div>
              
              {/* Opções de Pagamento */}
              <div className="space-y-3 mt-10">
                <span className="text-[10px] font-black text-slate-300 uppercase block mb-2">Forma de Pagamento</span>
                <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${tipoPagamento === 'pix' ? 'border-green-500 bg-green-50' : 'border-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" checked={tipoPagamento === 'pix'} onChange={() => setTipoPagamento('pix')} />
                    <span className="font-black text-xs uppercase flex items-center gap-2">PIX / Boleto <QrCode size={14}/></span>
                  </div>
                  <span className="text-[10px] font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-lg animate-pulse">10% OFF</span>
                </label>
                <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${tipoPagamento === 'cartao' ? 'border-crocus-vivid bg-crocus-light/5' : 'border-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" checked={tipoPagamento === 'cartao'} onChange={() => setTipoPagamento('cartao')} />
                    <span className="font-black text-xs uppercase flex items-center gap-2">Cartão de Crédito <CreditCard size={14}/></span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-between mb-10 text-4xl font-black text-crocus-deep">
              <div className="leading-tight">
                <span className="block text-[10px] uppercase text-slate-300 tracking-widest font-bold">Total Final</span>
                <span>{formatCurrency(totalFinal)}</span>
              </div>
            </div>
            
            <button 
              onClick={handleCheckout} 
              disabled={loading || !selectedShipping || !activeAddress || !customer.document} 
              className={`w-full py-6 rounded-[30px] font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 text-sm ${!selectedShipping || !activeAddress ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:scale-105 shadow-orange-500/40 hover:bg-orange-600'}`}
            >
              {loading ? 'Processando...' : 'Finalizar Pedido'} <ArrowRight size={20}/>
            </button>
            
            <MercadoPagoTrust />
          </div>
          
          <div className="bg-crocus-light/10 border border-crocus-light/20 p-6 rounded-[30px] flex items-center gap-4">
              <div className="bg-white p-3 rounded-full shadow-sm text-crocus-deep"><ShieldCheck size={24}/></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Sua compra na <strong className="text-crocus-deep">Palastore</strong> é protegida pelo Mercado Pago. Satisfação ou seu dinheiro de volta.</p>
          </div>
        </div>
      </div>
    </div>
  );
}