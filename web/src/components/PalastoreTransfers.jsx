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

      if (frotaFiltrada.length === 0) throw new Error(`Nenhum veículo suporta ${totalPax} passageiros com esse volume de bagagem. Divida o grupo ou contate-nos.`);

      setSearchResult({
        distancia: distanciaKm, duracao: duracaoMin, origemNome: pickupCoords.name, destinoNome: dropoffCoords.name,
        veiculos: frotaFiltrada.map(v => ({ ...v, precoFinal: calcularValorCarro(distanciaKm, v.multiplicador) }))
      });

    } catch (err) { setError(err.message || 'Erro ao calcular rota.'); } finally { setLoading(false); }
  };

  const handleAddToCart = (veiculo) => {
    try {
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

      const uniqueHash = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const cartItem = {
        _id: `transfer-${veiculo.id}-${uniqueHash}`,
        sku: `TRF-${veiculo.id}-${uniqueHash}`, 
        title: `Transfer VIP: ${veiculo.name}`,
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
            pickupName: searchResult.origemNome,
            dropoffName: searchResult.destinoNome,
            date: date.split('-').reverse().join('/'),
            time,
            returnDate: returnDate ? returnDate.split('-').reverse().join('/') : null,
            returnTime
        },
        addedAt: Date.now()
      };

      // 🚀 A TRAVA DE SEGURANÇA: Se estiver no modo pacote, atua aqui
      if (isPackageMode && typeof onSelectForPackage === 'function') {
        onSelectForPackage(cartItem);
        return; 
      }

      // Se não for pacote, envia pro carrinho
      addItem(cartItem);
      navigate('/cart');
    } catch (err) {
      alert("Ocorreu um erro ao montar seu transfer: " + err.message);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pb-20 bg-white font-sans">
      
      <div className="w-full relative flex justify-center px-2 pt-6 pb-10">
        <div className="relative z-10 w-full max-w-[1000px]">
          
          <form onSubmit={handleSearch} className="w-full bg-[#E65100] p-4 md:p-6 rounded-2xl shadow-xl flex flex-col gap-4">
            
            <div className="flex justify-center md:justify-start gap-3 mb-1">
              <button 
                type="button" 
                onClick={() => setTripType('oneway')} 
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${tripType === 'oneway' ? 'bg-white text-[#E65100] scale-105' : 'bg-white/20 text-white hover:bg-white/30'}`}
              >
                Só ida
              </button>
              <button 
                type="button" 
                onClick={() => setTripType('roundtrip')} 
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${tripType === 'roundtrip' ? 'bg-white text-[#E65100] scale-105' : 'bg-white/20 text-white hover:bg-white/30'}`}
              >
                Ida e volta
              </button>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"><AlertCircle size={18} />{error}</div>}

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 bg-white rounded-xl flex items-center px-4 h-14 shadow-sm border-2 border-transparent focus-within:border-orange-200 transition-all">
                <MapPin size={22} className="text-[#E65100] mr-3 shrink-0" />
                <input 
                  type="text" 
                  required 
                  value={pickupQuery} 
                  onChange={(e) => { setPickupQuery(e.target.value); setPickupCoords(null); }} 
                  placeholder="Aeroporto, hotel ou endereço de origem" 
                  className="w-full h-full text-base font-bold outline-none text-gray-800 placeholder:text-gray-400 placeholder:font-normal bg-transparent truncate" 
                />
                {pickupSuggestions.length > 0 && !pickupCoords && (
                  <ul className="absolute left-0 top-16 z-30 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {pickupSuggestions.map(place => ( 
                      <li key={place.place_id} onClick={() => { setPickupQuery(place.display_name.split(',')[0]); setPickupCoords({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',')[0] }); setPickupSuggestions([]); }} className="p-4 border-b text-sm font-bold cursor-pointer hover:bg-orange-50 text-gray-800 transition-colors">
                        {place.display_name}
                      </li> 
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative flex-1 bg-white rounded-xl flex items-center px-4 h-14 shadow-sm border-2 border-transparent focus-within:border-orange-200 transition-all">
                <MapPin size={22} className="text-[#E65100] mr-3 shrink-0" />
                <input 
                  type="text" 
                  required 
                  value={dropoffQuery} 
                  onChange={(e) => { setDropoffQuery(e.target.value); setDropoffCoords(null); }} 
                  placeholder="Destino final" 
                  className="w-full h-full text-base font-bold outline-none text-gray-800 placeholder:text-gray-400 placeholder:font-normal bg-transparent truncate" 
                />
                {dropoffSuggestions.length > 0 && !dropoffCoords && (
                  <ul className="absolute left-0 top-16 z-30 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {dropoffSuggestions.map(place => ( 
                      <li key={place.place_id} onClick={() => { setDropoffQuery(place.display_name.split(',')[0]); setDropoffCoords({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',')[0] }); setDropoffSuggestions([]); }} className="p-4 border-b text-sm font-bold cursor-pointer hover:bg-orange-50 text-gray-800 transition-colors">
                        {place.display_name}
                      </li> 
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-3 mt-3">
              <div 
                onClick={(e) => { const input = e.currentTarget.querySelector('input[type="date"]'); if(input && input.showPicker) input.showPicker(); }}
                className="flex bg-white rounded-xl h-14 flex-1 relative shadow-sm border-2 border-transparent focus-within:border-orange-200 transition-all cursor-pointer items-center"
              >
                <div className="absolute -top-3 left-4 bg-[#1e293b] text-white px-2 py-0.5 text-[10px] font-black uppercase rounded shadow-sm tracking-widest">Partida (Mín. 48h)</div>
                <div className="flex-1 flex items-center px-4 border-r border-gray-100 h-full">
                  <Calendar size={20} className="text-[#E65100] mr-2 shrink-0 pointer-events-none"/>
                  <input type="date" required min={minDepartureDate} value={date} onChange={(e) => { setDate(e.target.value); if (returnDate && e.target.value > returnDate) setReturnDate(''); }} className="w-full text-sm md:text-base font-bold outline-none text-gray-800 bg-transparent cursor-pointer" />
                </div>
                <div className="w-[120px] md:w-[140px] flex items-center px-3 h-full" onClick={(e) => e.stopPropagation()}>
                  <Clock size={20} className="text-[#E65100] mr-1 shrink-0"/>
                  <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="w-full text-sm md:text-base font-bold outline-none text-gray-800 bg-transparent cursor-pointer" />
                </div>
              </div>

              {tripType === 'roundtrip' && (
                <div 
                  onClick={(e) => { const input = e.currentTarget.querySelector('input[type="date"]'); if(input && input.showPicker) input.showPicker(); }}
                  className="flex bg-white rounded-xl h-14 flex-1 relative shadow-sm border-2 border-transparent focus-within:border-orange-200 transition-all cursor-pointer items-center"
                >
                  <div className="absolute -top-3 left-4 bg-[#1e293b] text-white px-2 py-0.5 text-[10px] font-black uppercase rounded shadow-sm tracking-widest">Retorno</div>
                  <div className="flex-1 flex items-center px-4 border-r border-gray-100 h-full">
                    <Calendar size={20} className="text-[#E65100] mr-2 shrink-0 pointer-events-none"/>
                    <input type="date" required min={date || minDepartureDate} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full text-sm md:text-base font-bold outline-none text-gray-800 bg-transparent cursor-pointer" />
                  </div>
                  <div className="w-[120px] md:w-[140px] flex items-center px-3 h-full" onClick={(e) => e.stopPropagation()}>
                    <Clock size={20} className="text-[#E65100] mr-1 shrink-0"/>
                    <input type="time" required value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="w-full text-sm md:text-base font-bold outline-none text-gray-800 bg-transparent cursor-pointer" />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
              <div className="bg-white rounded-xl h-14 px-4 flex items-center justify-between shadow-sm">
                <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><Users size={18} className="text-[#E65100]"/> Adultos</span>
                <select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="font-black text-base text-gray-900 bg-gray-50 px-2 py-1.5 rounded-lg outline-none cursor-pointer">
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-xl h-14 px-4 flex items-center justify-between shadow-sm">
                <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><Baby size={18} className="text-[#E65100]"/> Crianças</span>
                <select value={children} onChange={(e) => setChildren(Number(e.target.value))} className="font-black text-base text-gray-900 bg-gray-50 px-2 py-1.5 rounded-lg outline-none cursor-pointer">
                  {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-xl h-14 px-4 flex items-center justify-between shadow-sm">
                <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><Briefcase size={18} className="text-[#E65100]"/> Mala G</span>
                <select value={largeBags} onChange={(e) => setLargeBags(Number(e.target.value))} className="font-black text-base text-gray-900 bg-gray-50 px-2 py-1.5 rounded-lg outline-none cursor-pointer">
                  {[0,1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-xl h-14 px-4 flex items-center justify-between shadow-sm">
                <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><Luggage size={18} className="text-[#E65100]"/> Mala P</span>
                <select value={smallBags} onChange={(e) => setSmallBags(Number(e.target.value))} className="font-black text-base text-gray-900 bg-gray-50 px-2 py-1.5 rounded-lg outline-none cursor-pointer">
                  {[0,1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3 md:gap-4 mt-2 bg-white/10 p-4 rounded-2xl border border-white/20">
              <div className="bg-white rounded-xl h-14 md:h-12 px-4 flex items-center flex-1 min-w-full md:min-w-[250px] shadow-sm border-2 border-transparent focus-within:border-orange-300 transition-all">
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

            <button type="submit" disabled={loading} className="mt-2 bg-[#1e293b] hover:bg-black text-white font-black h-14 md:h-16 px-10 rounded-xl text-lg transition-colors w-full shadow-xl flex items-center justify-center gap-2">
              {loading ? 'Calculando Rota...' : 'Pesquisar Transfers'}
            </button>

          </form>
        </div>
      </div>

      <div className="w-full max-w-[1000px] px-4 mt-4">
        {searchResult && (
          <div className="flex flex-col gap-4 w-full">
            <h3 className="font-black text-xl text-gray-900 mb-2">Veículos Disponíveis para o Trajeto</h3>
            {searchResult.veiculos.map((v) => (
              <div key={v.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 shadow-sm hover:shadow-lg transition-all items-center">
                <div className="w-full sm:w-[180px] p-2 bg-gray-50 rounded-xl flex items-center justify-center">
                  <img src={v.image} alt={v.name} className="h-20 object-contain" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-black text-gray-900 mb-1">{v.name}</h4>
                  <p className="text-xs font-bold text-gray-600">Até {v.pax} passageiros e {v.bags} malas</p>
                  <p className="text-xs font-bold text-green-700 mt-2">✓ Cancelamento grátis • Placa no desembarque</p>
                </div>
                <div className="sm:w-[180px] text-right flex flex-col items-end shrink-0">
                  <p className="text-2xl font-black text-gray-900 mb-2">R$ {v.precoFinal}</p>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); handleAddToCart(v); }}
                    className="w-full bg-[#E65100] hover:bg-orange-700 text-white font-black py-3.5 rounded-xl shadow transition text-xs uppercase tracking-wide"
                  >
                    {isPackageMode ? 'Adicionar ao Pacote' : 'Reservar Agora'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}