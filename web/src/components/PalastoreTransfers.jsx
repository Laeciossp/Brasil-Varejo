import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/useCartStore'; 
import { MapPin, Calendar, Clock, Users, Briefcase, Check, AlertCircle, Plane, Baby, Luggage } from 'lucide-react';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function PalastoreTransfers() {
  const navigate = useNavigate();
  const { addItem } = useCartStore(); 
  const [tripType, setTripType] = useState('oneway'); 

  // Autocomplete Origem
  const [pickupQuery, setPickupQuery] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const debouncedPickup = useDebounce(pickupQuery, 600);

  // Autocomplete Destino
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const debouncedDropoff = useDebounce(dropoffQuery, 600);

  // Dados da Viagem e Opcionais
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('12:00');
  
  const [flightNumber, setFlightNumber] = useState('');
  const [needsChildSeat, setNeedsChildSeat] = useState(false);
  
  // Cérebro Logístico
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [largeBags, setLargeBags] = useState(1); // 23kg
  const [smallBags, setSmallBags] = useState(0); // 12kg
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  // MATEMÁTICA LOGÍSTICA PALASTORE
  const COTACAO_EURO = 6.00; 
  const TARIFA_EUR_KM = 1.0;
  const MINIMO_EUR = 25.0;

  useEffect(() => {
    if (debouncedPickup.length > 3 && !pickupCoords) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedPickup)}&limit=4&countrycodes=br`)
        .then(res => res.json())
        .then(data => setPickupSuggestions(data)).catch(() => {});
    } else { setPickupSuggestions([]); }
  }, [debouncedPickup, pickupCoords]);

  useEffect(() => {
    if (debouncedDropoff.length > 3 && !dropoffCoords) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedDropoff)}&limit=4&countrycodes=br`)
        .then(res => res.json())
        .then(data => setDropoffSuggestions(data)).catch(() => {});
    } else { setDropoffSuggestions([]); }
  }, [debouncedDropoff, dropoffCoords]);

  const calcularValorCarro = (distanciaKm, multiplicadorCategoria) => {
    let valorEuro = Math.max(MINIMO_EUR * multiplicadorCategoria, distanciaKm * (TARIFA_EUR_KM * multiplicadorCategoria));
    let valorFinalReais = Math.ceil(valorEuro * COTACAO_EURO);
    if (tripType === 'roundtrip') valorFinalReais = valorFinalReais * 2; 
    return valorFinalReais;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearchResult(null);

    const totalPax = adults + children;
    const pesoBagagemEquivalente = largeBags + (smallBags * 0.5); 

    if (!pickupCoords || !dropoffCoords) {
      setError('Selecione um endereço válido da lista ao digitar a Origem e o Destino.');
      setLoading(false); return;
    }
    if (tripType === 'roundtrip' && !returnDate) {
      setError('Por favor, informe a data de retorno para o traslado de Ida e Volta.');
      setLoading(false); return;
    }

    try {
      const resRoute = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickupCoords.lon},${pickupCoords.lat};${dropoffCoords.lon},${dropoffCoords.lat}?overview=false`);
      const dataRoute = await resRoute.json();

      if (dataRoute.code !== 'Ok' || !dataRoute.routes.length) throw new Error('Não foi possível calcular a rota rodoviária.');

      const distanciaKm = parseFloat((dataRoute.routes[0].distance / 1000).toFixed(1));
      const duracaoMin = Math.round(dataRoute.routes[0].duration / 60);

      const frotaCompleta = [
        { id: '1', name: 'Minivan', pax: 4, bags: 4, multiplicador: 1.0, image: '/images/minivan.svg' },
        { id: '2', name: 'Executivo', pax: 3, bags: 3, multiplicador: 1.04, image: '/images/executivo.svg' },
        { id: '3', name: 'Van', pax: 5, bags: 4, multiplicador: 1.6, image: '/images/van.svg' },
        { id: '4', name: 'Minivan Executiva', pax: 4, bags: 4, multiplicador: 2.24, image: '/images/minivan.svg' },
        { id: '5', name: 'Micro-ônibus', pax: 8, bags: 8, multiplicador: 3.2, image: '/images/Micro-onibus.svg' },
        { id: '6', name: 'Luxo', pax: 3, bags: 3, multiplicador: 3.32, image: '/images/luxo.svg' }
      ];

      const frotaFiltrada = frotaCompleta.filter(veiculo => veiculo.pax >= totalPax && veiculo.bags >= pesoBagagemEquivalente);

      if (frotaFiltrada.length === 0) throw new Error(`Nenhum veículo individual suporta ${totalPax} pax com esse volume de bagagem. Divida o grupo ou contate-nos.`);

      setSearchResult({
        distancia: distanciaKm, duracao: duracaoMin, origemNome: pickupCoords.name, destinoNome: dropoffCoords.name,
        veiculos: frotaFiltrada.map(v => ({ ...v, precoFinal: calcularValorCarro(distanciaKm, v.multiplicador) }))
      });

    } catch (err) { setError(err.message || 'Erro ao calcular rota.'); } finally { setLoading(false); }
  };

  // ==========================================
  // INJEÇÃO 100% DETALHADA NO CARRINHO
  // ==========================================
  const handleAddToCart = (veiculo) => {
    const totalPax = adults + children;
    
    // 1. Relatório em Texto Puro (Para Sanity / Mercado Pago)
    let descriptionText = `TRANSFER ${tripType === 'roundtrip' ? 'IDA E VOLTA' : 'SÓ IDA'}\n`;
    descriptionText += `📍 De: ${searchResult.origemNome}\n`;
    descriptionText += `🏁 Para: ${searchResult.destinoNome}\n`;
    descriptionText += `📆 Ida: ${date.split('-').reverse().join('/')} às ${time}h\n`;
    if (tripType === 'roundtrip') {
      descriptionText += `📆 Volta: ${returnDate.split('-').reverse().join('/')} às ${returnTime}h\n`;
    }
    descriptionText += `🗺️ Distância: ${searchResult.distancia} km (~${searchResult.duracao} min)\n`;
    descriptionText += `✈️ Voo Informado: ${flightNumber || 'Nenhum'}\n`;
    descriptionText += `👶 Cadeirinha Infantil: ${needsChildSeat ? 'Sim (Solicitada)' : 'Não'}\n`;
    descriptionText += `👥 Passageiros: ${adults} Adultos, ${children} Crianças\n`;
    descriptionText += `🧳 Malas: ${largeBags} G (23kg), ${smallBags} P (12kg)`;

    // 2. Informações Premium para o Layout do Carrinho Roxo
    let customTier = veiculo.name;
    if (needsChildSeat || flightNumber) {
        let extras = [];
        if (flightNumber) extras.push(`Voo ${flightNumber}`);
        if (needsChildSeat) extras.push(`Cadeirinha`);
        customTier += ` [ + ${extras.join(' | ')} ]`;
    }

    const cartItem = {
      _id: `transfer-${veiculo.id}-${Date.now()}`,
      sku: `TRF-${veiculo.id}`,
      title: `Transfer VIP: ${veiculo.name}`,
      variantName: `${tripType === 'roundtrip' ? 'Ida e Volta' : 'Só Ida'} • ${totalPax} Passageiros`,
      price: veiculo.precoFinal,
      quantity: 1, 
      image: veiculo.image,
      isTravel: true, // Libera emissão digital sem frete físico
      description: descriptionText,
      
      // Os Detalhes do Trecho pro Cart.jsx renderizar a passagem
      flightDetails: {
          tier: customTier,
          holdBagsIda: largeBags, // Malas G
          holdBagsVolta: smallBags, // Malas P
          ida: { 
            origem: searchResult.origemNome, 
            destino: searchResult.destinoNome, 
            partida: `${date.split('-').reverse().join('/')} às ${time}h`, 
            duracao: `~${searchResult.duracao} min (${searchResult.distancia} km)` 
          },
          volta: tripType === 'roundtrip' ? { 
            origem: searchResult.destinoNome, 
            destino: searchResult.origemNome, 
            partida: `${returnDate.split('-').reverse().join('/')} às ${returnTime}h`, 
            duracao: `~${searchResult.duracao} min (${searchResult.distancia} km)` 
          } : null
      },
      // Backup de Payload Estruturado (Garante que nenhuma variável se perca)
      transferPayload: {
          tripType, adults, children, largeBags, smallBags, flightNumber, needsChildSeat
      },
      addedAt: Date.now()
    };

    addItem(cartItem);
    navigate('/cart');
  };

  return (
    <div className="w-full flex flex-col items-center pb-20 bg-gray-50 min-h-screen">
      
      <div className="w-full bg-[url('/images/bg-transfers.jpg')] bg-cover bg-center bg-no-repeat relative flex justify-center px-4 pt-16 pb-24 shadow-inner">
        <div className="absolute inset-0 bg-slate-900/60"></div>
        
        <div className="relative z-10 w-full max-w-[1100px]">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 drop-shadow-lg">Encontre o transfer perfeito</h2>

          <form onSubmit={handleSearch} className="w-full bg-[#E65100] p-3 md:p-4 rounded-xl shadow-2xl flex flex-col gap-3">
            
            <div className="flex gap-6 mb-1 text-white">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={tripType === 'oneway'} onChange={() => setTripType('oneway')} className="w-4 h-4 accent-white" />
                <span className="font-bold text-sm">Só ida</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={tripType === 'roundtrip'} onChange={() => setTripType('roundtrip')} className="w-4 h-4 accent-white" />
                <span className="font-bold text-sm">Ida e volta</span>
              </label>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm font-bold flex items-center gap-2"><AlertCircle size={16} />{error}</div>}

            <div className="flex flex-col lg:flex-row gap-2">
              <div className="relative flex-1 bg-white rounded flex items-center px-3 h-12 focus-within:ring-2 focus-within:ring-orange-300">
                <MapPin size={20} className="text-[#E65100] mr-2 min-w-[20px]" />
                <input type="text" required value={pickupQuery} onChange={(e) => { setPickupQuery(e.target.value); setPickupCoords(null); }} placeholder="Aeroporto, hotel ou endereço de origem" className="w-full h-full text-sm outline-none text-gray-800" />
                {pickupSuggestions.length > 0 && !pickupCoords && (
                  <ul className="absolute left-0 top-14 z-20 w-full bg-white border border-gray-200 rounded shadow-xl max-h-60 overflow-y-auto">
                    {pickupSuggestions.map(place => ( <li key={place.place_id} onClick={() => { setPickupQuery(place.display_name.split(',')[0]); setPickupCoords({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',')[0] }); setPickupSuggestions([]); }} className="p-3 border-b text-sm cursor-pointer hover:bg-orange-50 text-gray-700">{place.display_name}</li> ))}
                  </ul>
                )}
              </div>

              <div className="relative flex-1 bg-white rounded flex items-center px-3 h-12 focus-within:ring-2 focus-within:ring-orange-300">
                <MapPin size={20} className="text-[#E65100] mr-2 min-w-[20px]" />
                <input type="text" required value={dropoffQuery} onChange={(e) => { setDropoffQuery(e.target.value); setDropoffCoords(null); }} placeholder="Destino final" className="w-full h-full text-sm outline-none text-gray-800" />
                {dropoffSuggestions.length > 0 && !dropoffCoords && (
                  <ul className="absolute left-0 top-14 z-20 w-full bg-white border border-gray-200 rounded shadow-xl max-h-60 overflow-y-auto">
                    {dropoffSuggestions.map(place => ( <li key={place.place_id} onClick={() => { setDropoffQuery(place.display_name.split(',')[0]); setDropoffCoords({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',')[0] }); setDropoffSuggestions([]); }} className="p-3 border-b text-sm cursor-pointer hover:bg-orange-50 text-gray-700">{place.display_name}</li> ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-2">
              <div className="flex bg-white rounded h-12 flex-1 relative focus-within:ring-2 focus-within:ring-orange-300">
                <div className="absolute -top-2 left-2 bg-white px-1 text-[9px] font-black text-gray-500 uppercase rounded border border-gray-200">Partida</div>
                <div className="flex-1 flex items-center px-3 border-r border-gray-200"><Calendar size={18} className="text-[#E65100] mr-2"/><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-sm outline-none text-gray-800" /></div>
                <div className="w-[110px] flex items-center px-2"><Clock size={18} className="text-[#E65100] mr-1"/><input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="w-full text-sm outline-none text-gray-800" /></div>
              </div>

              {tripType === 'roundtrip' && (
                <div className="flex bg-white rounded h-12 flex-1 relative focus-within:ring-2 focus-within:ring-orange-300">
                  <div className="absolute -top-2 left-2 bg-[#E65100] text-white px-1 text-[9px] font-black uppercase rounded shadow-sm">Retorno</div>
                  <div className="flex-1 flex items-center px-3 border-r border-gray-200"><Calendar size={18} className="text-[#E65100] mr-2"/><input type="date" required value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full text-sm outline-none text-gray-800" /></div>
                  <div className="w-[110px] flex items-center px-2"><Clock size={18} className="text-[#E65100] mr-1"/><input type="time" required value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="w-full text-sm outline-none text-gray-800" /></div>
                </div>
              )}

              <button type="submit" disabled={loading} className="bg-[#1e293b] hover:bg-black text-white font-bold h-12 px-10 rounded text-lg transition-colors w-full lg:w-auto shadow-md">
                {loading ? 'Buscando...' : 'Pesquisar'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
              <div className="bg-white rounded h-12 px-2 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1"><Users size={14} className="text-[#E65100]"/> Adultos</span>
                <div className="flex items-center gap-0.5"><button type="button" onClick={() => setAdults(Math.max(1, adults - 1))} className="text-xl font-bold text-[#E65100] px-2">-</button><span className="font-bold text-sm w-4 text-center">{adults}</span><button type="button" onClick={() => setAdults(adults + 1)} className="text-xl font-bold text-[#E65100] px-2">+</button></div>
              </div>
              <div className="bg-white rounded h-12 px-2 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1"><Baby size={14} className="text-[#E65100]"/> Crianças</span>
                <div className="flex items-center gap-0.5"><button type="button" onClick={() => setChildren(Math.max(0, children - 1))} className="text-xl font-bold text-[#E65100] px-2">-</button><span className="font-bold text-sm w-4 text-center">{children}</span><button type="button" onClick={() => setChildren(children + 1)} className="text-xl font-bold text-[#E65100] px-2">+</button></div>
              </div>
              <div className="bg-white rounded h-12 px-2 flex items-center justify-between" title="Mala Grande: Até 23 kg">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1"><Briefcase size={14} className="text-[#E65100]"/> Mala G <span className="text-[9px] text-gray-400 leading-none">(23kg)</span></span>
                <div className="flex items-center gap-0.5"><button type="button" onClick={() => setLargeBags(Math.max(0, largeBags - 1))} className="text-xl font-bold text-[#E65100] px-2">-</button><span className="font-bold text-sm w-4 text-center">{largeBags}</span><button type="button" onClick={() => setLargeBags(largeBags + 1)} className="text-xl font-bold text-[#E65100] px-2">+</button></div>
              </div>
              <div className="bg-white rounded h-12 px-2 flex items-center justify-between" title="Mala de Mão/Pequena: Até 12 kg">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1"><Luggage size={14} className="text-[#E65100]"/> Mala P <span className="text-[9px] text-gray-400 leading-none">(12kg)</span></span>
                <div className="flex items-center gap-0.5"><button type="button" onClick={() => setSmallBags(Math.max(0, smallBags - 1))} className="text-xl font-bold text-[#E65100] px-2">-</button><span className="font-bold text-sm w-4 text-center">{smallBags}</span><button type="button" onClick={() => setSmallBags(smallBags + 1)} className="text-xl font-bold text-[#E65100] px-2">+</button></div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-1">
              <div className="bg-white rounded h-10 px-3 flex items-center flex-1 min-w-[200px]">
                <Plane size={16} className="text-[#E65100] mr-2" />
                <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="Número do voo (para rastreio grátis)" className="w-full text-sm outline-none text-gray-800" />
              </div>
              <label className="bg-white rounded h-10 px-3 flex items-center gap-2 cursor-pointer hover:bg-orange-50 transition-colors">
                <input type="checkbox" checked={needsChildSeat} onChange={(e) => setNeedsChildSeat(e.target.checked)} className="w-4 h-4 accent-[#E65100]" />
                <Baby size={16} className="text-[#E65100]" />
                <span className="text-sm font-medium text-gray-700">Solicitar cadeirinha infantil grátis</span>
              </label>
            </div>

          </form>
        </div>
      </div>

      <div className="w-full max-w-[1100px] px-4 mt-8 md:-mt-8 relative z-20">
        {searchResult && (
          <div className="flex flex-col lg:flex-row gap-6">
            
            <div className="w-full lg:w-1/3">
              <div className="bg-white border border-gray-200 rounded-lg p-5 sticky top-4 shadow-md">
                <h3 className="font-bold text-lg mb-4 text-[#333]">Resumo do trajeto</h3>
                <div className="relative pl-6 border-l-2 border-gray-200 space-y-6 mb-6">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 bg-white border-2 border-[#E65100] w-3 h-3 rounded-full"></div>
                    <p className="text-sm font-bold text-gray-800">{searchResult.origemNome}</p>
                    <p className="text-xs text-gray-500 mt-1">Ida: {date.split('-').reverse().join('/')} às {time}h</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 bg-[#E65100] w-3 h-3 rounded-full shadow-[0_0_0_2px_white]"></div>
                    <p className="text-sm font-bold text-gray-800">{searchResult.destinoNome}</p>
                    {tripType === 'roundtrip' ? (
                      <p className="text-xs text-[#E65100] font-bold mt-1">Volta: {returnDate.split('-').reverse().join('/')} às {returnTime}h</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Estimativa: ~{searchResult.duracao} min</p>
                    )}
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded flex justify-between items-center border border-orange-100">
                  <span className="text-xs font-bold text-[#E65100] uppercase">Distância da Rota</span>
                  <span className="text-lg font-black text-[#E65100]">{searchResult.distancia} km</span>
                </div>
                {flightNumber && <div className="mt-3 text-xs text-gray-600 flex gap-2"><Plane size={14} className="text-[#E65100] shrink-0"/> Motorista monitorará o voo {flightNumber}</div>}
              </div>
            </div>

            <div className="w-full lg:w-2/3 flex flex-col gap-4">
              {searchResult.veiculos.map((v) => (
                <div key={v.id} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row gap-4 shadow-sm hover:shadow-md hover:border-orange-200 transition-all">
                  
                  <div className="w-full sm:w-[200px] flex items-center justify-center p-4 bg-gray-50 rounded-lg shrink-0 border border-gray-100">
                    <img src={v.image} alt={v.name} className="w-full h-24 object-contain drop-shadow-sm" />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-[#1e293b] mb-2">{v.name}</h4>
                      <div className="flex flex-wrap gap-4 mb-3">
                        <span className="flex items-center gap-1 text-sm text-gray-600"><Users size={16} className="text-[#E65100]"/> {v.pax} lugares</span>
                        <span className="flex items-center gap-1 text-sm text-gray-600" title="Capacidade baseada em malas grandes (23kg)"><Briefcase size={16} className="text-[#E65100]"/> {v.bags} malas G</span>
                      </div>
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 text-sm text-[#008009] font-medium"><Check size={16}/> Cancelamento grátis até 24h antes</p>
                        <p className="flex items-center gap-2 text-sm text-[#008009] font-medium"><Check size={16}/> Motorista com placa de identificação</p>
                        {(needsChildSeat || children > 0) && <p className="flex items-center gap-2 text-sm text-[#008009] font-medium"><Check size={16}/> Cadeirinha Solicitada</p>}
                      </div>
                    </div>
                  </div>

                  <div className="sm:w-[180px] flex flex-col justify-end sm:items-end border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-4 mt-2 sm:mt-0 shrink-0">
                    <div className="text-left sm:text-right mb-4">
                      {tripType === 'roundtrip' && <span className="text-[10px] bg-orange-100 text-[#E65100] px-2 py-0.5 rounded font-bold uppercase mb-1 inline-block">Ida e Volta Inclusos</span>}
                      <p className="text-2xl font-black text-[#1e293b]">R$ {v.precoFinal}</p>
                      <p className="text-xs text-gray-500">O preço inclui impostos e taxas</p>
                    </div>
                    
                    <button 
                      onClick={() => handleAddToCart(v)}
                      className="w-full bg-[#E65100] hover:bg-orange-700 text-white font-bold py-2.5 rounded shadow-sm transition-colors text-sm"
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}