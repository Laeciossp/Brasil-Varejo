import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

const ShippingCalc = ({ logistics }) => {
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(null);

  const handleCalculate = async (e) => {
    e.preventDefault();
    if (cep.length < 8) return;
    
    setLoading(true);
    // Simulação enquanto não conectamos a API real do Melhor Envio
    // Depois substituiremos por fetch('/api/shipping', ...)
    setTimeout(() => {
      setOptions([
        { name: 'PAC', price: 22.90, days: 8, company: 'Correios' },
        { name: 'SEDEX', price: 45.50, days: 3, company: 'Correios' },
        { name: 'Jadlog .Com', price: 19.90, days: 5, company: 'Jadlog' }
      ]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium">
        <Truck className="w-5 h-5" />
        <span>Calcular Frete e Prazo</span>
      </div>
      
      <form onSubmit={handleCalculate} className="flex gap-2">
        <input 
          type="text" 
          value={cep}
          onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
          maxLength={8}
          placeholder="Digite seu CEP"
          className="flex-1 h-10 px-3 border rounded focus:ring-2 focus:ring-brand-blue outline-none"
        />
        <button 
          type="submit" 
          disabled={loading || cep.length < 8}
          className="px-4 h-10 bg-white border border-gray-300 text-brand-blue font-bold rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? '...' : 'Calcular'}
        </button>
      </form>

      {options && (
        <div className="mt-4 space-y-2">
          {options.map((opt, idx) => (
            <div key={idx} className="flex justify-between text-sm items-center py-2 border-b last:border-0 border-gray-200">
              <div>
                <span className="font-bold text-gray-800">{opt.company} {opt.name}</span>
                <p className="text-gray-500 text-xs">Chega em até {opt.days} dias úteis</p>
              </div>
              <span className="font-bold text-brand-darkBlue">{formatCurrency(opt.price)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShippingCalc;