import React, { useState } from 'react';
import { Truck } from 'lucide-react';

const ShippingCalc = ({ logistics, price }) => {
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(null);

  const handleCalculate = async (e) => {
    e.preventDefault();
    if (cep.length < 8) return;
    
    setLoading(true);
    setOptions(null);

    try {
      // CONEXÃO REAL COM SEU WORKER
      const response = await fetch('https://brasil-varejo-api.laeciossp.workers.dev/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: { postal_code: cep },
          products: [{
            width: Number(logistics?.width || 15),
            height: Number(logistics?.height || 15),
            length: Number(logistics?.length || 15),
            weight: Number(logistics?.weight || 0.5),
            insurance_value: Number(price || 100),
            quantity: 1
          }]
        })
      });

      const data = await response.json();
      
      // Filtra apenas opções que não retornaram erro da transportadora
      setOptions(Array.isArray(data) ? data.filter(opt => !opt.error) : []);
      
    } catch (err) {
      console.error("Erro ao calcular frete:", err);
      setOptions([]);
    } finally {
      setLoading(false);
    }
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
          className="flex-1 h-10 px-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button 
          type="submit" 
          disabled={loading || cep.length < 8}
          className="px-4 h-10 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Calcular'}
        </button>
      </form>

      {options && (
        <div className="mt-4 space-y-2 border-t pt-4">
          {options.length > 0 ? options.map((opt, idx) => (
            <div key={idx} className="flex justify-between text-sm items-center py-2 border-b last:border-0 border-gray-200">
              <div className="flex items-center gap-2">
                {opt.company?.picture && (
                  <img src={opt.company.picture} alt="" className="h-4 w-8 object-contain" />
                )}
                <div>
                  <span className="font-bold text-gray-800">{opt.name}</span>
                  <p className="text-gray-500 text-[10px]">Chega em até {opt.delivery_time} dias úteis</p>
                </div>
              </div>
              <span className="font-bold text-blue-900">
                {Number(opt.price) === 0 ? 'Grátis' : `R$ ${parseFloat(opt.price).toFixed(2)}`}
              </span>
            </div>
          )) : (
            <p className="text-xs text-red-500 text-center">Nenhuma transportadora disponível.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ShippingCalc;