import React from 'react';
import { ShoppingCart, Zap, ShieldCheck } from 'lucide-react';
import useCartStore from '../../store/useCartStore';
import { formatCurrency, calculateDiscount } from '../../lib/utils';
import ShippingCalc from '../checkout/ShippingCalc';

const BuyBox = ({ product }) => {
  const addItem = useCartStore((state) => state.addItem);
  const discount = calculateDiscount(product.price, product.oldPrice);

  return (
    <div className="flex flex-col gap-6">
      {/* Bloco de Preço */}
      <div>
        {product.oldPrice && (
          <span className="text-sm text-gray-500 line-through">
            {formatCurrency(product.oldPrice)}
          </span>
        )}
        <div className="flex items-end gap-2">
          <h1 className="text-4xl font-bold text-brand-blue leading-none">
            {formatCurrency(product.price)}
          </h1>
          {discount && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded mb-1">
              {discount}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          ou <strong>{formatCurrency(product.price)}</strong> no Pix
        </p>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => addItem(product)}
          className="w-full h-12 bg-brand-yellow text-brand-blue font-bold text-lg rounded hover:bg-yellow-400 flex items-center justify-center gap-2 transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
          Adicionar ao Carrinho
        </button>
        <button className="w-full h-12 bg-brand-blue text-white font-bold text-lg rounded hover:bg-brand-darkBlue flex items-center justify-center gap-2 transition-colors">
          <Zap className="w-5 h-5 fill-current" />
          Comprar Agora
        </button>
      </div>

      {/* Infos de Segurança */}
      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded">
        <ShieldCheck className="w-5 h-5 text-green-600" />
        <span>Vendido e entregue por <strong>Mercado Solar</strong></span>
      </div>

      {/* Calculadora de Frete Importada */}
      <ShippingCalc logistics={product.logistics} />
    </div>
  );
};

export default BuyBox;