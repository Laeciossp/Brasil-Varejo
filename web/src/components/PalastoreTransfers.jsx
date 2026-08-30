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

const HORARIOS_PREESTABELECIDOS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", 
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", 
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
];

export default function PalastoreTransfers() {
  const navigate = useNavigate();
  const { addItem } = useCartStore(); 
  const [tripType, setTripType] = useState('oneway'); 

  const [pickupQuery, setPickupQuery] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const debouncedPickup = useDebounce(pickupQuery, 600);

  const [dropoffQuery, setDropoffQuery] = useState('');
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const debouncedDropoff = useDebounce(dropoffQuery, 600);

  const getMinDepartureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };
  const minDepartureDate = getMinDepartureDate();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('12:00');
  
  const [flightNumber, setFlightNumber] = useState('');
  const [needsChildSeat, setNeedsChildSeat] = useState(false);
  const [hasBabyStroller, setHasBabyStroller] = useState(false);
  
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [largeBags, setLargeBags] = useState(1); 
  const [smallBags, setSmallBags] = useState(0); 
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResult, setSearchResult] = useState(null);

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

    const totalPax = Number(adults) + Number(children);
    const pesoBagagemEquivalente = Number(largeBags) + (Number(smallBags) * 0.5) + (hasBabyStroller ? 1 : 0); 

    if (!pickupCoords || !dropoffCoords) {
      setError('Selecione um endereço válido da lista ao digitar a Origem e o Destino.');
      setLoading(false); return;
    }
    if (!date) {
      setError('A partida exige no mínimo 48 horas de antecedência. Selecione a data de ida.');
      setLoading(false); return;
    }
    if (tripType === 'roundtrip' && !returnDate) {
      setError('Por favor, informe a data de retorno para o traslado de Ida e Volta.');
      setLoading(false); return;
    }
    if (tripType === 'roundtrip' && returnDate < date) {
      setError('A data de volta não pode ser anterior à data de ida.');
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

      if (frotaFiltrada.length === 0) throw new Error(`Nenhum veículo individual suporta ${totalPax} passageiros com esse volume de bagagem. Divida o grupo ou contate-nos.`);

      setSearchResult({
        distancia: distanciaKm, duracao: duracaoMin, origemNome: pickupCoords.name, destinoNome: dropoffCoords.name,
        veiculos: frotaFiltrada.map(v => ({ ...v, precoFinal: calcularValorCarro(distanciaKm, v.multiplicador) }))
      });

    } catch (err) { setError(err.message || 'Erro ao calcular rota.'); } finally { setLoading(false); }
  };

  const handleAddToCart = (veiculo) => {
    const totalPax = Number(adults) + Number(children);
    
    let descriptionText = `TRANSFER ${tripType === 'roundtrip' ? 'IDA E VOLTA' : 'SÓ IDA'}\n`;
    descriptionText += `📍 De: ${searchResult.origemNome}\n`;
    descriptionText += `🏁 Para: ${searchResult.destinoNome}\n`;
    descriptionText += `📆 Ida: ${date.split('-').reverse().join('/')} às ${time}h\n`;
    if (tripType === 'roundtrip') {
      descriptionText += `📆 Volta: ${returnDate.split('-').reverse().join('/')} às ${returnTime}h\n`;
    }
    descriptionText += `🗺️ Distância: ${searchResult.distancia} km (~${searchResult.duracao} min)\n`;
    descriptionText += `✈️ Voo: ${flightNumber || 'Nenhum'}\n`;
    descriptionText += `👶 Cadeirinha: ${needsChildSeat ? 'Sim' : 'Não'}\n`;
    descriptionText += `🍼 Carrinho de Bebê: ${hasBabyStroller ? 'Sim' : 'Não'}\n`;
    descriptionText += `👥 Passageiros: ${adults} Adultos, ${children} Crianças\n`;
    descriptionText += `🧳 Malas do Cliente: ${largeBags} G (23kg), ${smallBags} P (12kg)`;

    const bagsStr = (Number(largeBags) > 0 || Number(smallBags) > 0) ? ` • 🧳 ${largeBags}G, ${smallBags}P` : ' • Sem Bagagem';
    const variantStr = `${tripType === 'roundtrip' ? 'Ida e Volta' : 'Só Ida'} • 👥 ${totalPax} Pax${bagsStr}`;

    let customTier = `${veiculo.name} • ${tripType === 'roundtrip' ? 'Ida e Volta' : 'Só Ida'}`;
    if (needsChildSeat || flightNumber || hasBabyStroller) {
        let extras = [];
        if (flightNumber) extras.push(`Voo ${flightNumber}`);
        if (needsChildSeat) extras.push(`Cadeirinha`);
        if (hasBabyStroller) extras.push(`Carrinho`);
        customTier += ` [ + ${extras.join(' | ')} ]`;
    }

    // CORREÇÃO: Gerador de Hash Único. Garante que cada reserva não se misture com a outra no carrinho!
    const uniqueHash = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const cartItem = {
      _id: `transfer-${veiculo.id}-${uniqueHash}`,
      sku: `TRF-${veiculo.id}-${uniqueHash}`, // O Carrinho agora enxerga isso como um produto totalmente novo
      title: `Transfer VIP: ${veiculo.name}`,
      variantName: variantStr, 
      price: veiculo.precoFinal,
      quantity: 1, 
      image: veiculo.image,
      isTravel: true,
      description: descriptionText,
      flightDetails: {
          tier: customTier,
          holdBagsIda: Number(largeBags), 
          holdBagsVolta: Number(smallBags), 
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
      transferPayload: {
          tripType, 
          adults: Number(adults), 
          children: Number(children), 
          largeBags: Number(largeBags), 
          smallBags: Number(smallBags), 
          flightNumber, 
          needsChildSeat, 
          hasBabyStroller,
          pickupName: searchResult.origemNome,
          dropoffName: searchResult.destinoNome,
          date: date.split('-').reverse().join('/'),
          time,
          returnDate: returnDate ? returnDate.split('-').reverse().join('/') : null,
          returnTime
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

            {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm font-bold flex items-center gap-2 shadow-sm"><AlertCircle size={16} />{error}</div>}

            <div className="flex flex-col lg:flex-row gap-2">
              <div className="relative flex-1 bg-white rounded-lg flex items-center px-3 h-14 shadow-sm">
                <MapPin size={20} className="text-[#E65100] mr-2 shrink-0" />
                <input 
                  type="text" 
                  required 
                  value={pickupQuery} 
                  onChange={(e) => { setPickupQuery(e.target.value); setPickupCoords(null); }} 
                  placeholder="Aeroporto, hotel ou endereço de origem" 
                  className="w-full h-full text-sm font-bold outline-none text-black placeholder:text-gray-400 placeholder:font-normal bg-transparent" 
                />
                {pickupSuggestions.length > 0 && !pickupCoords && (
                  <ul className="absolute left-0 top-16 z-30 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {pickupSuggestions.map(place => ( 
                      <li key={place.place_id} onClick={() => { setPickupQuery(place.display_name.split(',')[0]); setPickupCoords({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',')[0] }); setPickupSuggestions([]); }} className="p-3 border-b text-sm font-bold cursor-pointer hover:bg-orange-50 text-black">
                        {place.display_name}
                      </li> 
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative flex-1 bg-white rounded-lg flex items-center px-3 h-14 shadow-sm">
                <MapPin size={20} className="text-[#E65100] mr-2 shrink-0" />
                <input 
                  type="text" 
                  required 
                  value={dropoffQuery} 
                  onChange={(e) => { setDropoffQuery(e.target.value); setDropoffCoords(null); }} 
                  placeholder="Destino final" 
                  className="w-full h-full text-sm font-bold outline-none text-black placeholder:text-gray-400 placeholder:font-normal bg-transparent" 
                />
                {dropoffSuggestions.length > 0 && !dropoffCoords && (
                  <ul className="absolute left-0 top-16 z-30 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {dropoffSuggestions.map(place => ( 
                      <li key={place.place_id} onClick={() => { setDropoffQuery(place.display_name.split(',')[0]); setDropoffCoords({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',')[0] }); setDropoffSuggestions([]); }} className="p-3 border-b text-sm font-bold cursor-pointer hover:bg-orange-50 text-black">
                        {place.display_name}
                      </li> 
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-2">
              <div className="flex bg-white rounded-lg h-14 flex-1 relative shadow-sm">
                <div className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-black text-black uppercase rounded border border-gray-200">Partida (Mín. 48h)</div>
                <div className="flex-1 flex items-center px-3 border-r border-gray-200">
                  <Calendar size={18} className="text-[#E65100] mr-2 shrink-0"/>
                  <input type="date" required min={minDepartureDate} value={date} onChange={(e) => { setDate(e.target.value); if (returnDate && e.target.value > returnDate) setReturnDate(''); }} className="w-full text-sm font-bold outline-none text-black bg-transparent cursor-pointer" />
                </div>
                <div className="w-[120px] flex items-center px-2">
                  <Clock size={18} className="text-[#E65100] mr-1 shrink-0"/>
                  <select value={time} onChange={(e) => setTime(e.target.value)} className="w-full text-sm font-bold outline-none text-black bg-transparent cursor-pointer">
                    {HORARIOS_PREESTABELECIDOS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {tripType === 'roundtrip' && (
                <div className="flex bg-white rounded-lg h-14 flex-1 relative shadow-sm">
                  <div className="absolute -top-2 left-3 bg-[#E65100] text-white px-1 text-[10px] font-black uppercase rounded shadow-sm">Retorno (A partir da Ida)</div>
                  <div className="flex-1 flex items-center px-3 border-r border-gray-200">
                    <Calendar size={18} className="text-[#E65100] mr-2 shrink-0"/>
                    <input type="date" required min={date || minDepartureDate} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full text-sm font-bold outline-none text-black bg-transparent cursor-pointer" />
                  </div>
                  <div className="w-[120px] flex items-center px-2">
                    <Clock size={18} className="text-[#E65100] mr-1 shrink-0"/>
                    <select value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="w-full text-sm font-bold outline-none text-black bg-transparent cursor-pointer">
                      {HORARIOS_PREESTABELECIDOS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="bg-[#1e293b] hover:bg-black text-white font-black h-14 px-10 rounded-lg text-base transition-colors w-full lg:w-auto shadow-md">
                {loading ? 'Calculando...' : 'Pesquisar'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
              <div className="bg-white rounded-lg h-14 px-3 flex items-center justify-between shadow-sm">
                <span className="text-xs font-bold text-black flex items-center gap-1.5"><Users size={16} className="text-[#E65100]"/> Adultos</span>
                <select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="font-black text-sm text-black bg-gray-100 px-2 py-1.5 rounded outline-none cursor-pointer">
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-lg h-14 px-3 flex items-center justify-between shadow-sm">
                <span className="text-xs font-bold text-black flex items-center gap-1.5"><Baby size={16} className="text-[#E65100]"/> Crianças</span>
                <select value={children} onChange={(e) => setChildren(Number(e.target.value))} className="font-black text-sm text-black bg-gray-100 px-2 py-1.5 rounded outline-none cursor-pointer">
                  {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-lg h-14 px-3 flex items-center justify-between shadow-sm" title="Até 23kg">
                <span className="text-xs font-bold text-black flex items-center gap-1.5"><Briefcase size={16} className="text-[#E65100]"/> Mala G <span className="text-[10px] text-black">(23kg)</span></span>
                <select value={largeBags} onChange={(e) => setLargeBags(Number(e.target.value))} className="font-black text-sm text-black bg-gray-100 px-2 py-1.5 rounded outline-none cursor-pointer">
                  {[0,1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-lg h-14 px-3 flex items-center justify-between shadow-sm" title="Até 12kg">
                <span className="text-xs font-bold text-black flex items-center gap-1.5"><Luggage size={16} className="text-[#E65100]"/> Mala P <span className="text-[10px] text-black">(12kg)</span></span>
                <select value={smallBags} onChange={(e) => setSmallBags(Number(e.target.value))} className="font-black text-sm text-black bg-gray-100 px-2 py-1.5 rounded outline-none cursor-pointer">
                  {[0,1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-1 bg-white/10 p-3 rounded-lg">
              <div className="bg-white rounded-lg h-12 px-3 flex items-center flex-1 min-w-[220px] shadow-sm">
                <Plane size={18} className="text-[#E65100] mr-2 shrink-0" />
                <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="Número do voo (rastreio grátis)" className="w-full text-sm font-bold outline-none text-black placeholder:text-gray-400 placeholder:font-normal bg-transparent" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-white text-sm">
                <input type="checkbox" checked={needsChildSeat} onChange={(e) => setNeedsChildSeat(e.target.checked)} className="w-4 h-4 accent-[#E65100]" />
                Cadeirinha infantil
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-white text-sm">
                <input type="checkbox" checked={hasBabyStroller} onChange={(e) => setHasBabyStroller(e.target.checked)} className="w-4 h-4 accent-[#E65100]" />
                Carrinho de bebê
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
                <h3 className="font-bold text-lg mb-4 text-black">Resumo do trajeto</h3>
                <div className="relative pl-6 border-l-2 border-gray-200 space-y-6 mb-6">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 bg-white border-2 border-[#E65100] w-3 h-3 rounded-full"></div>
                    <p className="text-sm font-bold text-black">{searchResult.origemNome}</p>
                    <p className="text-xs font-semibold text-black mt-1">Ida: {date.split('-').reverse().join('/')} às {time}h</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 bg-[#E65100] w-3 h-3 rounded-full shadow-[0_0_0_2px_white]"></div>
                    <p className="text-sm font-bold text-black">{searchResult.destinoNome}</p>
                    {tripType === 'roundtrip' ? (
                      <p className="text-xs font-bold text-[#E65100] mt-1">Volta: {returnDate.split('-').reverse().join('/')} às {returnTime}h</p>
                    ) : (
                      <p className="text-xs font-semibold text-black mt-1">Estimativa: ~{searchResult.duracao} min</p>
                    )}
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded flex justify-between items-center border border-orange-100">
                  <span className="text-xs font-black text-[#E65100] uppercase">Distância da Rota</span>
                  <span className="text-lg font-black text-[#E65100]">{searchResult.distancia} km</span>
                </div>
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
                      <h4 className="text-xl font-black text-black mb-2">{v.name}</h4>
                      
                      <div className="mb-4 bg-gray-50 border border-gray-100 p-2.5 rounded-lg inline-block w-full md:w-auto">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Capacidade Máxima do Veículo:</span>
                        <div className="flex flex-wrap gap-4">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-700" title="Capacidade do Veículo"><Users size={16} className="text-[#E65100]"/> Até {v.pax} passageiros</span>
                          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-700" title="Capacidade do Porta-malas"><Briefcase size={16} className="text-[#E65100]"/> Até {v.bags} malas</span>
                        </div>
                      </div>

                      <div className="space-y-1 mt-2">
                        <p className="flex items-center gap-2 text-sm font-bold text-[#008009]"><Check size={16}/> Cancelamento grátis até 24h antes</p>
                        <p className="flex items-center gap-2 text-sm font-bold text-[#008009]"><Check size={16}/> Motorista com placa de identificação</p>
                        {needsChildSeat && <p className="flex items-center gap-2 text-sm font-bold text-[#008009]"><Check size={16}/> Cadeirinha Inclusa</p>}
                        {hasBabyStroller && <p className="flex items-center gap-2 text-sm font-bold text-[#00897B]"><Check size={16}/> Espaço para Carrinho</p>}
                      </div>
                    </div>
                  </div>

                  <div className="sm:w-[180px] flex flex-col justify-end sm:items-end border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-4 mt-2 sm:mt-0 shrink-0">
                    <div className="text-left sm:text-right mb-4">
                      {tripType === 'roundtrip' && <span className="text-[10px] bg-orange-100 text-[#E65100] px-2 py-0.5 rounded font-black uppercase mb-1 inline-block">Ida e Volta Inclusos</span>}
                      <p className="text-2xl font-black text-black">R$ {v.precoFinal}</p>
                      <p className="text-xs font-semibold text-black">Impostos inclusos</p>
                    </div>
                    
                    <button 
                      onClick={() => handleAddToCart(v)}
                      className="w-full bg-[#E65100] hover:bg-orange-700 text-white font-black py-2.5 rounded-lg shadow-sm transition-colors text-sm"
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