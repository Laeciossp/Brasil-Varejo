import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/useCartStore';

const WORKER_URL = "https://palastore-flights-api.laeciossp.workers.dev";

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatDateBr = (dateStr) => {
  const d = new Date(dateStr);
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return `${dias[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// COMPONENTE COUNTER MAIS COMPACTO
const Counter = ({ label, subLabel, value, onChange, min = 0, max = 9, icon }) => {
  const handleDec = () => onChange(Math.max(min, parseInt(value, 10) - 1));
  const handleInc = () => onChange(Math.min(max, parseInt(value, 10) + 1));
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400 text-sm">{icon}</span>}
        <div>
          <div className="text-xs font-bold text-gray-800 leading-none">{label}</div>
          {subLabel && <div className="text-[9px] text-gray-500 mt-0.5">{subLabel}</div>}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={handleDec} disabled={parseInt(value, 10) <= min} className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-purple-600 hover:text-purple-600 disabled:opacity-30 transition text-sm pb-0.5">-</button>
        <input type="text" readOnly value={parseInt(value, 10) || 0} className="w-4 text-center font-bold text-xs text-gray-800 outline-none select-none bg-transparent" />
        <button onClick={handleInc} disabled={parseInt(value, 10) >= max} className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-purple-600 hover:text-purple-600 disabled:opacity-30 transition text-sm pb-0.5">+</button>
      </div>
    </div>
  );
};

const FlightLegDetails = ({ trecho }) => (
  <div className="relative pl-6 py-2 border-l-2 border-purple-300 ml-4 mb-4">
    <div className="absolute w-3 h-3 bg-purple-600 rounded-full -left-[7px] top-1"></div>
    <div className="flex justify-between items-start mb-2">
      <div>
        <span className="text-xl font-bold text-gray-900">{formatTime(trecho.partida)}</span>
        <span className="text-sm text-gray-500 ml-2">{formatDateBr(trecho.partida)}</span>
      </div>
      <span className="text-sm font-bold text-gray-700">{trecho.origemNome} ∙ {trecho.origemAero}</span>
    </div>
    <div className="bg-gray-50 p-4 rounded-lg my-4 border border-gray-100 flex flex-col md:flex-row gap-6">
      <div className="flex items-center gap-3">
        {trecho.companhia && <img src={`https://images.kiwi.com/airlines/64x64/${trecho.companhia}.png`} alt="Cia" className="w-8 h-8 rounded" />}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Voo / Operadora</p>
          <p className="text-sm font-bold text-purple-700">{trecho.vooNumero}</p>
        </div>
      </div>
      <div className="hidden md:block w-px bg-gray-200"></div>
      <div className="flex-1 grid grid-cols-2 gap-y-2 text-xs text-gray-600">
        <p><strong className="text-gray-800">Espaço do lugar:</strong> 76 cm</p>
        <p><strong className="text-gray-800">Largura:</strong> 43 cm</p>
        <p><strong className="text-gray-800">Reclinação:</strong> 7 cm</p>
        <p><strong className="text-gray-800">Wi-Fi a bordo:</strong> Sim</p>
      </div>
    </div>
    <div className="absolute w-3 h-3 bg-white border-2 border-purple-600 rounded-full -left-[7px] bottom-1"></div>
    <div className="flex justify-between items-end mt-2">
      <div>
        <span className="text-xl font-bold text-gray-900">{formatTime(trecho.chegada)}</span>
        <span className="text-sm text-gray-500 ml-2">{formatDateBr(trecho.chegada)}</span>
      </div>
      <span className="text-sm font-bold text-gray-700">{trecho.destinoNome} ∙ {trecho.destinoAero}</span>
    </div>
  </div>
);

