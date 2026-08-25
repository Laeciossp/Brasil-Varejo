import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase'; // <-- DESCOMENTE E IMPORTE O APP AQUI
// import { app } from '../firebase'; // Ajuste o caminho conforme seu projeto

export default function HotelSearch() {
  const [destinationCode, setDestinationCode] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // Botão de segurança para teste na Moldávia exigido pela Restel
  const fillTestData = () => {
    setDestinationCode('MVMOL');
    setCheckInDate(getTomorrowStr());
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 4);
    setCheckOutDate(nextWeek.toISOString().split('T')[0]);
    
    setAdults(2);
    setChildren(0);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!destinationCode || !checkInDate || !checkOutDate) {
      setError("Preencha destino e datas para buscar.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // INICIALIZAÇÃO DO FIREBASE FUNCTIONS
      const functions = getFunctions(app); // Se precisar passar o app: getFunctions(app)
      const searchRestelHotels = httpsCallable(functions, 'searchRestelHotels');

      const response = await searchRestelHotels({
        destinationCode,
        checkInDate,
        checkOutDate,
        adults: parseInt(adults),
        children: parseInt(children),
        childrenAges: '' // Deixando vazio por enquanto para simplificar
      });

      if (response.data.status === 'success' && response.data.hoteis.length > 0) {
        setResults(response.data.hoteis);
      } else {
        setError("Nenhum hotel encontrado para esta busca.");
      }
    } catch (err) {
      console.error("Erro na busca B2B:", err);
      setError("Falha ao conectar com os fornecedores de hotéis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto font-sans pb-10 mt-6">
      
      {/* HERO BANNER HOTÉIS */}
      <div className="relative z-50 rounded-3xl mb-8 shadow-xl">
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2000&auto=format&fit=crop" alt="Hotéis" className="w-full h-full object-cover brightness-[0.55]" />
        </div>
        
        <div className="relative z-10 p-6 md:p-10 lg:p-14">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-2 drop-shadow-lg">Onde você vai ficar?</h2>
          <p className="text-white/90 font-medium text-sm md:text-lg mb-8 drop-shadow">Os melhores resorts, pousadas e hotéis com tarifas B2B exclusivas.</p>
          
          {/* CAIXA DE PESQUISA B2B */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 p-5 relative z-40">
            
            {/* BOTÃO MODO DESENVOLVEDOR (Remover em Produção) */}
            <div className="mb-4">
               <button onClick={fillTestData} type="button" className="text-xs bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded shadow hover:bg-orange-200 transition">
                 🛠️ Preencher Teste Restel (Moldávia)
               </button>
            </div>

            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-2 h-auto md:h-[50px] relative z-40">
              
              {/* DESTINO */}
              <div className="col-span-1 md:col-span-4 flex items-center border border-gray-300 rounded-md px-3 hover:border-purple-600 bg-white h-12 md:h-full relative z-40">
                <span className="text-gray-400 text-lg mr-2">📍</span>
                <input 
                  type="text" 
                  value={destinationCode} 
                  onChange={(e) => setDestinationCode(e.target.value.toUpperCase())} 
                  className="flex-1 outline-none text-sm font-bold text-gray-800 bg-transparent w-full uppercase" 
                  placeholder="Código do Destino (Ex: SSA)" 
                />
              </div>

              {/* DATAS */}
              <div className="col-span-1 md:col-span-4 flex gap-1 h-12 md:h-full relative z-40">
                <div className="flex-1 flex flex-col justify-center border border-gray-300 rounded-md px-3 hover:border-purple-600 bg-white">
                  <span className="text-[9px] uppercase font-bold text-gray-400 leading-tight">Check-in</span>
                  <input type="date" min={getTodayStr()} value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="text-sm font-bold text-gray-900 outline-none w-full bg-transparent"/>
                </div>
                <div className="flex-1 flex flex-col justify-center border border-gray-300 rounded-md px-3 hover:border-purple-600 bg-white">
                  <span className="text-[9px] uppercase font-bold text-gray-400 leading-tight">Check-out</span>
                  <input type="date" min={checkInDate || getTomorrowStr()} value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="text-sm font-bold text-gray-900 outline-none w-full bg-transparent"/>
                </div>
              </div>

              {/* HÓSPEDES */}
              <div className="col-span-1 md:col-span-2 flex items-center justify-between border border-gray-300 rounded-md px-3 hover:border-purple-600 bg-white h-12 md:h-full relative z-40">
                <div className="flex flex-col w-1/2 border-r border-gray-200">
                   <span className="text-[9px] uppercase font-bold text-gray-400">Adultos</span>
                   <input type="number" min="1" value={adults} onChange={(e) => setAdults(e.target.value)} className="text-sm font-bold text-gray-900 outline-none bg-transparent"/>
                </div>
                <div className="flex flex-col w-1/2 pl-2">
                   <span className="text-[9px] uppercase font-bold text-gray-400">Crianças</span>
                   <input type="number" min="0" value={children} onChange={(e) => setChildren(e.target.value)} className="text-sm font-bold text-gray-900 outline-none bg-transparent"/>
                </div>
              </div>

              {/* BOTÃO BUSCAR */}
              <div className="col-span-1 md:col-span-2 h-12 md:h-full relative z-0">
                <button type="submit" disabled={loading} className="w-full h-full bg-[#00a698] hover:bg-[#008f82] text-white font-extrabold rounded-md shadow-md text-base uppercase tracking-wide transition">
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mb-6 font-medium text-sm">{error}</div>}

      {/* RESULTADOS DA BUSCA */}
      <div className="space-y-6 relative z-0">
        {results.map((hotel, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col md:flex-row">
            
            <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-black text-gray-900 text-xl">{hotel.nome}</h3>
                  <div className="flex text-orange-400 text-sm my-1">
                    {'⭐'.repeat(parseInt(hotel.categoria) || 3)}
                  </div>
                  <p className="text-xs font-bold text-gray-500">ID Restel: {hotel.hotelId}</p>
                </div>
                {hotel.taxasLocais && (
                  <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded border border-red-100 uppercase">
                    Taxa Local: {hotel.taxasLocais}
                  </span>
                )}
              </div>
            </div>

            {/* PAINEL DE OFERTAS DE QUARTOS */}
            <div className="w-full md:w-[450px] bg-gray-50 p-5 flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase text-purple-800 tracking-wider mb-1">Quartos Disponíveis</h4>
              
              {hotel.ofertas?.map((oferta, idx) => (
                <div key={idx} className="bg-white border border-purple-100 rounded-lg p-3 shadow-sm flex justify-between items-center hover:border-purple-300 transition">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{oferta.tipoQuarto}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Regime: {oferta.codigoRegime}</p>
                  </div>
                  <div className="text-right flex flex-col justify-end">
                    <span className="text-xl font-black text-green-700 block">R$ {oferta.precoVenda.toFixed(2)}</span>
                    <button className="mt-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded transition">
                      Selecionar
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}