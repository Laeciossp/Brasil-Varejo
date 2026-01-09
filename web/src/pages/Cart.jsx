import React from 'react';
import { Trash2, Plus, Minus, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import useCartStore from '../store/useCartStore';
import { formatCurrency } from '../lib/utils';
import { urlFor } from '../lib/sanity';

const Cart = () => {
  const { items, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const total = getTotalPrice();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Seu carrinho está vazio</h1>
        <Link to="/" className="text-brand-blue underline hover:text-brand-darkBlue">
          Continuar comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Carrinho de Compras</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Lista de Itens */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
          {items.map((item) => (
            <div key={item._id} className="flex flex-col sm:flex-row gap-4 py-6 border-b last:border-0">
              <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded p-2 flex items-center justify-center">
                {item.images && (
                  <img src={urlFor(item.images[0]).width(100).url()} alt="" className="max-h-full object-contain" />
                )}
              </div>
              
              <div className="flex-1">
                <Link to={`/product/${item.slug.current}`} className="text-lg font-medium text-brand-blue hover:underline">
                  {item.title}
                </Link>
                <div className="text-sm text-green-600 font-medium mt-1">Em estoque</div>
              </div>

              <div className="flex flex-col items-end gap-4">
                <div className="font-bold text-xl">{formatCurrency(item.price * item.quantity)}</div>
                
                <div className="flex items-center border rounded">
                  <button 
                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                    className="p-2 hover:bg-gray-100"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                    className="p-2 hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button 
                  onClick={() => removeItem(item._id)}
                  className="flex items-center text-sm text-red-600 hover:text-red-800 gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo do Pedido (Right Rail) */}
        <div className="lg:w-80">
          <div className="bg-white p-6 rounded-lg shadow-sm sticky top-24">
            <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>
            
            <div className="flex justify-between mb-2 text-gray-600">
              <span>Subtotal ({items.length} itens)</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between mb-4 text-gray-600">
              <span>Frete Estimado</span>
              <span className="text-sm">Calculado no checkout</span>
            </div>
            
            <div className="border-t pt-4 mb-6 flex justify-between items-center">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-2xl text-brand-blue">{formatCurrency(total)}</span>
            </div>

            <button className="w-full bg-brand-yellow text-brand-blue font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors flex justify-center items-center gap-2 mb-3">
              <Lock className="w-4 h-4" /> Ir para Pagamento
            </button>
            
            <div className="text-center">
              <Link to="/" className="text-sm text-brand-blue hover:underline">
                Continuar Comprando
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Cart;