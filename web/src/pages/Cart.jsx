import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trash2, ShoppingCart, ArrowRight, ShieldCheck, Minus, Plus, 
  MapPin, CreditCard, QrCode, Lock, Truck
} from 'lucide-react';
import { useUser } from "@clerk/clerk-react";
import { createClient } from "@sanity/client"; 
import useCartStore from '../store/useCartStore';
import { formatCurrency } from '../lib/utils';

// --- CLIENTE SANITY PARA SALVAR O PEDIDO ---
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
    <img 
      src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.14.3/mercadopago/logo__large.png" 
      className="h-5 opacity-50 grayscale hover:grayscale-0 transition-all" 
      alt="Mercado Pago" 
    />
  </div>
);

export default function Cart() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);
  const [recalculatingShipping, setRecalculatingShipping] = useState(false);
  
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });
  
  const { 
    items, removeItem, updateQuantity, selectedShipping, setShipping,
    getTotalPrice, customer, setActiveAddress, addAddress, setDocument, 
    tipoPagamento, setTipoPagamento, globalCep, clearCart
  } = useCartStore();
  
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalFinal = getTotalPrice();
  const activeAddress = customer.addresses?.find(a => a.id === customer.activeAddressId);

  // --- RECALCULO DE FRETE ---
  useEffect(() => {
    const recalculate = async () => {
      const targetZip = activeAddress?.zip || (globalCep !== 'Informe seu CEP' ? globalCep : null);
      if (!targetZip || items.length === 0) return;

      setRecalculatingShipping(true);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'https://brasil-varejo-api.laeciossp.workers.dev';
        const response = await fetch(`${baseUrl}/shipping`, { 
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
          const PRAZO_MANUSEIO_PADRAO = 5; 
          const cleanZip = targetZip.replace(/\D/g, '');
          const isLocal = cleanZip === '43850000'; 

          const optionsAdjusted = options.map(opt => {
            let finalName = opt.name;
            let finalDays = parseInt(opt.delivery_time) || 0;
            const lowerName = (opt.name || '').toLowerCase();

            if (isLocal) {
                finalName = "Expresso Palastore ⚡";
            } else if (lowerName.includes('pac')) {
                finalName = "PAC (Econômico)";
            } else if (lowerName.includes('sedex')) {
                finalName = "SEDEX (Expresso)";
            }

            if (!isLocal) {
                finalDays += PRAZO_MANUSEIO_PADRAO;
            }

            return { ...opt, name: finalName, delivery_time: finalDays };
          });

          const filteredOptions = isLocal 
            ? optionsAdjusted.filter(opt => !opt.name.toLowerCase().includes('pac')) 
            : optionsAdjusted;

          const currentName = selectedShipping?.name;
          const sameOption = filteredOptions.find(o => o.name === currentName);
          setShipping(sameOption || filteredOptions[0]);
        }
      } catch (error) {
        console.error("Erro frete", error);
      } finally {
        setRecalculatingShipping(false);
      }
    };
    recalculate();
  }, [customer.activeAddressId, items.length, globalCep]);

  const handleSaveAddress = () => {
    if (!newAddr.zip || !newAddr.street || !newAddr.number) return alert("Preencha os dados obrigatórios.");
    addAddress({ ...newAddr, id: Math.random().toString(36).substr(2, 9) });
    setShowAddressForm(false);
    setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '' });
  };

  // --- FUNÇÃO PRINCIPAL: SALVA NO SANITY E VAI PRO MERCADO PAGO ---
  const handleCheckout = async () => {
    if (!isLoaded || !user) return alert("Faça login para continuar.");
    if (items.length === 0 || !selectedShipping || !activeAddress) return alert("Selecione frete e endereço.");
    if (!customer.document) return alert("CPF/CNPJ obrigatório para a Nota Fiscal.");

    setLoading(true);

    try {
      // 1. DADOS SANITIZADOS PARA O BANCO DE DADOS (SANITY)
      const sanitizedItems = items.map(item => ({
         _key: Math.random().toString(36).substring(7),
         productName: item.title || item.name || "Produto", 
         variantName: item.variantName || "Padrão", 
         color: item.color || "",
         size: item.size || "",
         sku: item.sku || item._id,
         quantity: item.quantity,
         price: item.price,
         imageUrl: item.image,
         product: { _type: 'reference', _ref: item._id },
         productSlug: item.slug?.current || item.slug || ""
      }));

      const cleanAddress = {
        zip: activeAddress.zip,
        street: activeAddress.street,
        number: activeAddress.number,
        neighborhood: activeAddress.neighborhood,
        city: activeAddress.city,
        state: activeAddress.state,
        complement: ""
      };

      const orderNumber = `#PALA-${Math.floor(Date.now() / 1000)}`;

      // 2. CRIA O PEDIDO NO SANITY (Para seu painel funcionar)
      const orderDoc = {
        _type: 'order',
        orderNumber: orderNumber,
        status: 'pending',
        customer: {
            name: user.fullName || "Cliente Site",
            email: user.primaryEmailAddress?.emailAddress || "",
            cpf: customer.document, 
            phone: "" 
        },
        items: sanitizedItems,
        shippingAddress: cleanAddress,
        carrier: selectedShipping.name,
        shippingCost: parseFloat(selectedShipping.price),
        totalAmount: totalFinal,
        paymentMethod: tipoPagamento,
        hasUnreadMessage: true,
        internalNotes: "Aguardando pagamento..."
      };

      console.log("Salvando pedido no Sanity...");
      await client.create(orderDoc);
      console.log("Pedido salvo. Iniciando pagamento...");

      // 3. CHAMA O WORKER PARA GERAR PAGAMENTO (Para o cliente pagar)
      const baseUrl = import.meta.env.VITE_API_URL || 'https://brasil-varejo-api.laeciossp.workers.dev';
      
      const response = await fetch(`${baseUrl}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items: sanitizedItems, // Envia os itens limpos
            shipping: parseFloat(selectedShipping.price), 
            email: user.primaryEmailAddress?.emailAddress, 
            tipoPagamento, 
            shippingAddress: cleanAddress,
            customerDocument: customer.document,
            totalAmount: totalFinal,
            orderId: orderNumber // Manda o ID para referência
        })
      });

      const data = await response.json();

      if (data.error || !data.url) {
        throw new Error(JSON.stringify(data.details || data.error));
      }

      // 4. REDIRECIONA PARA PAGAMENTO
      clearCart(); // Limpa o carrinho antes de ir
      if (data.id_preferencia && window.MercadoPago) {
        const mp = new window.MercadoPago('APP_USR-fb2a68f8-969b-4624-9c81-3725b56f8b4f', { locale: 'pt-BR' });
        mp.checkout({ preference: { id: data.id_preferencia } }).open(); 
      } else {
        window.location.href = data.url; 
      }

    } catch (error) {
      console.error("Erro no Checkout:", error);
      alert("Erro ao processar: " + error.message);
    } finally { 
      setLoading(false); 
    }
  };

  if (items.length === 0) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white">
      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
        <ShoppingCart size={40} className="text-gray-300" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Seu carrinho está vazio</h2>
      <p className="text-gray-500 mb-8">Navegue por nossas categorias e aproveite as ofertas.</p>
      <Link to="/" className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-black transition-colors">
        Continuar Comprando
      </Link>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-10 font-sans">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
            Meu Carrinho <span className="text-gray-400 text-lg font-normal">({items.length} itens)</span>
        </h1>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* --- COLUNA PRINCIPAL (ESQUERDA) --- */}
          <div className="flex-1 space-y-8">
            
            {/* LISTA DE ITENS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 space-y-6">
                {items.map((item) => {
                  const productSlug = item.slug?.current || item.slug;

                  return (
                    <div key={item.sku || item._id} className="flex gap-4 sm:gap-6">
                      
                      {/* FOTO */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white border border-gray-100 rounded-lg flex-shrink-0 p-2 relative">
                          {productSlug ? (
                             <Link to={`/product/${productSlug}`} className="block w-full h-full">
                                <img src={item.image} className="w-full h-full object-contain mix-blend-multiply hover:scale-105 transition-transform" alt={item.title} />
                             </Link>
                          ) : (
                             <img src={item.image} className="w-full h-full object-contain mix-blend-multiply" alt={item.title} />
                          )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-2">
                            {/* NOME E VARIAÇÃO */}
                            <div>
                                <h3 className="font-medium text-gray-900 line-clamp-2 text-sm sm:text-base">
                                  {productSlug ? (
                                    <Link to={`/product/${productSlug}`} className="hover:text-orange-600 transition-colors">
                                      {item.title}
                                    </Link>
                                  ) : item.title}
                                </h3>
                                {/* EXIBE VARIAÇÃO SE HOUVER */}
                                {item.variantName && (
                                    <p className="text-xs text-gray-500 font-medium mt-1">Opção: {item.variantName}</p>
                                )}
                            </div>

                            <button onClick={() => removeItem(item._id, item.sku)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={18}/>
                            </button>
                        </div>
                        
                        <div className="flex justify-between items-end mt-2">
                            <div className="flex items-center border border-gray-200 rounded-lg">
                              <button onClick={() => updateQuantity(item._id, item.quantity - 1, item.sku)} disabled={item.quantity <= 1} className="px-3 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-50">-</button>
                              <span className="px-2 text-sm font-bold text-gray-900">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item._id, item.quantity + 1, item.sku)} className="px-3 py-1 text-gray-500 hover:bg-gray-50">+</button>
                            </div>
                            
                            <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">{formatCurrency(item.price)}</p>
                                {item.quantity > 1 && <span className="text-xs text-gray-400 block">{formatCurrency(item.price * item.quantity)} total</span>}
                            </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ENDEREÇO DE ENTREGA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <MapPin size={20} className="text-orange-500"/> Entrega
                    </h2>
                    <button onClick={() => setShowAddressForm(!showAddressForm)} className="text-blue-600 text-sm font-bold hover:underline">
                        + Novo Endereço
                    </button>
                </div>

                {showAddressForm && (
                   <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input placeholder="Apelido (Ex: Casa)" className="p-2 rounded border" value={newAddr.alias} onChange={e => setNewAddr({...newAddr, alias: e.target.value})} />
                      <input placeholder="CEP" className="p-2 rounded border" value={newAddr.zip} onChange={e => setNewAddr({...newAddr, zip: e.target.value})} />
                      <input placeholder="Rua" className="p-2 rounded border" value={newAddr.street} onChange={e => setNewAddr({...newAddr, street: e.target.value})} />
                      <input placeholder="Número" className="p-2 rounded border" value={newAddr.number} onChange={e => setNewAddr({...newAddr, number: e.target.value})} />
                      <input placeholder="Bairro" className="p-2 rounded border" value={newAddr.neighborhood} onChange={e => setNewAddr({...newAddr, neighborhood: e.target.value})} />
                      <input placeholder="Cidade" className="p-2 rounded border" value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})} />
                      <input placeholder="UF" className="p-2 rounded border" maxLength={2} value={newAddr.state} onChange={e => setNewAddr({...newAddr, state: e.target.value})} />
                      <button onClick={handleSaveAddress} className="col-span-full bg-gray-900 text-white py-2 rounded font-bold text-sm">Salvar Endereço</button>
                   </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                    {customer.addresses?.map(addr => (
                        <div 
                            key={addr.id} 
                            onClick={() => setActiveAddress(addr.id)} 
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all relative ${addr.id === customer.activeAddressId ? 'border-blue-600 bg-blue-50/30' : 'border-gray-100 hover:border-gray-300'}`}
                        >
                            <div className="flex justify-between mb-1">
                                <span className="font-bold text-gray-800 text-sm">{addr.alias || 'Local'}</span>
                                {addr.id === customer.activeAddressId && <div className="w-3 h-3 bg-blue-600 rounded-full"></div>}
                            </div>
                            <p className="text-xs text-gray-500">{addr.street}, {addr.number}</p>
                            <p className="text-xs text-gray-400">{addr.city}/{addr.state} - {addr.zip}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* DOCUMENTO PARA NF */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><ShieldCheck size={20} className="text-gray-400"/> Nota Fiscal</h2>
                <input 
                    type="text" 
                    placeholder="CPF ou CNPJ para a nota" 
                    value={customer.document || ''} 
                    onChange={e => setDocument(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-gray-900 outline-none focus:border-orange-500 transition-colors"
                />
            </div>
          </div>

          {/* --- RESUMO DO PEDIDO --- */}
          <div className="lg:w-[380px] h-fit sticky top-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Resumo</h3>
                
                <div className="space-y-3 mb-6 text-sm">
                    <div className="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 items-center">
                        <span className="flex items-center gap-1"><Truck size={14}/> Frete</span>
                        {recalculatingShipping 
                            ? <span className="text-orange-500 animate-pulse text-xs">Calculando...</span> 
                            : <span className="font-bold text-gray-800">{selectedShipping ? formatCurrency(selectedShipping.price) : '---'}</span>
                        }
                    </div>
                    {selectedShipping && (
                        <div className="text-xs text-right text-gray-400">
                            Via {selectedShipping.name} ({selectedShipping.delivery_time} dias úteis)
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-100 pt-4 mb-6">
                    <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Pagamento</p>
                    <div className="space-y-2">
                        <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${tipoPagamento === 'pix' ? 'border-green-500 bg-green-50/50' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-2">
                                <input type="radio" checked={tipoPagamento === 'pix'} onChange={() => setTipoPagamento('pix')} className="text-green-600 focus:ring-green-500"/>
                                <span className="text-sm font-medium text-gray-700">PIX</span>
                            </div>
                            <QrCode size={16} className="text-green-600"/>
                        </label>
                        <label className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${tipoPagamento === 'cartao' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-2">
                                <input type="radio" checked={tipoPagamento === 'cartao'} onChange={() => setTipoPagamento('cartao')} className="text-blue-600 focus:ring-blue-500"/>
                                <span className="text-sm font-medium text-gray-700">Cartão de Crédito</span>
                            </div>
                            <CreditCard size={16} className="text-blue-600"/>
                        </label>
                    </div>
                </div>

                <div className="flex justify-between items-end mb-6">
                    <span className="text-gray-500 font-medium">Total</span>
                    <span className="text-3xl font-black text-gray-900 tracking-tight">{formatCurrency(totalFinal)}</span>
                </div>

                <button 
                    onClick={handleCheckout} 
                    disabled={loading || !selectedShipping || !activeAddress || !customer.document} 
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] ${
                        !selectedShipping || !activeAddress || !customer.document
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/30'
                    }`}
                >
                    {loading ? 'Processando...' : 'Finalizar Compra'} <ArrowRight size={18}/>
                </button>

                <MercadoPagoTrust />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}