export default function FlightSearch({ prefilledData }) {
  const navigate = useNavigate();
  const { addItem, clearCart } = useCartStore();

  const [tripType, setTripType] = useState('return');
  const [cabin, setCabin] = useState('M');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [holdBagsIda, setHoldBagsIda] = useState(0);
  const [holdBagsVolta, setHoldBagsVolta] = useState(0);

  const [sortConfig, setSortConfig] = useState('price'); 
  const [stopsConfig, setStopsConfig] = useState('all'); 
  const [allowOvernight, setAllowOvernight] = useState(true);

  const [showTripMenu, setShowTripMenu] = useState(false);
  const [showPaxMenu, setShowPaxMenu] = useState(false);
  const [showCabinMenu, setShowCabinMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  const [origin, setOrigin] = useState({ id: 'GRU', name: 'São Paulo' });
  const [originQuery, setOriginQuery] = useState('');
  const [originResults, setOriginResults] = useState([]);
  const [showOrigin, setShowOrigin] = useState(false);

  const [destinations, setDestinations] = useState([{ id: 'SSA', name: 'Salvador' }]);
  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState([]);
  const [showDest, setShowDest] = useState(false);

  const [dateType, setDateType] = useState('anytime'); 
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [renderedFlights, setRenderedFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedFlight, setExpandedFlight] = useState(null);
  const [checkoutModal, setCheckoutModal] = useState(null);

  const [lastSearchedPax, setLastSearchedPax] = useState(1);
  const [lastAdultsCount, setLastAdultsCount] = useState(1);
  const [lastChildrenCount, setLastChildrenCount] = useState(0);
  const [lastInfantsCount, setLastInfantsCount] = useState(0);
  const [lastHoldIdaCount, setLastHoldIdaCount] = useState(0);
  const [lastHoldVoltaCount, setLastHoldVoltaCount] = useState(0);

  const tripRef = useRef(null);
  const paxRef = useRef(null);
  const cabinRef = useRef(null);
  const originRef = useRef(null);
  const destRef = useRef(null);
  const dateRef = useRef(null);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getSixMonthsStr = () => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().split('T')[0]; };

  // ==================================================================
  // OUVINTE INTELIGENTE: Dispara quando o usuário clica num card de oferta
  // ==================================================================
  // OUVINTE INTELIGENTE: Dispara quando o usuário clica num card de oferta
  useEffect(() => {
    if (prefilledData && prefilledData.destino) {
      const destId = prefilledData.destino;
      
      setDestinations([{ id: destId, name: destId }]);

      if (prefilledData.dataIda) {
        setDateType('specific');
        setDateFrom(prefilledData.dataIda);
        if (prefilledData.dataVolta) {
          setDateTo(prefilledData.dataVolta);
          setTripType('return');
        } else {
          setTripType('oneway');
        }
      }

      // CORREÇÃO DO SCROLL: Rola a página direto para o buscador/resultados (evita o topo/banner)
      window.scrollTo({ top: 250, behavior: 'smooth' });

      // Dispara a pesquisa automaticamente
      setTimeout(() => {
        executeSearch(null, sortConfig, stopsConfig, destId, prefilledData.dataIda, prefilledData.dataVolta);
      }, 200);
    }
  }, [prefilledData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tripRef.current && !tripRef.current.contains(e.target)) setShowTripMenu(false);
      if (paxRef.current && !paxRef.current.contains(e.target)) setShowPaxMenu(false);
      if (cabinRef.current && !cabinRef.current.contains(e.target)) setShowCabinMenu(false);
      if (originRef.current && !originRef.current.contains(e.target)) setShowOrigin(false);
      if (destRef.current && !destRef.current.contains(e.target)) setShowDest(false);
      if (dateRef.current && !dateRef.current.contains(e.target)) setShowDateMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (originQuery.trim().length >= 2) {
        try {
          const res = await fetch(`${WORKER_URL}/locations?term=${encodeURIComponent(originQuery.trim())}`);
          const data = await res.json();
          setOriginResults(data.locations || []);
          if(data.locations?.length > 0) setShowOrigin(true);
        } catch (e) {}
      } else { setOriginResults([]); }
    }, 400);
    return () => clearTimeout(timer);
  }, [originQuery]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (destQuery.trim().length >= 2) {
        try {
          const res = await fetch(`${WORKER_URL}/locations?term=${encodeURIComponent(destQuery.trim())}`);
          const data = await res.json();
          setDestResults(data.locations || []);
          if(data.locations?.length > 0) setShowDest(true);
        } catch (e) {}
      } else { setDestResults([]); }
    }, 400);
    return () => clearTimeout(timer);
  }, [destQuery]);

  const hasOvernightLayover = (voo) => {
    if (!voo || !voo.ida) return false;
    const checkLegs = (trechos) => {
      if (!trechos) return false;
      for (let i = 0; i < trechos.length - 1; i++) {
        const arrival = new Date(trechos[i].chegada);
        const nextDeparture = new Date(trechos[i+1].partida);
        if (arrival.getDate() !== nextDeparture.getDate()) return true;
      }
      return false;
    };
    if (checkLegs(voo.ida.trechos)) return true;
    if (voo.volta && checkLegs(voo.volta.trechos)) return true;
    return false;
  };

  const executeSearch = async (e, overrideSort = sortConfig, overrideStops = stopsConfig, customDest = null, customIda = null, customVolta = null) => {
    if(e) e.preventDefault();
    
    const activeDestinations = customDest ? [{ id: customDest }] : destinations;
    if (!origin || activeDestinations.length === 0) { setError("Selecione Origem e Destino."); return; }
    
    setLoading(true); setError(null); setExpandedFlight(null);
    setShowTripMenu(false); setShowPaxMenu(false); setShowCabinMenu(false); setShowDateMenu(false);

    const a = parseInt(adults, 10) || 1;
    const c = parseInt(children, 10) || 0;
    const i = parseInt(infants, 10) || 0;
    
    setLastSearchedPax(a + c + i);
    setLastAdultsCount(a);
    setLastChildrenCount(c);
    setLastInfantsCount(i);
    setLastHoldIdaCount(parseInt(holdBagsIda, 10) || 0);
    setLastHoldVoltaCount(parseInt(holdBagsVolta, 10) || 0);

    const effectiveDateFrom = customIda || (dateFrom ? dateFrom : getTodayStr());
    const searchDateToRange = customIda || (dateFrom ? dateFrom : getSixMonthsStr());
    const destIds = activeDestinations.map(d => d.id).join(',');

    try {
      let url = `${WORKER_URL}/search-flights?origin=${origin.id}&destination=${destIds}&dateFrom=${effectiveDateFrom}&dateToRange=${searchDateToRange}&adults=${a}&children=${c}&infants=${i}&holdBagsIda=${holdBagsIda}&holdBagsVolta=${holdBagsVolta}&cabin=${cabin}&sort=${overrideSort}&max_stopovers=${overrideStops}`;
      
      if (tripType === 'return') {
        const effectiveDateTo = customVolta || (dateTo ? dateTo : effectiveDateFrom);
        const searchRetToRange = customVolta || (dateTo ? dateTo : getSixMonthsStr());
        url += `&returnFrom=${effectiveDateTo}&returnToRange=${searchRetToRange}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.voos)) { 
        let processed = data.voos;
        if (!allowOvernight) processed = processed.filter(v => !hasOvernightLayover(v));
        setRenderedFlights(processed); 
      } else { 
        setError(data.alerta || "Nenhum voo encontrado."); 
        setRenderedFlights([]); 
      }
    } catch (err) { 
      setError("Erro ao conectar com a API."); 
      setRenderedFlights([]);
    } finally { 
      setLoading(false); 
    }
  };

  const handleAddToCart = (tierName, tierTotal) => {
    if (!checkoutModal) return;
    const { voo } = checkoutModal;
    const unitPrice = Math.ceil(tierTotal / lastSearchedPax);

    const flightDetails = {
      ida: voo.ida,
      volta: voo.volta,
      pax: lastSearchedPax,
      adults: lastAdultsCount,
      children: lastChildrenCount,
      infants: lastInfantsCount,
      holdBagsIda: lastHoldIdaCount,
      holdBagsVolta: lastHoldVoltaCount,
      tier: tierName
    };

    const flightToCart = {
        _id: voo.id,
        sku: voo.id + '-' + tierName.replace(/\s+/g, '-'),
        title: `${voo.ida.origem} ➔ ${voo.ida.destino}`,
        variantName: `${tierName} (Incluso ${lastHoldIdaCount + lastHoldVoltaCount} Malas)`,
        price: unitPrice, 
        quantity: lastSearchedPax, 
        image: `https://images.kiwi.com/airlines/64x64/${voo.ida.companhiaPrincipal}.png`,
        isTravel: true,
        handlingTime: 0,
        freeShipping: true,
        flightDetails
    };

    clearCart();
    addItem(flightToCart);
    navigate('/cart');
  };

  const totalPaxPreview = parseInt(adults, 10) + parseInt(children, 10) + parseInt(infants, 10);
  const eligiblePaxPreview = parseInt(adults, 10) + parseInt(children, 10);
  const maxHoldBagsAllowed = eligiblePaxPreview * 2;

  const tripNames = { 'return': 'Ida e volta', 'oneway': 'Só ida' };
  const cabinNames = { 'M': 'Economia', 'W': 'Premium', 'C': 'Negócios', 'F': 'Primeira' };

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans pb-20">
      
      {/* Z-INDEX REDUZIDO PARA Z-20 PARA NÃO SOBREPOR O HEADER FIXO */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 mb-4 relative z-20">
        <div className="flex flex-wrap items-center gap-4 mb-5">
          
          <div className="relative" ref={tripRef}>
            <button onClick={() => setShowTripMenu(!showTripMenu)} className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-purple-50 text-sm font-bold text-gray-700 transition">
              {tripNames[tripType]} <span className="text-[10px] text-purple-600">▼</span>
            </button>
            {showTripMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 z-50">
                <label className="flex items-center gap-3 mb-3 cursor-pointer group">
                  <input type="radio" checked={tripType === 'return'} onChange={() => {setTripType('return'); executeSearch();}} className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-bold text-gray-800">Ida e volta</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="radio" checked={tripType === 'oneway'} onChange={() => {setTripType('oneway'); setDateTo(''); executeSearch();}} className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-bold text-gray-800">Só ida</span>
                </label>
              </div>
            )}
          </div>

          <div className="relative" ref={paxRef}>
            <button onClick={() => setShowPaxMenu(!showPaxMenu)} className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-purple-50 text-sm font-bold text-gray-700 transition">
              <div className="flex items-center gap-1"><span className="text-purple-600">👤</span> {totalPaxPreview} Passageiro(s) <span className="text-[10px] ml-1 text-purple-600">▼</span></div>
              <div className="flex items-center gap-2 border-l pl-3 border-gray-300">
                <span className="flex items-center gap-1 text-pink-600">🎒 {totalPaxPreview}</span>
                {(holdBagsIda > 0 || holdBagsVolta > 0) && <span className="flex items-center gap-1 text-blue-600">🧳 {holdBagsIda + holdBagsVolta}</span>}
              </div>
            </button>
            {showPaxMenu && (
              <div className="absolute top-full left-0 mt-2 w-[280px] bg-white border border-gray-200 rounded-xl shadow-2xl p-4 z-50">
                <h4 className="font-black text-[10px] uppercase tracking-wider text-purple-900 mb-1 border-b border-gray-100 pb-1.5">Passageiros</h4>
                <div className="mb-3">
                  <Counter label="Adultos" subLabel="Mais de 11" value={adults} onChange={setAdults} min={1} icon="👤" />
                  <Counter label="Crianças" subLabel="2 - 11 anos" value={children} onChange={setChildren} icon="👦" />
                  <Counter label="Bebês" subLabel="Abaixo de 2 anos" value={infants} onChange={setInfants} icon="👶" />
                </div>
                <h4 className="font-black text-[10px] uppercase tracking-wider text-purple-900 mb-1 border-b border-gray-100 pb-1.5">Bagagens</h4>
                <div className="mb-4">
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">🎒</span>
                      <span className="text-xs font-bold text-gray-800">Mala de Cabine (Ida/Volta)</span>
                    </div>
                    <span className="font-bold text-gray-800 text-[10px]">{totalPaxPreview} Fixa</span>
                  </div>
                  <Counter label="Mala Porão - Ida" subLabel={`Máx ${maxHoldBagsAllowed}`} value={holdBagsIda} onChange={setHoldBagsIda} min={0} max={maxHoldBagsAllowed} icon="🛫" />
                  <Counter label="Mala Porão - Volta" subLabel={`Máx ${maxHoldBagsAllowed}`} value={holdBagsVolta} onChange={setHoldBagsVolta} min={0} max={maxHoldBagsAllowed} icon="🛬" />
                </div>
                <button onClick={(e) => executeSearch(e)} className="w-full py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 cursor-pointer transition">Aplicar</button>
              </div>
            )}
          </div>

          <div className="relative" ref={cabinRef}>
            <button onClick={() => setShowCabinMenu(!showCabinMenu)} className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-purple-50 text-sm font-bold text-gray-700 transition">
              {cabinNames[cabin]} <span className="text-[10px] text-purple-600">▼</span>
            </button>
            {showCabinMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 z-50">
                {Object.keys(cabinNames).map(k => (
                  <label key={k} className="flex items-center gap-3 mb-3 cursor-pointer group">
                    <input type="radio" checked={cabin === k} onChange={() => {setCabin(k); setShowCabinMenu(false); executeSearch();}} className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-bold text-gray-800">{cabinNames[k]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 h-auto md:h-[50px] relative z-30">
          <div className="relative col-span-1 md:col-span-3 flex items-center border border-gray-300 rounded-md px-3 hover:border-purple-600 bg-white z-[60] h-12 md:h-full" ref={originRef}>
            <span className="text-gray-400 font-medium mr-2 text-sm">De</span>
            {origin ? (
              <div className="bg-purple-600 text-white text-xs font-bold px-2 py-1.5 rounded flex items-center gap-1 shadow-sm overflow-hidden">
                <span className="truncate">{origin.name}</span>
                <button onMouseDown={(e) => { e.preventDefault(); setOrigin(null); setOriginQuery(''); }} className="hover:text-gray-200 text-sm leading-none ml-1">×</button>
              </div>
            ) : (
              <input type="text" value={originQuery} onChange={(e) => setOriginQuery(e.target.value)} onFocus={() => { if(originResults.length > 0) setShowOrigin(true); }} className="flex-1 outline-none text-sm font-bold text-gray-800 bg-transparent w-full" placeholder="São Paulo" />
            )}
            {showOrigin && !origin && originResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-[110%] bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {originResults.map(loc => (
                  <li key={loc.id} onMouseDown={(e) => { e.preventDefault(); setOrigin({ id: loc.id, name: loc.name }); setShowOrigin(false); }} className="p-3 hover:bg-purple-50 cursor-pointer text-sm border-b border-gray-50 flex flex-col">
                    <span className="font-bold text-gray-800">{loc.name} ({loc.code})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="relative col-span-1 md:col-span-3 flex items-center flex-wrap gap-1 border border-gray-300 rounded-md p-1.5 hover:border-purple-600 bg-white z-[50] min-h-[48px] md:h-full" ref={destRef}>
            <span className="text-gray-400 font-medium mr-1 text-sm pl-1">Para</span>
            {destinations.map(d => (
              <div key={d.id} className="bg-purple-600 text-white text-xs font-bold px-2 py-1.5 rounded flex items-center gap-1 shadow-sm">
                <span className="truncate max-w-[80px]">{d.name}</span>
                <button onMouseDown={(e) => { e.preventDefault(); setDestinations(destinations.filter(x => x.id !== d.id)); }} className="hover:text-gray-200 text-sm leading-none ml-1">×</button>
              </div>
            ))}
            <input type="text" value={destQuery} onChange={(e) => setDestQuery(e.target.value)} onFocus={() => { if(destResults.length > 0) setShowDest(true); }} className="flex-1 min-w-[80px] outline-none text-sm font-bold text-gray-800 bg-transparent py-1 px-1" placeholder={destinations.length === 0 ? "Ex: Salvador" : "Adicionar..."} />
            {showDest && destResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-[110%] bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {destResults.map(loc => (
                  <li key={loc.id} onMouseDown={(e) => { e.preventDefault(); if(!destinations.find(x=>x.id===loc.id)) setDestinations([...destinations, {id:loc.id, name:loc.name}]); setDestQuery(''); setShowDest(false); }} className="p-3 hover:bg-purple-50 cursor-pointer text-sm border-b border-gray-50 flex flex-col">
                    <span className="font-bold text-gray-800">{loc.name} ({loc.code})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="col-span-1 md:col-span-4 z-20 h-12 md:h-full relative" ref={dateRef}>
            <div onClick={() => setShowDateMenu(!showDateMenu)} className="flex items-center justify-between border border-gray-300 rounded-md px-4 h-full cursor-pointer hover:border-purple-600 bg-white">
              <div className="flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold text-gray-400 leading-tight">Partida</span>
                <span className="text-sm font-bold text-gray-900 leading-tight">{dateType==='specific' && dateFrom ? new Date(dateFrom).toLocaleDateString('pt-BR') : 'A qualquer momento'}</span>
              </div>
              <div className="w-px h-6 bg-gray-200 mx-2"></div>
              <div className={`flex flex-col justify-center ${tripType==='oneway'?'opacity-30':''}`}>
                <span className="text-[9px] uppercase font-bold text-gray-400 leading-tight">Regresso</span>
                <span className="text-sm font-bold text-gray-900 leading-tight">{tripType==='return' && dateType==='specific' && dateTo ? new Date(dateTo).toLocaleDateString('pt-BR') : 'A qualquer momento'}</span>
              </div>
            </div>

            {showDateMenu && (
              <div className="absolute top-full right-0 left-0 md:left-auto md:w-[450px] mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 flex flex-col z-50">
                <div className="flex gap-4 border-b border-gray-200 pb-3 mb-4">
                  <button onClick={()=>setDateType('anytime')} className={`flex-1 py-2 rounded font-bold text-sm transition ${dateType==='anytime'?'bg-purple-100 text-purple-700':'text-gray-500 hover:bg-gray-100'}`}>A qualquer momento</button>
                  <button onClick={()=>setDateType('specific')} className={`flex-1 py-2 rounded font-bold text-sm transition ${dateType==='specific'?'bg-purple-100 text-purple-700':'text-gray-500 hover:bg-gray-100'}`}>Datas Específicas</button>
                </div>
                {dateType === 'specific' && (
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Partida</label>
                      <input type="date" min={getTodayStr()} value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm font-bold text-gray-800 outline-none focus:border-purple-600"/>
                    </div>
                    <div className={`flex-1 ${tripType==='oneway'?'opacity-30 pointer-events-none':''}`}>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Regresso</label>
                      <input type="date" min={dateFrom || getTodayStr()} value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm font-bold text-gray-800 outline-none focus:border-purple-600"/>
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button onClick={(e) => { setShowDateMenu(false); executeSearch(e); }} className="px-6 py-2 bg-[#00a698] text-white font-bold rounded hover:bg-[#008f82]">Definir Datas</button>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-1 md:col-span-2 h-12 md:h-full z-[20]">
            <button onClick={(e) => executeSearch(e)} disabled={loading} className="w-full h-full bg-[#00a698] hover:bg-[#008f82] text-white font-extrabold rounded-md shadow-md text-base uppercase tracking-wide transition">
              {loading ? 'Buscando...' : 'Pesquisar'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 relative z-10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Escalas:</span>
            <select value={stopsConfig} onChange={(e) => { setStopsConfig(e.target.value); executeSearch(null, sortConfig, e.target.value); }} className="bg-gray-50 border border-gray-200 rounded p-1.5 text-sm font-bold outline-none cursor-pointer">
              <option value="all">Todos</option>
              <option value="0">Direto</option>
              <option value="1">Até 1 escala</option>
              <option value="2">Até 2 escalas</option>
            </select>
          </div>
          <div className="w-px h-6 bg-gray-200"></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allowOvernight} onChange={(e) => setAllowOvernight(e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
            <span className="text-sm font-bold text-gray-700">Permitir escalas noturnas</span>
          </label>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <span className="text-xs font-bold text-gray-500 uppercase">Ordenar por:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => { setSortConfig('price'); executeSearch(null, 'price', stopsConfig); }} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${sortConfig==='price' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:bg-gray-200'}`}>Mais barato</button>
            <button onClick={() => { setSortConfig('duration'); executeSearch(null, 'duration', stopsConfig); }} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${sortConfig==='duration' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:bg-gray-200'}`}>Mais rápido</button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mb-6 font-medium text-sm">{error}</div>}

      <div className="space-y-6 relative z-0">
        {renderedFlights.map((voo) => {
          const isExpanded = expandedFlight === voo.id;
          
          const safeTotal = parseInt(voo.precoFinal, 10) || 0;
          const unitBagPriceIda = voo.bags_price?.['1'] || 120;
          const unitBagPriceVolta = voo.bags_price?.['1'] || 120;
          
          const bagIdaSubtotal = lastHoldIdaCount > 0 ? (lastHoldIdaCount * unitBagPriceIda) : 0;
          const bagVoltaSubtotal = lastHoldVoltaCount > 0 ? (lastHoldVoltaCount * unitBagPriceVolta) : 0;
          const totalBagsCost = bagIdaSubtotal + bagVoltaSubtotal;
          
          const passengerTotal = Math.max(0, safeTotal - totalBagsCost);
          const adultSubtotal = lastAdultsCount > 0 ? Math.ceil(passengerTotal * (lastAdultsCount / (lastAdultsCount + lastChildrenCount || 1))) : 0;
          const childSubtotal = lastChildrenCount > 0 ? (passengerTotal - adultSubtotal) : 0;

          return (
            <div key={voo.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col md:flex-row">
              
              <div className="flex-1 p-5 md:pr-8 cursor-pointer" onClick={() => setExpandedFlight(isExpanded ? null : voo.id)}>
                
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <img src={`https://images.kiwi.com/airlines/64x64/${voo.ida.companhiaPrincipal}.png`} alt="Cia" className="w-10 h-10 object-contain rounded-lg border border-gray-100 p-0.5" />
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-purple-600 block mb-0.5">
                        Voo de Ida <span className="text-gray-500 ml-1 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">{voo.ida.trechos.map(t => t.vooNumero).join(' ➔ ')}</span>
                      </span>
                      <h3 className="font-bold text-gray-900 text-base">{voo.ida.origem} ➔ {voo.ida.destino}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">Partida: {formatDateBr(voo.ida.partida)} às {formatTime(voo.ida.partida)} • <span className="text-green-600 font-bold">{voo.ida.escalas === 0 ? 'Voo Direto' : `${voo.ida.escalas} Parada(s)`}</span></p>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className="text-[9px] text-gray-400 uppercase font-bold block">Duração</span>
                    <span className="text-sm font-bold text-gray-800">{voo.ida.duracao}</span>
                  </div>
                </div>

                {voo.volta && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={`https://images.kiwi.com/airlines/64x64/${voo.volta.companhiaPrincipal}.png`} alt="Cia" className="w-10 h-10 object-contain rounded-lg border border-gray-100 p-0.5" />
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-orange-600 block mb-0.5">
                          Voo de Volta <span className="text-gray-500 ml-1 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">{voo.volta.trechos.map(t => t.vooNumero).join(' ➔ ')}</span>
                        </span>
                        <h3 className="font-bold text-gray-900 text-base">{voo.volta.origem} ➔ {voo.volta.destino}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium">Partida: {formatDateBr(voo.volta.partida)} às {formatTime(voo.volta.partida)} • <span className="text-green-600 font-bold">{voo.volta.escalas === 0 ? 'Voo Direto' : `${voo.volta.escalas} Parada(s)`}</span></p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <span className="text-[9px] text-gray-400 uppercase font-bold block">Duração</span>
                      <span className="text-sm font-bold text-gray-800">{voo.volta.duracao}</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 text-center">
                  <span className="text-[11px] font-bold text-purple-600 uppercase tracking-widest">{isExpanded ? 'Ocultar detalhes ▲' : 'Ver detalhes da viagem ▼'}</span>
                </div>

                {isExpanded && (
                  <div className="mt-6 border-t border-gray-200 pt-6 cursor-default" onClick={e=>e.stopPropagation()}>
                    <h3 className="text-xl font-black text-gray-900 mb-4">Detalhes da viagem</h3>
                    <div className="mb-6">
                      <h4 className="font-bold text-purple-700 bg-purple-50 p-2.5 rounded-lg mb-4 uppercase text-xs tracking-wider flex justify-between"><span>Voo de Ida</span> <span>{voo.ida.duracao}</span></h4>
                      {voo.ida.trechos.map((t, idx) => <FlightLegDetails key={idx} trecho={t} />)}
                    </div>
                    {voo.volta && (
                      <div>
                        <h4 className="font-bold text-orange-700 bg-orange-50 p-2.5 rounded-lg mb-4 uppercase text-xs tracking-wider flex justify-between"><span>Voo de Volta</span> <span>{voo.volta.duracao}</span></h4>
                        {voo.volta.trechos.map((t, idx) => <FlightLegDetails key={idx} trecho={t} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full md:w-[320px] bg-gray-50 p-6 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col justify-between">
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{lastSearchedPax}x Item pessoal</p>
                    </div>
                    <span className="text-[10px] font-black uppercase text-green-700 bg-green-100 px-2 py-0.5 rounded">Incluído</span>
                  </div>
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{lastSearchedPax}x Mala de cabine</p>
                    </div>
                    <span className="text-[10px] font-black uppercase text-green-700 bg-green-100 px-2 py-0.5 rounded">Incluído</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 pb-3 border-b border-gray-100">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{(lastHoldIdaCount + lastHoldVoltaCount)}x Mala(s) porão (Ida/Volta)</p>
                    </div>
                    <span className="text-xs font-extrabold text-gray-700">{(lastHoldIdaCount + lastHoldVoltaCount) > 0 ? 'Selecionada' : '0 Adicionada'}</span>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-100 p-3 rounded-xl mb-4 text-xs text-purple-900 space-y-1.5">
                  <p className="font-bold text-purple-950 border-b border-purple-200 pb-1 mb-1">Extrato de Valores:</p>
                  {lastAdultsCount > 0 && <div className="flex justify-between"><span>{lastAdultsCount}x Adulto(s)</span><span>R$ {adultSubtotal || 0}</span></div>}
                  {lastChildrenCount > 0 && <div className="flex justify-between"><span>{lastChildrenCount}x Criança(s)</span><span>R$ {childSubtotal || 0}</span></div>}
                  {lastInfantsCount > 0 && <div className="flex justify-between"><span>{lastInfantsCount}x Bebê(s)</span><span>Incluso</span></div>}
                  {lastHoldIdaCount > 0 && <div className="flex justify-between text-purple-700 font-semibold"><span>{lastHoldIdaCount}x Mala Porão (Ida)</span><span>R$ {bagIdaSubtotal || 0}</span></div>}
                  {lastHoldVoltaCount > 0 && <div className="flex justify-between text-purple-700 font-semibold"><span>{lastHoldVoltaCount}x Mala Porão (Volta)</span><span>R$ {bagVoltaSubtotal || 0}</span></div>}
                </div>

                <div className="text-center w-full mt-auto">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block mb-1">Total para {lastSearchedPax} passageiro(s)</span>
                  <span className="text-4xl font-black text-green-700 block mb-4">R$ {safeTotal}</span>
                  <button onClick={() => setCheckoutModal({ voo, safeTotal })} className="bg-orange-600 text-white w-full py-4 rounded-xl font-black text-lg hover:bg-orange-700 transition-colors shadow-lg cursor-pointer">
                    Comprar Passagem
                  </button>
                </div>
              </div>
              
            </div>
          );
        })}
      </div>

      {/* MODAL DE TARIFAS */}
      {checkoutModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 md:p-8 relative overflow-y-auto max-h-[95vh]">
            <button onClick={() => setCheckoutModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold text-2xl">&times;</button>
            <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">Escolha sua Tarifa</h2>
            <p className="text-gray-500 text-sm text-center mb-8">Personalize sua experiência de voo com as garantias Palastore</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-xl p-6 flex flex-col hover:border-gray-400 transition-colors">
                <h3 className="font-black text-lg text-gray-800">Basic</h3>
                <p className="text-xs text-gray-500 mb-4 h-8">Sua configuração atual, ideal para quem quer economizar.</p>
                <div className="text-3xl font-black text-gray-900 mb-6">R$ {checkoutModal.safeTotal}</div>
                <ul className="space-y-3 mb-8 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2">✔️ Inclui suas {lastHoldIdaCount + lastHoldVoltaCount} mala(s) atuais</li>
                  <li className="flex items-center gap-2">✔️ Assento Padrão Aleatório</li>
                  <li className="flex items-center gap-2 text-red-500">❌ Sem reembolso no cancelamento</li>
                </ul>
                <button onClick={() => handleAddToCart('Basic', checkoutModal.safeTotal)} className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-colors">Selecionar Basic</button>
              </div>

              <div className="border-2 border-purple-500 bg-purple-50 rounded-xl p-6 flex flex-col transform md:-translate-y-4 shadow-xl">
                <div className="bg-purple-500 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1 px-3 rounded-full self-center mb-2 -mt-10 shadow">Mais Escolhida</div>
                <h3 className="font-black text-lg text-purple-900">Plus</h3>
                <p className="text-xs text-purple-700 mb-4 h-8">Mais flexibilidade e a comodidade de sentar onde gosta.</p>
                <div className="text-3xl font-black text-purple-700 mb-6">R$ {checkoutModal.safeTotal + (lastSearchedPax * 85)}</div>
                <ul className="space-y-3 mb-8 text-sm text-purple-800 flex-1">
                  <li className="flex items-center gap-2">✔️ Inclui suas {lastHoldIdaCount + lastHoldVoltaCount} mala(s) atuais</li>
                  <li className="flex items-center gap-2 font-bold">✔️ Escolha de Assento (Janela/Corredor)</li>
                  <li className="flex items-center gap-2 font-bold">✔️ Remarcação flexível</li>
                </ul>
                <button onClick={() => handleAddToCart('Plus', checkoutModal.safeTotal + (lastSearchedPax * 85))} className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-lg">Selecionar Plus</button>
              </div>

              <div className="border border-gray-200 rounded-xl p-6 flex flex-col hover:border-orange-500 transition-colors">
                <h3 className="font-black text-lg text-orange-600">Flex</h3>
                <p className="text-xs text-gray-500 mb-4 h-8">Garantia total para imprevistos. Cancele e receba 100% de volta.</p>
                <div className="text-3xl font-black text-gray-900 mb-6">R$ {Math.ceil(checkoutModal.safeTotal * 1.15)}</div>
                <ul className="space-y-3 mb-8 text-sm text-gray-600 flex-1">
                  <li className="flex items-center gap-2">✔️ Inclui suas {lastHoldIdaCount + lastHoldVoltaCount} mala(s) atuais</li>
                  <li className="flex items-center gap-2 font-bold">✔️ Escolha de Assento Premium</li>
                  <li className="flex items-center gap-2 font-bold text-green-600">✔️ Cancelamento 100% Reembolsável</li>
                </ul>
                <button onClick={() => handleAddToCart('Flex', Math.ceil(checkoutModal.safeTotal * 1.15))} className="w-full py-3 bg-orange-100 text-orange-700 font-bold rounded-lg hover:bg-orange-200 transition-colors">Selecionar Flex</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}