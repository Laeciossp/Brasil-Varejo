import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trash2, ShoppingCart, ArrowRight, ShieldCheck, MapPin, CreditCard, QrCode, Lock, Truck
} from 'lucide-react';
import { useUser } from "@clerk/clerk-react";
import { createClient } from "@sanity/client"; 
import useCartStore from '../store/useCartStore';
import { formatCurrency } from '../lib/utils';

// --- CONFIGURAÇÃO DO SANITY ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false, // Importante: false para pegar o dado mais recente do painel
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
  const [shippingOptions, setShippingOptions] = useState([]); 
  
  // Estado para armazenar os dias de manuseio vindos do Sanity
  const [globalHandlingTime, setGlobalHandlingTime] = useState(0);

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' });
  const [customerName, setCustomerName] = useState('');
  
  const { 
    items, removeItem, updateQuantity, selectedShipping, setShipping,
    customer, setActiveAddress, addAddress, setDocument, 
    tipoPagamento, setTipoPagamento, globalCep, clearCart
  } = useCartStore();
  
  // --- CÁLCULOS (Forçando números para evitar NaN ou Zero errado) ---
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
  const shippingCost = (selectedShipping && typeof selectedShipping.price === 'number') ? selectedShipping.price : 0;
  const totalFinal = subtotal + shippingCost;

  const activeAddress = customer.addresses?.find(a => a.id === customer.activeAddressId);

  // --- 1. BUSCAR DIAS DE MANUSEIO DO GESTOR (SANITY) ---
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Busca o documento de configurações de frete
        const query = `*[_type == "shippingSettings"][0]`;
        const settings = await client.fetch(query);
        if (settings && settings.handlingTime) {
          console.log("Dias de Manuseio (Gestor):", settings.handlingTime);
          setGlobalHandlingTime(Number(settings.handlingTime));
        }
      } catch (error) {
        console.error("Erro ao buscar config de frete:", error);
      }
    };
    fetchSettings();
  }, []);

  // Preencher nome se logado
  useEffect(() => {
    if (user && !customerName) {
        setCustomerName(user.fullName || '');
    }
  }, [user]);

  // --- 2. CÁLCULO E FILTRO DE FRETE ---
  useEffect(() => {
    const recalculate = async () => {
      const targetZip = activeAddress?.zip || (globalCep !== 'Informe seu CEP' ? globalCep : null);
      if (!targetZip || items.length === 0) return;

      setRecalculatingShipping(true);
      setShippingOptions([]); 

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
              width: 15, height: 15, length: 15, weight: 0.5,
              insurance_value: p.price,
              quantity: p.quantity
            }))
          })
        });
        
        const rawOptions = await response.json();

        if (Array.isArray(rawOptions) && rawOptions.length > 0) {
          const cleanZip = targetZip.replace(/\D/g, '');
          const isLocal = cleanZip === '43850000'; 

          // LIMPEZA INICIAL DOS DADOS
          const normalizedOptions = rawOptions.map(opt => {
             // Tratamento de Preço: Garante que vira número
             let val = opt.custom_price || opt.price || 0;
             if (typeof val === 'string') val = parseFloat(val.replace(',', '.'));
             
             return {
               ...opt,
               price: Number(val), // Preço numérico garantido
               originalDays: parseInt(opt.delivery_time) || 0
             };
          });

          let finalOptions = [];

          if (isLocal) {
             // --- REGRA LOCAL (43850000) ---
             // Pega o menor preço da API para não ser zero (ou fixa se quiser)
             normalizedOptions.sort((a, b) => a.price - b.price);
             const cheapest = normalizedOptions[0];

             finalOptions.push({
                name: "Expresso Palastore ⚡",
                price: cheapest.price, 
                delivery_time: 5, // <--- PRAZO FIXO 5 DIAS (Pedido do usuário)
                company: "Própria"
             });

          } else {
             // --- REGRA NACIONAL (Limpa a bagunça) ---
             
             // Filtra apenas PAC e SEDEX (ignora outras transportadoras confusas)
             const pacs = normalizedOptions.filter(o => o.name.toLowerCase().includes('pac') || o.name.toLowerCase().includes('econômico'));
             const sedexs = normalizedOptions.filter(o => o.name.toLowerCase().includes('sedex') || o.name.toLowerCase().includes('expresso'));

             // Pega o MELHOR PAC
             if (pacs.length > 0) {
                pacs.sort((a, b) => a.price - b.price); // Ordena pelo mais barato
                const bestPac = pacs[0];
                finalOptions.push({
                    name: "PAC (Econômico)",
                    price: bestPac.price,
                    // SOMA O PRAZO DO GESTOR AQUI
                    delivery_time: bestPac.originalDays + globalHandlingTime, 
                    company: bestPac.company?.name || "Correios"
                });
             }

             // Pega o MELHOR SEDEX
             if (sedexs.length > 0) {
                sedexs.sort((a, b) => a.price - b.price); // Ordena pelo mais barato
                const bestSedex = sedexs[0];
                finalOptions.push({
                    name: "SEDEX (Expresso)",
                    price: bestSedex.price,
                    // SOMA O PRAZO DO GESTOR AQUI
                    delivery_time: bestSedex.originalDays + globalHandlingTime, 
                    company: bestSedex.company?.name || "Correios"
                });
             }
          }

          setShippingOptions(finalOptions);
          
          // Seleciona automaticamente a primeira opção
          if (finalOptions.length > 0) {
             setShipping(finalOptions[0]); 
          }
        }
      } catch (error) {
        console.error("Erro frete", error);
      } finally {
        setRecalculatingShipping(false);
      }
    };
    recalculate();
  }, [customer.activeAddressId, items.length, globalCep, globalHandlingTime]); // Recalcula se o handlingTime mudar

  const handleSaveAddress = () => {
    if (!newAddr.zip || !newAddr.street || !newAddr.number) return alert("Preencha os dados obrigatórios.");
    addAddress({ ...newAddr, id: Math.random().toString(36).substr(2, 9) });
    setShowAddressForm(false);
    setNewAddr({ alias: '', zip: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' });
  };

  // --- CHECKOUT ---
  const handleCheckout = async () => {
    if (!isLoaded || !user) return alert("Faça login para continuar.");
    if (items.length === 0 || !selectedShipping || !activeAddress) return alert("Selecione frete e endereço.");
    if (!customer.document) return alert("Informe o CPF.");
    if (!customerName) return alert("Informe seu nome.");

    setLoading(true);

    try {
      const orderNumber = `#PALA-${Math.floor(Date.now() / 1000)}`;

      const cleanCustomer = {
        name: customerName,
        email: user.primaryEmailAddress?.emailAddress || "",
        cpf: customer.document,
        phone: ""
      };

      const cleanAddress = {
        zip: activeAddress.zip,
        street: activeAddress.street,
        number: activeAddress.number,
        complement: activeAddress.complement || "",
        neighborhood: activeAddress.neighborhood,
        city: activeAddress.city,
        state: activeAddress.state
      };

      const sanitizedItems = items.map(item => ({
         _key: Math.random().toString(36).substring(7),
         productName: item.title || item.name || "Produto", 
         variantName: item.variantName || "Padrão", 
         color: item.color || "",
         size: item.size || "",
         sku: item.sku || item._id,
         quantity: item.quantity,
         price: item.price,
         imageUrl: item.image || "", 
         product: { _type: 'reference', _ref: item._id }
      }));

      // CRIA PEDIDO NO SANITY
      const orderDoc = {
        _type: 'order',
        orderNumber: orderNumber,
        status: 'pending',
        customer: cleanCustomer,
        items: sanitizedItems,
        shippingAddress: cleanAddress,
        billingAddress: cleanAddress,
        carrier: selectedShipping.name,
        shippingCost: parseFloat(selectedShipping.price),
        totalAmount: totalFinal,
        paymentMethod: tipoPagamento,
        internalNotes: `Venda Site (Manuseio: ${globalHandlingTime} dias)`
      };

      console.log("Criando pedido...", orderDoc);
      const createdOrder = await client.create(orderDoc);
      const sanityId = createdOrder._id;

      // CHAMA WORKER
      const baseUrl = import.meta.env.VITE_API_URL || 'https://brasil-varejo-api.laeciossp.workers.dev';
      const response = await fetch(`${baseUrl}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items: sanitizedItems,
            shipping: parseFloat(selectedShipping.price), 
            email: cleanCustomer.email, 
            tipoPagamento, 
            shippingAddress: cleanAddress,
            customerDocument: cleanCustomer.cpf,
            totalAmount: totalFinal,
            orderId: sanityId 
        })
      });

      const data = await response.json();

      if (data.error || !data.url) {
        throw new Error(JSON.stringify(data.details || data.error));
      }

      clearCart();
      if (data.id_preferencia && window.MercadoPago) {
        const mp = new window.MercadoPago('APP_USR-fb2a68f8-969b-4624-9c81-3725b56f8b4f', { locale: 'pt-BR' });
        mp.checkout({ preference: { id: data.id_preferencia } }).open(); 
      } else {
        window.location.href = data.url; 
      }

    } catch (error) {
      console.error("Erro Checkout:", error);
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
            {/* PRODUTOS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                {items.map((item) => (
                    <div key={item.sku || item._id} className="flex gap-4">
                      <div className="w-20 h-20 bg-white border rounded-lg p-2">
                          <img src={item.image} className="w-full h-full object-contain mix-blend-multiply" alt={item.title} />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900">{item.title}</h3>
                                {item.variantName && <p className="text-xs text-gray-500 mt-1">{item.variantName}</p>}
                            </div>
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

            {/* ENTREGA E DADOS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold flex gap-2"><MapPin className="text-orange-500"/> Entrega</h2>
                    <button onClick={() => setShowAddressForm(!showAddressForm)} className="text-blue-600 font-bold text-sm">+ Endereço</button>
                </div>
                
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
                            <p className="font-bold text-sm">{addr.alias || 'Local'}</p>
                            <p className="text-xs text-gray-600">{addr.street}, {addr.number} {addr.complement}</p>
                            <p className="text-xs text-gray-500">{addr.city}/{addr.state}</p>
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t space-y-3">
                    <h2 className="text-lg font-bold flex gap-2"><ShieldCheck className="text-gray-400"/> Dados para Nota</h2>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nome Completo</label>
                        <input placeholder="Seu Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">CPF / CNPJ</label>
                        <input placeholder="000.000.000-00" value={customer.document || ''} onChange={e => setDocument(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50"/>
                    </div>
                </div>
            </div>
          </div>

          <div className="lg:w-[380px] h-fit sticky top-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold mb-6">Resumo</h3>
                <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="flex gap-1"><Truck size={14}/> Frete</span>
                            {recalculatingShipping ? <span className="text-orange-500 text-xs">...</span> : <span className="font-bold">{selectedShipping ? formatCurrency(selectedShipping.price) : '--'}</span>}
                        </div>
                        
                        {/* LISTA LIMPA E FILTRADA */}
                        {!recalculatingShipping && shippingOptions.map(opt => (
                            <div key={opt.name} onClick={() => setShipping(opt)} className={`p-3 border rounded-lg cursor-pointer text-xs flex justify-between items-center ${selectedShipping?.name === opt.name ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'hover:bg-gray-50'}`}>
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-900">{opt.name}</span>
                                    <span className="text-gray-500">Em até {opt.delivery_time} dias úteis</span>
                                </div>
                                <span className="font-bold text-sm">{formatCurrency(opt.price)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t pt-4 mb-6 space-y-2">
                    <label className="flex items-center gap-2 p-2 border rounded cursor-pointer"><input type="radio" checked={tipoPagamento === 'pix'} onChange={() => setTipoPagamento('pix')}/> PIX</label>
                    <label className="flex items-center gap-2 p-2 border rounded cursor-pointer"><input type="radio" checked={tipoPagamento === 'cartao'} onChange={() => setTipoPagamento('cartao')}/> Cartão</label>
                </div>
                <div className="flex justify-between items-end mb-6">
                    <span className="font-medium">Total</span>
                    <span className="text-3xl font-black">{formatCurrency(totalFinal)}</span>
                </div>
                <button onClick={handleCheckout} disabled={loading || !selectedShipping || !activeAddress || !customer.document || !customerName} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex justify-center gap-2 disabled:bg-gray-300">
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