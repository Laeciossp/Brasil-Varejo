import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/useCartStore'; 
import { MapPin, Calendar, Clock, Users, Briefcase, Check, AlertCircle, Plane, Baby, Luggage, Globe, ThumbsUp, Map } from 'lucide-react';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const formatRouteDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00'); 
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');
  } catch (e) {
    return dateStr;
  }
};

export default function PalastoreTransfers({ isPackageMode, pacoteParams, onSelectForPackage }) {
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

  const [date, setDate] = useState(pacoteParams?.dateOut || '');
  const [time, setTime] = useState('12:00');
  const [returnDate, setReturnDate] = useState(pacoteParams?.dateIn || '');
  const [returnTime, setReturnTime] = useState('12:00');
  
  const [flightNumber, setFlightNumber] = useState('');
  const [needsChildSeat, setNeedsChildSeat] = useState(false);
  const [hasBabyStroller, setHasBabyStroller] = useState(false);
  
  const [adults, setAdults] = useState(pacoteParams?.adults || 1);
  const [children, setChildren] = useState(0);
  const [largeBags, setLargeBags] = useState(1); 
  const [smallBags, setSmallBags] = useState(0); 
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [routeTab, setRouteTab] = useState('ida'); 

  const COTACAO_EURO = 6.00; 
  const TARIFA_EUR_KM = 1.0;
  const MINIMO_EUR = 25.0;

  const COTACAO_USD = 5.50; 
  const TARIFA_USD_KM = 5.0; 
  const MINIMO_USD = 50.0;   

  useEffect(() => {
    let isMounted = true;
    if (debouncedPickup && debouncedPickup.length > 2 && !pickupCoords) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(debouncedPickup)}&limit=5`)
        .then(res => res.json())
        .then(data => { if (isMounted) setPickupSuggestions(data || []); })
        .catch(() => { if (isMounted) setPickupSuggestions([]); });
    } else { setPickupSuggestions([]); }
    return () => { isMounted = false; };
  }, [debouncedPickup, pickupCoords]);

  useEffect(() => {
    let isMounted = true;
    if (debouncedDropoff && debouncedDropoff.length > 2 && !dropoffCoords) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(debouncedDropoff)}&limit=5`)
        .then(res => res.json())
        .then(data => { if (isMounted) setDropoffSuggestions(data || []); })
        .catch(() => { if (isMounted) setDropoffSuggestions([]); });
    } else { setDropoffSuggestions([]); }
    return () => { isMounted = false; };
  }, [debouncedDropoff, dropoffCoords]);

  const calcularValorCarro = (distanciaKm, multiplicadorCategoria, isInternational) => {
    let valorFinalReais = 0;

    if (isInternational) {
      let valorDolar = Math.max(MINIMO_USD * multiplicadorCategoria, distanciaKm * (TARIFA_USD_KM * multiplicadorCategoria));
      valorFinalReais = Math.ceil(valorDolar * COTACAO_USD);
    } else {
      let valorEuro = Math.max(MINIMO_EUR * multiplicadorCategoria, distanciaKm * (TARIFA_EUR_KM * multiplicadorCategoria));
      valorFinalReais = Math.ceil(valorEuro * COTACAO_EURO);
    }

    if (tripType === 'roundtrip') valorFinalReais = valorFinalReais * 2; 
    return valorFinalReais;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearchResult(null);
    setRouteTab('ida'); 

    const totalPax = Number(adults) + Number(children);
    
    // Lógica de Bagagem
    const malasG = Number(largeBags);
    const malasP = Number(smallBags);
    const excedenteMalaP = Math.max(0, malasP - totalPax); 
    const pesoBagagemEquivalente = malasG + (excedenteMalaP * 0.5) + (hasBabyStroller ? 1 : 0);

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

      const isInternational = pickupCoords.country_code !== 'br' || dropoffCoords.country_code !== 'br';

      const frotaCompleta = [
        { id: '1', name: 'Padrão', pax: 3, bags: 3, multiplicador: 1.0, image: '/images/executivo.svg' },
        { id: '3', name: 'Minivan', pax: 4, bags: 4, multiplicador: 1.4, image: '/images/minivan.svg' },
        { id: '2', name: 'Executivo VIP', pax: 3, bags: 3, multiplicador: 1.5, image: '/images/luxo.svg' },
        { id: '4', name: 'Van', pax: 7, bags: 7, multiplicador: 2.0, image: '/images/van.svg' },
        { id: '5', name: 'Micro-ônibus', pax: 12, bags: 12, multiplicador: 3.5, image: '/images/Micro-onibus.svg' }
      ];

      const frotaFiltrada = frotaCompleta.filter(veiculo => veiculo.pax >= totalPax && veiculo.bags >= pesoBagagemEquivalente);

      if (frotaFiltrada.length === 0) throw new Error(`Nenhum veículo suporta ${totalPax} passageiros com esse volume de bagagens grandes.`);

      setSearchResult({
        distancia: distanciaKm, 
        duracao: duracaoMin, 
        origemNome: pickupCoords.name, 
        origemFullName: pickupCoords.fullName, // Envia o nome completo para o box
        destinoNome: dropoffCoords.name,
        destinoFullName: dropoffCoords.fullName, // Envia o nome completo para o box
        isInternational,
        veiculos: frotaFiltrada.map(v => ({ 
          ...v, 
          precoFinal: calcularValorCarro(distanciaKm, v.multiplicador, isInternational) 
        }))
      });

    } catch (err) { setError(err.message || 'Erro ao calcular rota.'); } finally { setLoading(false); }
  };

  const handleAddToCart = (veiculo) => {
    try {
      const totalPax = Number(adults) + Number(children);
      
      let descriptionText = `TRANSFER ${tripType === 'roundtrip' ? 'IDA E VOLTA' : 'SÓ IDA'} (${searchResult.isInternational ? '🌍 INTERNACIONAL - USD' : '🇧🇷 NACIONAL - EUR'})\n`;
      descriptionText += `📍 De: ${searchResult.origemFullName}\n`;
      descriptionText += `🏁 Para: ${searchResult.destinoFullName}\n`;
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

      const uniqueHash = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const cartItem = {
        _id: `transfer-${veiculo.id}-${uniqueHash}`,
        sku: `TRF-${veiculo.id}-${uniqueHash}`, 
        title: `Transfer VIP${searchResult.isInternational ? ' Internacional' : ''}: ${veiculo.name}`,
        name: `Transfer VIP: ${veiculo.name} (${tripType === 'roundtrip' ? 'Ida e Volta' : 'Só Ida'})`,
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
            pickupName: searchResult.origemFullName, // Salva o nome completo
            dropoffName: searchResult.destinoFullName, // Salva o nome completo
            date: date.split('-').reverse().join('/'),
            time,
            returnDate: returnDate ? returnDate.split('-').reverse().join('/') : null,
            returnTime
        },
        addedAt: Date.now()
      };

      if (isPackageMode && typeof onSelectForPackage === 'function') {
        onSelectForPackage(cartItem);
        return; 
      }

      addItem(cartItem);
      navigate('/cart');
    } catch (err) {
      alert("Ocorreu um erro ao montar seu transfer: " + err.message);
    }
  };

  return (
    <div className="w-full flex flex-col items-center bg-gray-50 font-sans min-h-screen pb-20">
      
      {/* HEADER DE BUSCA LARANJA */}
      <div className="w-full relative flex justify-center px-4 pt-6 pb-6">
        <div className="relative z-10 w-full max-w-[1100px]">
          <form onSubmit={handleSearch} className="w-full bg-[#E65100] p-4 md:p-6 rounded-2xl shadow-xl flex flex-col gap-4">
            
            <div className="flex justify-between items-center mb-1">
              <div className="flex gap-3 bg-white/20 p-1 rounded-full">
                <button type="button" onClick={() => setTripType('oneway')} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${tripType === 'oneway' ? 'bg-white text-[#E65100] shadow-sm' : 'text-white hover:bg-white/10'}`}>
                  Só ida
                </button>
                <button type="button" onClick={() => setTripType('roundtrip')} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${tripType === 'roundtrip' ? 'bg-white text-[#E65100] shadow-sm' : 'text-white hover:bg-white/10'}`}>
                  Ida e volta
                </button>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-white/90 text-xs font-bold bg-black/20 px-3 py-1.5 rounded-full">
                <Globe size={14} className="text-orange-200" /> Busca Global Integrada
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"><AlertCircle size={18} />{error}</div>}

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 bg-white rounded-xl flex items-center px-4 h-14 shadow-sm focus-within:ring-2 ring-orange-300 transition-all">
                <MapPin size={22} className="text-gray-400 mr-3 shrink-0" />
                <input type="text" required value={pickupQuery} onChange={(e) => { setPickupQuery(e.target.value); setPickupCoords(null); }} placeholder="Local de início (Aeroporto, hotel...)" className="w-full h-full text-sm font-bold outline-none text-gray-900 placeholder:text-gray-500 bg-transparent truncate" />
                {pickupSuggestions.length > 0 && !pickupCoords && (
                  <ul className="absolute left-0 top-16 z-30 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {pickupSuggestions.map(place => (
                      <li key={place.place_id} onClick={() => { 
                        setPickupQuery(place.display_name.split(',')[0]); 
                        setPickupCoords({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',')[0], fullName: place.display_name, country_code: place.address?.country_code || '' }); 
                        setPickupSuggestions([]); 
                      }} className="p-4 border-b text-sm font-bold cursor-pointer hover:bg-gray-50 text-gray-800 transition-colors flex justify-between items-center">
                        <span className="truncate">{place.display_name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative flex-1 bg-white rounded-xl flex items-center px-4 h-14 shadow-sm focus-within:ring-2 ring-orange-300 transition-all">
                <MapPin size={22} className="text-gray-400 mr-3 shrink-0" />
                <input type="text" required value={dropoffQuery} onChange={(e) => { setDropoffQuery(e.target.value); setDropoffCoords(null); }} placeholder="Destino (Hotel, endereço...)" className="w-full h-full text-sm font-bold outline-none text-gray-900 placeholder:text-gray-500 bg-transparent truncate" />
                {dropoffSuggestions.length > 0 && !dropoffCoords && (
                  <ul className="absolute left-0 top-16 z-30 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {dropoffSuggestions.map(place => (
                      <li key={place.place_id} onClick={() => { 
                        setDropoffQuery(place.display_name.split(',')[0]); 
                        setDropoffCoords({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',')[0], fullName: place.display_name, country_code: place.address?.country_code || '' }); 
                        setDropoffSuggestions([]); 
                      }} className="p-4 border-b text-sm font-bold cursor-pointer hover:bg-gray-50 text-gray-800 transition-colors flex justify-between items-center">
                        <span className="truncate">{place.display_name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-3 mt-1">
              <div onClick={(e) => { const input = e.currentTarget.querySelector('input[type="date"]'); if(input && input.showPicker) input.showPicker(); }} className="flex bg-white rounded-xl h-14 flex-1 relative shadow-sm transition-all cursor-pointer items-center border border-transparent focus-within:border-[#4C1D95]">
                <div className="absolute -top-2.5 left-4 bg-[#1e293b] text-white px-2 py-0 text-[10px] font-bold uppercase rounded shadow-sm">Partida</div>
                <div className="flex-1 flex items-center px-4 border-r border-gray-200 h-full">
                  <Calendar size={18} className="text-gray-500 mr-2 shrink-0 pointer-events-none"/>
                  <input type="date" required min={minDepartureDate} value={date} onChange={(e) => { setDate(e.target.value); if (returnDate && e.target.value > returnDate) setReturnDate(''); }} className="w-full text-sm font-bold outline-none text-gray-900 bg-transparent cursor-pointer" />
                </div>
                <div className="w-[110px] flex items-center px-3 h-full" onClick={(e) => e.stopPropagation()}>
                  <Clock size={18} className="text-gray-500 mr-1 shrink-0"/>
                  <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="w-full text-sm font-bold outline-none text-gray-900 bg-transparent cursor-pointer" />
                </div>
              </div>

              {tripType === 'roundtrip' && (
                <div onClick={(e) => { const input = e.currentTarget.querySelector('input[type="date"]'); if(input && input.showPicker) input.showPicker(); }} className="flex bg-white rounded-xl h-14 flex-1 relative shadow-sm transition-all cursor-pointer items-center border border-transparent focus-within:border-[#4C1D95]">
                  <div className="absolute -top-2.5 left-4 bg-[#1e293b] text-white px-2 py-0 text-[10px] font-bold uppercase rounded shadow-sm">Retorno</div>
                  <div className="flex-1 flex items-center px-4 border-r border-gray-200 h-full">
                    <Calendar size={18} className="text-gray-500 mr-2 shrink-0 pointer-events-none"/>
                    <input type="date" required min={date || minDepartureDate} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full text-sm font-bold outline-none text-gray-900 bg-transparent cursor-pointer" />
                  </div>
                  <div className="w-[110px] flex items-center px-3 h-full" onClick={(e) => e.stopPropagation()}>
                    <Clock size={18} className="text-gray-500 mr-1 shrink-0"/>
                    <input type="time" required value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="w-full text-sm font-bold outline-none text-gray-900 bg-transparent cursor-pointer" />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-1">
              <div className="bg-white rounded-xl h-14 px-4 flex items-center justify-between shadow-sm">
                <span className="text-sm font-bold text-gray-600 flex items-center gap-2"><Users size={18}/> Adultos</span>
                <select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="font-black text-base text-gray-900 bg-gray-50 px-2 py-1.5 rounded-lg outline-none cursor-pointer">
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-xl h-14 px-4 flex items-center justify-between shadow-sm">
                <span className="text-sm font-bold text-gray-600 flex items-center gap-2"><Baby size={18}/> Crianças</span>
                <select value={children} onChange={(e) => setChildren(Number(e.target.value))} className="font-black text-base text-gray-900 bg-gray-50 px-2 py-1.5 rounded-lg outline-none cursor-pointer">
                  {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-xl h-14 px-4 flex items-center justify-between shadow-sm">
                <span className="text-sm font-bold text-gray-600 flex items-center gap-2"><Briefcase size={18}/> Mala G</span>
                <select value={largeBags} onChange={(e) => setLargeBags(Number(e.target.value))} className="font-black text-base text-gray-900 bg-gray-50 px-2 py-1.5 rounded-lg outline-none cursor-pointer">
                  {[0,1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-xl h-14 px-4 flex items-center justify-between shadow-sm">
                <span className="text-sm font-bold text-gray-600 flex items-center gap-2"><Luggage size={18}/> Mala P</span>
                <select value={smallBags} onChange={(e) => setSmallBags(Number(e.target.value))} className="font-black text-base text-gray-900 bg-gray-50 px-2 py-1.5 rounded-lg outline-none cursor-pointer">
                  {[0,1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3 md:gap-4 mt-2 bg-white/10 p-4 rounded-2xl border border-white/20">
              <div className="bg-white rounded-xl h-14 md:h-12 px-4 flex items-center flex-1 min-w-full md:min-w-[250px] shadow-sm border-2 border-transparent focus-within:border-[#4C1D95] transition-all">
                <Plane size={20} className="text-[#E65100] mr-3 shrink-0" />
                <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="Número do voo (rastreio grátis)" className="w-full text-base font-bold outline-none text-gray-800 placeholder:text-gray-400 placeholder:font-normal bg-transparent" />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-3 cursor-pointer font-bold text-white text-base select-none bg-black/20 px-4 py-3 md:py-2.5 rounded-xl hover:bg-black/30 transition-colors">
                  <input type="checkbox" checked={needsChildSeat} onChange={(e) => setNeedsChildSeat(e.target.checked)} className="w-5 h-5 accent-[#E65100] rounded" />
                  Cadeirinha infantil
                </label>
                <label className="flex items-center gap-3 cursor-pointer font-bold text-white text-base select-none bg-black/20 px-4 py-3 md:py-2.5 rounded-xl hover:bg-black/30 transition-colors">
                  <input type="checkbox" checked={hasBabyStroller} onChange={(e) => setHasBabyStroller(e.target.checked)} className="w-5 h-5 accent-[#E65100] rounded" />
                  Carrinho de bebê
                </label>
              </div>
            </div>

            <button type="submit" disabled={loading} className="mt-2 bg-[#4C1D95] hover:bg-purple-900 text-white font-black h-14 rounded-xl text-lg transition-colors w-full shadow-md flex items-center justify-center gap-2">
              {loading ? 'Calculando Rota...' : 'Pesquisar Transfers'}
            </button>

          </form>
        </div>
      </div>

      {/* ÁREA DE RESULTADOS (GRID MASTER-DETAIL) */}
      {searchResult && (
        <div className="w-full max-w-[1100px] mx-auto px-4 flex flex-col lg:flex-row gap-8 items-start mt-4 mb-12">
          
          {/* COLUNA ESQUERDA: LISTA DE VEÍCULOS */}
          <div className="flex-1 w-full flex flex-col gap-4">
            <div className="mb-2">
              <h2 className="text-xl font-black text-gray-900">Opções para {Number(adults) + Number(children)} passageiros</h2>
              <p className="text-sm text-gray-500 mt-1">
                Na próxima etapa, vamos finalizar a reserva do seu veículo local.
                {searchResult.isInternational && <span className="ml-2 inline-block bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Tarifa Int. (USD)</span>}
              </p>
            </div>

            {searchResult.veiculos.map((v) => (
              <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row gap-6 shadow-sm hover:shadow-md hover:border-[#4C1D95] transition-all items-center">
                
                {/* Imagem do Carro */}
                <div className="w-full sm:w-[140px] flex justify-center shrink-0">
                  <img src={v.image} alt={v.name} className="h-16 object-contain" />
                </div>
                
                {/* Infos do Carro */}
                <div className="flex-1 w-full text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                    <h4 className="text-lg font-black text-gray-900">{v.name}</h4>
                    <div className="flex items-center justify-center gap-3 text-xs font-bold text-gray-600">
                      <span className="flex items-center gap-1"><Users size={14}/> {v.pax} lugares</span>
                      <span className="flex items-center gap-1"><Briefcase size={14}/> {v.bags} malas</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center sm:items-start gap-1.5">
                    <p className="text-xs font-medium text-gray-700 flex items-center gap-2">
                      <Check size={14} className="text-green-600"/> Cancelamento grátis
                    </p>
                    <p className="text-xs font-medium text-gray-700 flex items-center gap-2">
                      <ThumbsUp size={14} className="text-[#4C1D95]"/> Motoristas confiáveis e placa de recepção
                    </p>
                  </div>
                </div>

                {/* Preço e Botão */}
                <div className="w-full sm:w-[160px] flex flex-col items-center sm:items-end shrink-0 border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0">
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">
                    Preço total {tripType === 'roundtrip' ? 'ida e volta' : 'só ida'}
                  </p>
                  <p className="text-2xl font-black text-gray-900 mb-3">R$ {v.precoFinal}</p>
                  
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); handleAddToCart(v); }}
                    className="w-full bg-[#4C1D95] hover:bg-purple-900 text-white font-bold py-2.5 rounded-md shadow-sm transition text-sm tracking-wide"
                  >
                    {isPackageMode ? 'Adicionar pacote' : 'Selecionar'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* COLUNA DIREITA: SEU TRAJETO (BOX FLUTUANTE) */}
          <div className="w-full lg:w-[320px] shrink-0 sticky top-24 flex flex-col gap-4">
            
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-black text-lg text-gray-900 mb-4">Seu trajeto</h3>
                
                {/* Abas Ida/Volta se for roundtrip */}
                {tripType === 'roundtrip' && (
                  <div className="flex border-b border-gray-200 mb-5">
                    <button onClick={() => setRouteTab('ida')} className={`pb-2 px-2 text-sm font-bold transition-all ${routeTab === 'ida' ? 'text-[#4C1D95] border-b-2 border-[#4C1D95]' : 'text-gray-500 hover:text-gray-800'}`}>Ida</button>
                    <button onClick={() => setRouteTab('volta')} className={`pb-2 px-4 text-sm font-bold transition-all ${routeTab === 'volta' ? 'text-[#4C1D95] border-b-2 border-[#4C1D95]' : 'text-gray-500 hover:text-gray-800'}`}>Volta</button>
                  </div>
                )}

                {/* TIMELINE DE ROTA */}
                <div className="relative pl-5 border-l-2 border-dashed border-gray-300 ml-2 space-y-6">
                  
                  {/* Ponto Origem */}
                  <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 bg-white border-2 border-gray-800 rounded-full"></div>
                    <p className="text-[11px] font-bold text-gray-500 lowercase">
                      {routeTab === 'ida' ? formatRouteDate(date) : formatRouteDate(returnDate)} • {routeTab === 'ida' ? time : returnTime}
                    </p>
                    <p className="text-xs font-bold text-gray-900 leading-tight mt-1 break-words pr-2">
                      {routeTab === 'ida' ? searchResult.origemFullName : searchResult.destinoFullName}
                    </p>
                  </div>

                  {/* Ponto Destino */}
                  <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 bg-white border-2 border-gray-800 rounded-full"></div>
                    <p className="text-xs font-bold text-gray-900 leading-tight break-words pr-2">
                      {routeTab === 'ida' ? searchResult.destinoFullName : searchResult.origemFullName}
                    </p>
                  </div>

                </div>

                {/* Tempo e Distância */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-start gap-3 text-gray-800">
                  <Map size={18} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Detalhes da corrida</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Cerca de {searchResult.duracao} min ({searchResult.distancia} km)</p>
                  </div>
                </div>

              </div>
            </div>

            {/* BOX DE POLÍTICAS */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <h4 className="font-bold text-base text-gray-900 mb-3">Políticas</h4>
              <div className="flex items-start gap-3">
                <Check size={18} className="text-green-600 shrink-0 mt-0.5"/>
                <div>
                  <p className="text-sm font-bold text-gray-900">Cancelamento grátis</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">Cancele de graça até 24 horas antes do horário programado para a partida.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}