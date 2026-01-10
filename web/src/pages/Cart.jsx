// src/pages/Cart.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { client } from '../lib/sanity'; // Removido urlFor se não usado no exemplo, mantido client

export default function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCart, setLoadingCart] = useState(true);

  // No futuro, mude para pegar o ID real do usuário logado
  const userId = "cliente_brasil_varejo_1"; 

  // --- 1. BUSCAR CARRINHO DO CLOUDFLARE KV ---
  useEffect(() => {
    async function loadCartFromKV() {
      try {
        const response = await fetch(`https://brasil-varejo-api.laeciossp.workers.dev/cart/get?userId=${userId}`);
        if (response.ok) {
          const savedItems = await response.json();
          if (Array.isArray(savedItems)) {
            setCartItems(savedItems);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do KV:", err);
      } finally {
        setLoadingCart(false);
      }
    }
    loadCartFromKV();
  }, [userId]);

  // --- 2. FUNÇÃO PARA ATUALIZAR ESTADO E SALVAR NO KV ---
  const updateAndSyncCart = async (newItems) => {
    setCartItems(newItems);
    try {
      await fetch('https://brasil-varejo-api.laeciossp.workers.dev/cart/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, items: newItems })
      });
    } catch (err) {
      console.error("Erro ao sincronizar com banco de dados:", err);
    }
  };

  // --- 3. REMOVER ITEM ---
  const removeItem = (index) => {
    const updatedItems = cartItems.filter((_, i) => i !== index);
    updateAndSyncCart(updatedItems);
  };

  // Calcula total
  const total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // --- 4. LÓGICA DE CHECKOUT (Mantendo Sanity e Mercado Pago) ---
  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setLoading(true);
    
    const customerEmail = "cliente@teste.com"; 

    try {
      // Cria pedido no Sanity (Status: pending)
      const order = {
        _type: 'order',
        orderNumber: `BV-${Math.floor(Math.random() * 10000)}`,
        status: 'pending',
        totalAmount: total,
        items: cartItems.map(item => ({
          _key: Math.random().toString(36).substring(7),
          productName: item.title,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const createdOrder = await client.create(order);

      // Chama o Worker para gerar Link do Mercado Pago
      const response = await fetch('https://brasil-varejo-api.laeciossp.workers.dev/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          email: customerEmail,
          orderId: createdOrder._id 
        })
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erro ao gerar link de pagamento.");
      }

    } catch (error) {
      console.error(error);
      alert("Erro no processamento do pedido.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingCart) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-crocus-deep">Carregando seu carrinho...</div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <ShoppingCart size={64} className="text-gray-200 mb-4"/>
        <h2 className="text-2xl font-black text-brand-dark mb-2">Seu carrinho está vazio</h2>
        <Link to="/" className="text-crocus-vivid font-bold hover:underline">Voltar às compras</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-brand-dark mb-8">Meu Carrinho</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* LISTA DE ITENS */}
        <div className="flex-1 space-y-4">
          {cartItems.map((item, idx) => (
            <div key={idx} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="w-24 h-24 bg-gray-50 rounded-lg flex items-center justify-center font-bold text-gray-400">
                 IMG
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-brand-dark">{item.title}</h3>
                <p className="text-crocus-deep font-black">R$ {item.price?.toFixed(2)}</p>
                <div className="flex items-center gap-4 mt-2">
                   <span className="text-sm text-gray-500">Qtd: {item.quantity}</span>
                   <button 
                    onClick={() => removeItem(idx)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                   >
                    <Trash2 size={18}/>
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RESUMO DO PEDIDO */}
        <div className="w-full lg:w-96 bg-white p-6 rounded-2xl shadow-xl h-fit border border-gray-100">
          <h3 className="font-black text-lg text-brand-dark mb-4 uppercase">Resumo do Pedido</h3>
          
          <div className="flex justify-between mb-2 text-sm text-gray-600">
            <span>Subtotal</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-6 text-sm text-green-600 font-bold">
            <span>Frete</span>
            <span>Grátis</span>
          </div>
          
          <div className="flex justify-between mb-8 text-xl font-black text-crocus-deep border-t pt-4">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg hover:shadow-orange-500/40 flex items-center justify-center gap-2"
          >
            {loading ? 'Processando...' : 'Finalizar Compra'} <ArrowRight size={20}/>
          </button>
          
          <p className="text-[10px] text-center text-gray-400 mt-4 font-medium">
            Pagamento seguro via Mercado Pago
          </p>
        </div>
      </div>
    </div>
  );
}