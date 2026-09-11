import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import usePackageStore from '../store/usePackageStore';
import useCartStore from '../store/useCartStore';
import { ShieldCheck } from 'lucide-react';

import PalastoreTransfers from '../components/PalastoreTransfers';

import { 
  Calendar, Users, Check, AlertCircle, 
  Plane, Building, Car, X, 
  Briefcase, Luggage, Info, ArrowRightLeft, MapPin, Clock, ShoppingCart, Timer, Coffee
} from 'lucide-react';

const WORKER_URL = "https://palastore-flights-api.laeciossp.workers.dev";
const SUPABASE_URL = "https://vcqiilytjrrurdbscmio.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_leFg1lWGZlctiU3CXYR2Gw_FpOG2qR3"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getAirlineName = (code) => {
  const airlines = {
    'G3': 'GOL Linhas Aéreas', 'AD': 'Azul Linhas Aéreas', 'LA': 'LATAM Airlines', 'JJ': 'LATAM Airlines',
    '2Z': 'Voepass Linhas Aéreas', 'H2': 'Sky Airline', 'JA': 'JetSMART', 'DM': 'Arajet', 'AV': 'Avianca',
    'CM': 'Copa Airlines', 'AM': 'AeroMexico', 'AR': 'Aerolíneas Argentinas', 'OB': 'Boliviana de Aviación',
    'PZ': 'Paranair', 'ZP': 'Paranair', 'AC': 'Air Canada', 'TS': 'Air Transat', 'AA': 'American Airlines',
    'DL': 'Delta Air Lines', 'UA': 'United Airlines', 'AF': 'Air France', 'KL': 'KLM Royal Dutch Airlines',
    'LH': 'Lufthansa', 'LX': 'Swiss International Air Lines', 'OS': 'Austrian Airlines', 'IB': 'Iberia Airlines',
    'UX': 'Air Europa', 'TP': 'TAP Portugal', 'AZ': 'ITA Airways', 'PU': 'Plus Ultra Líneas Aéreas',
    'CA': 'Air China', 'TK': 'Turkish Airlines', 'AT': 'Royal Air Maroc', 'ET': 'Ethiopian Airlines',
    'EK': 'Emirates', 'QF': 'Qantas', 'DT': 'TAAG Angola Airlines', 'H1': 'Hahn Air', 'HR': 'Hahn Air Systems',
    'Q4': 'Euroairlines', 'LEVEL': 'Level'
  };
  return airlines[code] || code;
};

const formatTime = (dateStr) => {
  if(!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) { return ''; }
};

const formatDateBrFull = (dateStr) => {
  if(!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const meses = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return `${dias[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} de ${meses[d.getMonth()]} ${d.getFullYear()}`;
  } catch(e) { return ''; }
};

const formatDateBr = (dateStr) => {
  if(!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    return `${dias[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch(e) { return ''; }
};

const formatDateShort = (dateStr) => {
  if(!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
  } catch(e) { return ''; }
};

const formatSafeDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const calcularNoites = (ida, volta) => {
  if(!ida || !volta) return 2;
  return Math.max(1, Math.ceil(Math.abs(new Date(volta) - new Date(ida)) / (1000 * 60 * 60 * 24)));
};

// ==========================================
// FUNÇÕES DA ETG / RATEHAWK
// ==========================================
const getSafeImageUrl = (imgInput) => {
  if (!imgInput) return null;
  let rawList = imgInput;
  if (typeof rawList === 'string' && rawList.trim().startsWith('[')) {
    try { rawList = JSON.parse(rawList); } catch (e) { }
  }
  const target = Array.isArray(rawList) ? rawList[0] : rawList;
  let rawUrl = typeof target === 'string' ? target : (target?.url || target?.image || '');
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let formattedUrl = rawUrl.startsWith('//') ? 'https:' + rawUrl : rawUrl;
  return formattedUrl.replace('{size}', '1024x768');
};

const parseImagesList = (imagesData) => {
  if (!imagesData) return [];
  let list = imagesData;
  if (typeof list === 'string' && list.trim().startsWith('[')) {
    try { list = JSON.parse(list); } catch(e) { return []; }
  }
  if (Array.isArray(list)) {
    return list.map(img => getSafeImageUrl(img)).filter(Boolean);
  }
  return [];
};

const findRoomImages = (oferta, roomGroups, hotelImages) => {
  let rGroups = roomGroups;
  if (typeof rGroups === 'string' && rGroups.trim().startsWith('[')) {
      try { rGroups = JSON.parse(rGroups); } catch(e) { rGroups = []; }
  }
  let foundImages = [];
  const parsedHotelImages = parseImagesList(hotelImages);
  const fachadaHotel = parsedHotelImages.length > 0 ? parsedHotelImages[0] : null;

  if (rGroups && Array.isArray(rGroups) && rGroups.length > 0) {
    if (oferta?.rg_ext && typeof oferta.rg_ext === 'object') {
      const matchedByRgExt = rGroups.find(rg => {
        if (!rg.rg_ext || typeof rg.rg_ext !== 'object') return false;
        const searchKeys = Object.keys(oferta.rg_ext);
        if (searchKeys.length === 0) return false;
        return searchKeys.every(key => String(rg.rg_ext[key]) === String(oferta.rg_ext[key]));
      });
      if (matchedByRgExt && matchedByRgExt.images) foundImages = parseImagesList(matchedByRgExt.images);
    }
  }
  if (foundImages.length > 0 && fachadaHotel) foundImages = foundImages.filter(img => img !== fachadaHotel);
  if (foundImages.length === 0 && parsedHotelImages.length > 0) foundImages = parsedHotelImages.filter(img => img !== fachadaHotel);
  return foundImages; 
};

const formatRoomName = (r) => {
  if (r.room_data_trans) {
    const main = r.room_data_trans.main_room_type || r.room_data_trans.main_name || r.room_name;
    const bedding = r.room_data_trans.bedding_type ? ` (${r.room_data_trans.bedding_type})` : '';
    const misc = r.room_data_trans.misc_room_type ? ` - ${r.room_data_trans.misc_room_type}` : '';
    return `${main}${bedding}${misc}`.trim();
  }
  return r.room_name || 'Quarto Standard';
};

const formatCancellation = (deadlineUtc) => {
  if (!deadlineUtc) return null;
  const datePart = deadlineUtc.split('T')[0];
  const timePart = deadlineUtc.split('T')[1]?.substring(0, 5) || '00:00';
  return `Free cancellation before ${datePart} at ${timePart} (Hotel Local Time)`;
};

// ==========================================
// COMPONENTES DE VOO (Contador do Hero Search)
// ==========================================
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
        <button onClick={(e) => { e.preventDefault(); handleDec(); }} disabled={parseInt(value, 10) <= min} className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-purple-600 hover:text-purple-600 disabled:opacity-30 transition text-sm pb-0.5">-</button>
        <input type="text" readOnly value={parseInt(value, 10) || 0} className="w-4 text-center font-bold text-xs text-gray-800 outline-none select-none bg-transparent" />
        <button onClick={(e) => { e.preventDefault(); handleInc(); }} disabled={parseInt(value, 10) >= max} className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-purple-600 hover:text-purple-600 disabled:opacity-30 transition text-sm pb-0.5">+</button>
      </div>
    </div>
  );
};

export default function FlightHotelPackage() {
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  
  const { 
    activeView, setActiveView,
    searchParams, setSearchParams,
    flightsResults, setFlightsResults, 
    hotelsResults, setHotelsResults,
    selectedFlight, selectedHotel, selectedTransfer,
    changeSelectedFlight, changeSelectedHotel, changeSelectedTransfer,
    removeTransfer, removeFlight, removeHotel,
    isLoading, setLoading, error, setError
  } = usePackageStore();

  const [loadingCart, setLoadingCart] = useState(false);
  const [activeGalleryHotel, setActiveGalleryHotel] = useState(null);
  const [expandedFlightId, setExpandedFlightId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600);

  // ==========================================
  // ESTADOS DO BUSCADOR HERÓI (Trazidos do FlightSearch)
  // ==========================================
  const [tripType, setTripType] = useState('return');
  const [cabin, setCabin] = useState('M');
  const [adults, setAdults] = useState(searchParams?.adults || 2);
  const [children, setChildren] = useState(searchParams?.children || 0);
  const [infants, setInfants] = useState(searchParams?.infants || 0);
  
  // A ÚNICA LÓGICA DE MALAS (Unificada)
  const [holdBags, setHoldBags] = useState(searchParams?.holdBags || 0);

  const [showTripMenu, setShowTripMenu] = useState(false);
  const [showPaxMenu, setShowPaxMenu] = useState(false);
  const [showCabinMenu, setShowCabinMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  const [originQuery, setOriginQuery] = useState('');
  const [originResults, setOriginResults] = useState([]);
  const [showOrigin, setShowOrigin] = useState(false);
  const [origin, setOrigin] = useState(searchParams?.origin || { id: 'SAO', name: 'São Paulo', code: 'SAO' });

  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState([]);
  const [showDest, setShowDest] = useState(false);
  const [destinations, setDestinations] = useState([searchParams?.destination || { id: 'RIO', name: 'Rio de Janeiro', code: 'RIO' }]);

  const [dateType, setDateType] = useState('specific'); 
  const [dateFrom, setDateFrom] = useState(searchParams?.dateOut || '2026-12-18');
  const [dateTo, setDateTo] = useState(searchParams?.dateIn || '2026-12-20');

  const tripRef = useRef(null);
  const paxRef = useRef(null);
  const cabinRef = useRef(null);
  const originRef = useRef(null);
  const destRef = useRef(null);
  const dateRef = useRef(null);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getSixMonthsStr = () => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().split('T')[0]; };

  // ==========================================
  // CÁLCULOS TOTAIS DO PACOTE (Seguros e Locais)
  // ==========================================
  const totalPax = parseInt(searchParams?.adults || adults, 10) + parseInt(searchParams?.children || children, 10) + parseInt(searchParams?.infants || infants, 10);
  const activeBags = searchParams?.holdBags || holdBags;
  const noites = calcularNoites(searchParams?.dateOut || dateFrom, searchParams?.dateIn || dateTo);

  const bagMultiplier = selectedFlight && !selectedFlight.volta ? 2 : 1;
  const unitBagPrice = selectedFlight?.bags_price?.['1'] ? Math.ceil(selectedFlight.bags_price['1']) : 120;
  
  const localBagCost = selectedFlight && activeBags > 0 ? (activeBags * unitBagPrice * bagMultiplier) : 0;
  const baseFlightFare = selectedFlight ? (Number(selectedFlight.precoFinal || selectedFlight.price || selectedFlight.precoBase || selectedFlight.safeTotal) || 0) : 0;
      
  const flightTotal = selectedFlight ? (baseFlightFare + localBagCost) : 0;
  const hotelTotal = selectedHotel ? (Number(selectedHotel.ofertas?.[0]?.precoVenda || selectedHotel.price) || 0) : 0;
  const transferTotal = selectedTransfer ? (Number(selectedTransfer.price) || 0) : 0;

  const totalGeral = flightTotal + hotelTotal + transferTotal;
  const precoPorPessoa = totalGeral > 0 ? Math.ceil(totalGeral / (totalPax || 1)) : 0;
  const taxasEImpostos = precoPorPessoa > 0 ? Math.ceil(precoPorPessoa * 0.12) : 0;
  const precoBasePessoa = Math.max(0, precoPorPessoa - taxasEImpostos);

  useEffect(() => {
    if (isLoading) { setTimeLeft(600); return; }
    if (timeLeft <= 0) return;
    const intervalId = setInterval(() => { setTimeLeft((prev) => prev - 1); }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft, isLoading]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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

  // ==========================================
  // FUNÇÃO DE BUSCA COMPLETA
  // ==========================================
  const executarBuscaCompleta = async (e) => {
    if (e) e.preventDefault();
    if (!origin || destinations.length === 0) { setError("Selecione Origem e Destino."); return; }
    
    setLoading(true); setError(null);
    setShowTripMenu(false); setShowPaxMenu(false); setShowCabinMenu(false); setShowDateMenu(false);
    
    // Atualiza a Store para o carrinho e cálculos saberem o que foi pesquisado
    setSearchParams({ 
      origin: origin, 
      destination: destinations[0], 
      dateOut: dateFrom, 
      dateIn: dateTo, 
      adults: adults,
      children: children,
      infants: infants,
      holdBags: holdBags
    });

    try {
      const destObj = destinations[0];
      const destCode = destObj.code || destObj.id || 'RIO';

      let voos = [];
      let hoteis = [];

      let effectiveDateFrom = dateFrom || getTodayStr();
      let effectiveDateTo = dateTo || getSixMonthsStr();

      // BUSCA DO VOO (IGUAL AO FLIGHTSEARCH.JSX)
      let urlVoo = `${WORKER_URL}/search-flights?origin=${origin.id}&destination=${destCode}&dateFrom=${effectiveDateFrom}&dateToRange=${effectiveDateFrom}&adults=${adults}&children=${children}&infants=${infants}&cabin=${cabin}&sort=price`;
      if (tripType === 'return') {
        urlVoo += `&returnFrom=${effectiveDateTo}&returnToRange=${effectiveDateTo}`;
      }

      const resVoo = await fetch(urlVoo);
      const dataVoo = await resVoo.json();
      if (dataVoo.status === 'success' && dataVoo.voos) {
        voos = dataVoo.voos;
        setFlightsResults(voos);
      } else {
        setFlightsResults([]);
      }

      // ==============================================================
      // ISOLAMENTO DE ERROS DOS HOTÉIS (Proteção para os Voos)
      // ==============================================================
      try {
        let cityLat = -23.5505; let cityLng = -46.6333;
        const isTest = destCode.toLowerCase().includes('rio') || destCode.toLowerCase().includes('janeiro') || destCode.toLowerCase().includes('gig');
        const hidsToSearch = isTest ? [10004834, 8819557, 9015534, 8663536] : [];

        if (hidsToSearch.length > 0) {
          const response = await fetch(`${WORKER_URL}/serp-hotels`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              hids: hidsToSearch, 
              checkin: effectiveDateFrom, 
              checkout: effectiveDateTo, 
              residency: 'br', 
              currency: "BRL", 
              guests: [{ adults: adults, children: [] }] 
            })
          });
          
          const resData = await response.json();
          let comb = resData.data?.hotels || [];

          if (comb.length > 0) {
            const { data: dbHotels } = await supabase.from('Hotel').select('id, images, description, room_groups').in('id', comb.map(h => String(h.id)));
            hoteis = comb.map(h => {
              const dbInfo = (dbHotels || []).find(dbH => dbH.id === String(h.id));
              return {
                hotelId: `rh_${h.id}`, nome: h.name, categoria: h.star_rating || 4, endereco: h.address,
                latitude: h.latitude || cityLat, longitude: h.longitude || cityLng,
                imagensReais: dbInfo?.images || [], description: dbInfo?.description,
                room_groups: dbInfo?.room_groups || [],
                ofertas: (h.rates || []).map(r => {
                  const taxes = r.payment_options?.payment_types?.[0]?.tax_data?.taxes?.filter(t => !t.included_by_supplier) || [];
                  const exactCancellation = r.payment_options?.payment_types?.[0]?.cancellation_penalties?.free_cancellation_before;
                  return {
                    tipoQuartoRaw: r.room_name,
                    tipoQuarto: formatRoomName(r), 
                    codigoRegime: r.meal === 'breakfast' ? 'BB' : 'RO', 
                    nomeRegime: r.meal_data?.value || 'Sem refeições',
                    precoVenda: parseFloat(r.payment_options?.payment_types?.[0]?.amount || 0), 
                    bookHash: r.book_hash, 
                    freeCancellation: exactCancellation != null,
                    cancellationDeadline: formatCancellation(exactCancellation),
                    excludedTaxes: taxes,
                    deposit: r.deposit || null,
                    noShow: r.no_show || null,
                    rg_ext: r.rg_ext
                  };
                }).sort((a,b) => a.precoVenda - b.precoVenda)
              };
            });
            setHotelsResults(hoteis);
          } else {
            setHotelsResults([]);
          }
        }
      } catch (errHotel) {
        // Ignora silenciosamente se o hotel não estiver em produção para não estragar a busca do pacote
        console.warn("API de Hotéis offline ou não retornou dados.");
        setHotelsResults([]);
      }
      // ==============================================================

      // Preenche os boxes na tela imediatamente após o fetch
      if (voos.length > 0) changeSelectedFlight(voos[0]);
      else changeSelectedFlight(null);

      if (hoteis.length > 0) changeSelectedHotel(hoteis[0]);
      else changeSelectedHotel(null);

    } catch (err) {
      setError("Erro ao processar busca.");
    } finally {
      setLoading(false);
    }
  };

  // Roda uma busca inicial se a página carregar vazia
  useEffect(() => {
    if (flightsResults.length === 0 && !isLoading) {
       executarBuscaCompleta();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckoutPackage = () => {
    if (!selectedFlight && !selectedHotel && !selectedTransfer) {
      return alert("Selecione pelo menos um serviço para fechar o pacote.");
    }
    
    setLoadingCart(true);
    const packageSku = `PK-${Date.now()}`;
    const destName = destinations[0]?.name?.split(',')[0] || 'Destino';
    
    let descLines = [];
    descLines.push(`📋 PACOTE COMPLETO: ${destName.toUpperCase()}`);
    descLines.push(`👥 Viajantes: ${totalPax} passageiro(s) | 📅 ${formatDateShort(dateFrom)} até ${formatDateShort(dateTo)} (${noites} noites)`);
    descLines.push(`──────────────────────────────────────────`);

    if (selectedFlight) {
      const ciaIda = getAirlineName(selectedFlight.ida?.companhiaPrincipal);
      const ciaVolta = selectedFlight.volta?.companhiaPrincipal ? getAirlineName(selectedFlight.volta.companhiaPrincipal) : null;
      let ciaStr = ciaVolta && ciaVolta !== ciaIda ? `Ida: ${ciaIda} / Volta: ${ciaVolta}` : ciaIda;

      descLines.push(`✈️ PASSAGENS AÉREAS (${ciaStr}):`);
      descLines.push(`• IDA (${ciaIda}): ${selectedFlight.ida?.origem} ➔ ${selectedFlight.ida?.destino} | ${formatDateBrFull(selectedFlight.ida?.partida)}`);
      descLines.push(`  Horário: ${formatTime(selectedFlight.ida?.partida)}h às ${formatTime(selectedFlight.ida?.chegada)}h (${selectedFlight.ida?.duracao} • ${selectedFlight.ida?.escalas === 0 ? 'Direto' : selectedFlight.ida?.escalas + ' escala(s)'})`);
      if (selectedFlight.volta) {
        descLines.push(`• VOLTA (${ciaVolta || ciaIda}): ${selectedFlight.volta?.origem} ➔ ${selectedFlight.volta?.destino} | ${formatDateBrFull(selectedFlight.volta?.partida)}`);
        descLines.push(`  Horário: ${formatTime(selectedFlight.volta?.partida)}h às ${formatTime(selectedFlight.volta?.chegada)}h (${selectedFlight.volta?.duracao} • ${selectedFlight.volta?.escalas === 0 ? 'Direto' : selectedFlight.volta?.escalas + ' escala(s)'})`);
      }
      descLines.push(`• BAGAGENS: 1 mala de mão (10kg) por passageiro${activeBags > 0 ? ` | Malas de porão (23kg): ${activeBags} inclusa(s)` : ' | Sem bagagem de porão inclusa'}`);
      descLines.push(`• Subtotal Voo: R$ ${flightTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      descLines.push(`──────────────────────────────────────────`);
    }

    if (selectedHotel) {
      descLines.push(`🏨 HOSPEDAGEM:`);
      descLines.push(`• Hotel: ${selectedHotel.nome || selectedHotel.name} (${'⭐'.repeat(selectedHotel.categoria || selectedHotel.stars || 3)})`);
      if (selectedHotel.endereco) descLines.push(`• Endereço: ${selectedHotel.endereco}`);
      descLines.push(`• Quarto: ${selectedHotel.ofertas?.[0]?.tipoQuarto || 'Standard'}`);
      descLines.push(`• Regime: ${selectedHotel.ofertas?.[0]?.nomeRegime || selectedHotel.mealPlan || 'Sem refeições'}`);
      descLines.push(`• Estadia: ${noites} noites (${formatDateShort(dateFrom)} a ${formatDateShort(dateTo)})`);
      descLines.push(`• Subtotal Hotel: R$ ${hotelTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      descLines.push(`──────────────────────────────────────────`);
    }

    if (selectedTransfer) {
      const trf = selectedTransfer.transferPayload || {};
      descLines.push(`🚘 TRANSFER PRIVATIVO:`);
      descLines.push(`• Categoria: ${selectedTransfer.title || selectedTransfer.name}`);
      descLines.push(`• Trajeto: De ${trf.pickupName || 'Origem'} ➔ Para ${trf.dropoffName || 'Destino'}`);
      descLines.push(`• Ida: ${trf.date || formatDateShort(dateFrom)} às ${trf.time || '12:00'}h`);
      if (trf.tripType === 'roundtrip') {
        descLines.push(`• Volta: ${trf.returnDate || formatDateShort(dateTo)} às ${trf.returnTime || '12:00'}h`);
      }
      descLines.push(`• Ocupação: ${trf.adults || totalPax} Adulto(s)${trf.children ? `, ${trf.children} Criança(s)` : ''} | Bagagens: ${trf.largeBags || 0} Mala(s) G, ${trf.smallBags || 0} Mala(s) P`);
      if (trf.flightNumber) descLines.push(`• Rastreio: Voo nº ${trf.flightNumber}`);
      if (trf.needsChildSeat) descLines.push(`• Opcional: Cadeirinha infantil inclusa`);
      if (trf.hasBabyStroller) descLines.push(`• Opcional: Espaço para carrinho de bebê`);
      descLines.push(`• Subtotal Transfer: R$ ${transferTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      descLines.push(`──────────────────────────────────────────`);
    }

    descLines.push(`💰 TOTAL DO PACOTE: R$ ${totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (R$ ${precoPorPessoa.toLocaleString('pt-BR', {minimumFractionDigits: 2})} por passageiro)`);
    descLines.push(`• Condição: 5% de desconto à vista ou em até 12x.`);

    addItem({
      _id: packageSku, 
      sku: packageSku, 
      title: `Pacote: ${destName}`, 
      variantName: `Período: ${formatDateShort(dateFrom)} a ${formatDateShort(dateTo)} • ${totalPax} Viajante(s)`,
      price: totalGeral,
      quantity: 1,
      pax: totalPax, 
      image: selectedHotel?.imagensReais?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=300',
      isTravel: true, 
      description: descLines.join('\n'), 
      packageDetails: { 
        flight: selectedFlight, 
        hotel: selectedHotel, 
        transfer: selectedTransfer,
        totals: { totalGeral, precoPorPessoa, taxasEImpostos, flightTotal, hotelTotal, transferTotal }
      }, 
      addedAt: Date.now()
    });
    
    setTimeout(() => { setLoadingCart(false); navigate('/cart'); }, 600);
  };

  const tripNames = { 'return': 'Ida e volta', 'oneway': 'Só ida' };
  const cabinNames = { 'M': 'Economia', 'W': 'Premium', 'C': 'Negócios', 'F': 'Primeira' };
  const eligiblePaxPreview = parseInt(adults, 10) + parseInt(children, 10);
  const maxHoldBagsAllowed = eligiblePaxPreview * 2;

  return (
    <div className="w-full bg-[#f4f6f8] font-sans min-h-screen pb-20">
      
      {/* ========================================== */}
      {/* 1. BUSCADOR HERÓI RICO (MOTOR DE PACOTES) */}
      {/* ========================================== */}
      <div className="relative z-20 shadow-xl pb-10 pt-4 bg-[#4C1D95]">
        <div className="absolute inset-0 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2000&auto=format&fit=crop" alt="Voos" className="w-full h-full object-cover brightness-[0.40]" />
        </div>
        
        <div className="relative z-20 max-w-6xl mx-auto px-4 md:px-10 mt-6">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-2 drop-shadow-lg">Monte seu Pacote Ideal</h2>
          <p className="text-white/90 font-medium text-sm md:text-lg mb-8 drop-shadow">Voo + Hotel + Transfer em uma única busca.</p>
          
          <div className="bg-white/95 rounded-2xl shadow-2xl border border-white/40 p-5 relative z-10">
            <div className="flex flex-wrap items-center gap-4 mb-5 relative z-[100]">
              <div className="relative" ref={tripRef}>
                <button onClick={() => setShowTripMenu(!showTripMenu)} className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-purple-50 text-sm font-bold text-gray-700 transition">
                  {tripNames[tripType]} <span className="text-[10px] text-purple-600">▼</span>
                </button>
                {showTripMenu && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 z-[999]">
                    <label className="flex items-center gap-3 mb-3 cursor-pointer group">
                      <input type="radio" checked={tripType === 'return'} onChange={() => {setTripType('return'); executarBuscaCompleta();}} className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-bold text-gray-800">Ida e volta</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="radio" checked={tripType === 'oneway'} onChange={() => {setTripType('oneway'); setDateTo(''); executarBuscaCompleta();}} className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-bold text-gray-800">Só ida</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="relative" ref={paxRef}>
                <button onClick={() => setShowPaxMenu(!showPaxMenu)} className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-purple-50 text-sm font-bold text-gray-700 transition">
                  <div className="flex items-center gap-1"><span className="text-purple-600">👤</span> {totalPax} Viajante(s) <span className="text-[10px] ml-1 text-purple-600">▼</span></div>
                  <div className="flex items-center gap-2 border-l pl-3 border-gray-300">
                    <span className="flex items-center gap-1 text-pink-600">🎒 {totalPax}</span>
                    {holdBags > 0 && <span className="flex items-center gap-1 text-blue-600">🧳 {holdBags}</span>}
                  </div>
                </button>
                {showPaxMenu && (
                  <div className="absolute top-full left-0 mt-2 w-[280px] bg-white border border-gray-200 rounded-xl shadow-2xl p-4 z-[999]">
                    <h4 className="font-black text-[10px] uppercase tracking-wider text-purple-900 mb-1 border-b border-gray-100 pb-1.5">Passageiros</h4>
                    <div className="mb-3">
                      <Counter label="Adultos" subLabel="Mais de 11" value={adults} onChange={setAdults} min={1} icon="👤" />
                      <Counter label="Crianças" subLabel="2 - 11 anos" value={children} onChange={setChildren} icon="👦" />
                      <Counter label="Bebês" subLabel="Abaixo de 2 anos" value={infants} onChange={setInfants} icon="👶" />
                    </div>
                    <h4 className="font-black text-[10px] uppercase tracking-wider text-purple-900 mb-1 border-b border-gray-100 pb-1.5">Bagagens extras</h4>
                    <div className="mb-4">
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">🎒</span>
                          <span className="text-xs font-bold text-gray-800">Mala de Cabine (10kg)</span>
                        </div>
                        <span className="font-bold text-gray-800 text-[10px]">{totalPax} Fixa</span>
                      </div>
                      <Counter 
                        label="Mala de Porão (23kg)" 
                        subLabel={`Máx ${maxHoldBagsAllowed} malas`} 
                        value={holdBags} 
                        onChange={setHoldBags} 
                        min={0} 
                        max={maxHoldBagsAllowed} 
                        icon="🧳" 
                      />
                    </div>
                    <button onClick={(e) => { setShowPaxMenu(false); executarBuscaCompleta(e); }} className="w-full py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 cursor-pointer transition">Aplicar Filtros</button>
                  </div>
                )}
              </div>

              <div className="relative" ref={cabinRef}>
                <button onClick={() => setShowCabinMenu(!showCabinMenu)} className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-purple-50 text-sm font-bold text-gray-700 transition">
                  {cabinNames[cabin]} <span className="text-[10px] text-purple-600">▼</span>
                </button>
                {showCabinMenu && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 z-[999]">
                    {Object.keys(cabinNames).map(k => (
                      <label key={k} className="flex items-center gap-3 mb-3 cursor-pointer group">
                        <input type="radio" checked={cabin === k} onChange={() => {setCabin(k); setShowCabinMenu(false); executarBuscaCompleta();}} className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-bold text-gray-800">{cabinNames[k]}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 h-auto md:h-[50px] relative z-10">
              
              <div className="relative col-span-1 md:col-span-3 flex items-center border border-gray-300 rounded-md px-3 hover:border-purple-600 bg-white z-50 h-12 md:h-full" ref={originRef}>
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
                      <li key={loc.id} onMouseDown={(e) => { e.preventDefault(); setOrigin({ id: loc.code || loc.id, name: loc.name, code: loc.code }); setShowOrigin(false); }} className="p-3 hover:bg-purple-50 cursor-pointer text-sm border-b border-gray-50 flex flex-col">
                        <span className="font-bold text-gray-800">{loc.name} ({loc.code})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative col-span-1 md:col-span-3 flex items-center flex-wrap gap-1 border border-gray-300 rounded-md p-1.5 hover:border-purple-600 bg-white z-40 min-h-[48px] md:h-full" ref={destRef}>
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
                      <li key={loc.id} onMouseDown={(e) => { e.preventDefault(); if(!destinations.find(x=>x.id===loc.id)) setDestinations([{id:loc.code || loc.id, name:loc.name, code: loc.code}]); setDestQuery(''); setShowDest(false); }} className="p-3 hover:bg-purple-50 cursor-pointer text-sm border-b border-gray-50 flex flex-col">
                        <span className="font-bold text-gray-800">{loc.name} ({loc.code})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="col-span-1 md:col-span-4 z-[200] h-12 relative" ref={dateRef}>
                <div onClick={() => setShowDateMenu(!showDateMenu)} className="flex items-center justify-between border border-gray-300 rounded-md px-4 h-full cursor-pointer hover:border-purple-600 bg-white">
                  <div className="flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold text-gray-400 leading-tight">Partida</span>
                    <span className="xs:text-xs md:text-sm font-bold text-gray-900 leading-tight">{dateType==='specific' && dateFrom ? formatSafeDate(dateFrom) : 'A qualquer momento'}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-200 mx-2"></div>
                  <div className={`flex flex-col justify-center ${tripType==='oneway'?'opacity-30':''}`}>
                    <span className="text-[9px] uppercase font-bold text-gray-400 leading-tight">Regresso</span>
                    <span className="xs:text-xs md:text-sm font-bold text-gray-900 leading-tight">{tripType==='return' && dateType==='specific' && dateTo ? formatSafeDate(dateTo) : 'A qualquer momento'}</span>
                  </div>
                </div>

                {showDateMenu && (
                  <div className="absolute top-full left-0 w-full md:w-[450px] mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 md:p-5 flex flex-col z-[9999]">
                    <div className="flex gap-2 md:gap-4 border-b border-gray-200 pb-3 mb-4">
                      <button onClick={()=>setDateType('anytime')} className={`flex-1 py-2 rounded font-bold text-xs md:text-sm transition ${dateType==='anytime'?'bg-purple-100 text-purple-700':'text-gray-500 hover:bg-gray-100'}`}>A qualquer momento</button>
                      <button onClick={()=>setDateType('specific')} className={`flex-1 py-2 rounded font-bold text-sm transition ${dateType==='specific'?'bg-purple-100 text-purple-700':'text-gray-500 hover:bg-gray-100'}`}>Datas Específicas</button>
                    </div>
                    {dateType === 'specific' && (
                      <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="flex-1 cursor-pointer">
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-1 cursor-pointer">Partida</label>
                          <input 
                            type="date" 
                            min={getTodayStr()} 
                            value={dateFrom} 
                            onChange={e=>setDateFrom(e.target.value)} 
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            className="w-full border border-gray-300 rounded p-2 text-sm font-bold text-gray-800 outline-none focus:border-purple-600 cursor-pointer"
                          />
                        </div>
                        <div className={`flex-1 cursor-pointer ${tripType==='oneway'?'opacity-30 pointer-events-none':''}`}>
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-1 cursor-pointer">Regresso</label>
                          <input 
                            type="date" 
                            min={dateFrom || getTodayStr()} 
                            value={dateTo} 
                            onChange={e=>setDateTo(e.target.value)} 
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            className="w-full border border-gray-300 rounded p-2 text-sm font-bold text-gray-800 outline-none focus:border-purple-600 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end pt-2">
                      <button onClick={(e) => { setShowDateMenu(false); executarBuscaCompleta(e); }} className="w-full md:w-auto px-6 py-2.5 bg-[#00a698] text-white font-bold rounded-lg hover:bg-[#008f82] transition">Definir Datas</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-1 md:col-span-2 h-12 md:h-full relative z-0">
                <button onClick={(e) => executarBuscaCompleta(e)} disabled={isLoading} className="w-full h-full bg-[#00a698] hover:bg-[#008f82] text-white font-extrabold rounded-md shadow-md text-base uppercase tracking-wide transition">
                  {isLoading ? 'Buscando...' : 'Pesquisar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. PAINEL CENTRAL (CONSTRUÇÃO DO PACOTE - AS 4 COLUNAS CVC) */}
      {/* ========================================== */}
      <div className="max-w-[1300px] mx-auto px-4 mt-8">
        
        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border-l-4 border-red-500 font-bold flex items-center gap-2"><AlertCircle size={20}/> {error}</div>}

        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8 overflow-hidden">
          
          <div className="hidden md:grid grid-cols-4 bg-white border-b border-gray-200">
            <div className="p-4 font-black text-gray-900 text-lg border-r border-gray-100 flex items-center gap-2"><Building size={20}/> Hospedagem</div>
            <div className="p-4 font-black text-gray-900 text-lg border-r border-gray-100 flex items-center gap-2"><Plane size={20}/> Voo</div>
            <div className="p-4 font-black text-gray-900 text-lg border-r border-gray-100 flex items-center gap-2"><Car size={20}/> Serviços</div>
            <div className="p-4 font-black text-gray-900 text-lg flex items-center justify-between">
               <span>Resumo</span>
               <span className={`text-xs px-2 py-1 rounded ${timeLeft < 60 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-600'} flex items-center gap-1`}><Timer size={12}/> {formatTimer(timeLeft)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4">
            
            {/* COLUNA 1: HOTEL (Ocultos caso de erro na API) */}
            <div className="p-5 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between">
              {selectedHotel ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-widest"><Check size={12}/> Selecionado</div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{selectedHotel.nome || selectedHotel.name}</h3>
                  <div className="flex gap-0.5 mb-3 text-yellow-400 text-[10px]">{'⭐'.repeat(selectedHotel.categoria || selectedHotel.stars || 3)}</div>
                  
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    <li className="flex items-start gap-1.5"><Calendar size={14} className="text-gray-400 shrink-0 mt-0.5"/> {noites} noites | {formatDateShort(dateFrom)} - {formatDateShort(dateTo)}</li>
                    <li className="flex items-start gap-1.5"><Coffee size={14} className="text-gray-400 shrink-0 mt-0.5"/> {selectedHotel.ofertas?.[0]?.nomeRegime || selectedHotel.mealPlan || 'Consultar Regime'}</li>
                    <li className="flex items-start gap-1.5"><Building size={14} className="text-gray-400 shrink-0 mt-0.5"/> {selectedHotel.ofertas?.[0]?.tipoQuarto || 'Quarto Standard'}</li>
                    <li className="flex items-start gap-1.5"><Users size={14} className="text-gray-400 shrink-0 mt-0.5"/> {totalPax} passageiros</li>
                  </ul>

                  {selectedHotel.ofertas?.[0] && (
                     <div className="mt-3 bg-gray-50 border border-gray-100 p-2 rounded-lg text-[9px] font-medium text-gray-600 space-y-1">
                        {selectedHotel.ofertas[0].freeCancellation ? (
                           <div className="text-green-700 font-bold flex items-center gap-1">↩️ {selectedHotel.ofertas[0].cancellationDeadline}</div>
                        ) : (
                           <div className="text-red-600 font-bold flex items-center gap-1">❌ Não reembolsável</div>
                        )}
                        {selectedHotel.ofertas[0].deposit && <div><b className="text-orange-600">Deposit:</b> Payment may be required before check-in.</div>}
                        {selectedHotel.ofertas[0].noShow && <div><b className="text-red-600">No-Show:</b> Fee applies if you don't arrive.</div>}
                        {selectedHotel.ofertas[0].excludedTaxes?.length > 0 && (
                           <div className="text-red-700 mt-1">
                             <span className="font-bold block uppercase tracking-wider text-[8px] mb-0.5">⚠️ Payable at property:</span>
                             {selectedHotel.ofertas[0].excludedTaxes.map((t, idx2) => <div key={idx2}>{t.name} {t.amount} {t.currency_code}</div>)}
                           </div>
                        )}
                     </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-10">
                  <Building size={40} className="text-gray-300"/>
                  <span className="text-sm font-bold text-gray-500">Acomodações em Breve</span>
                  <span className="text-[10px] text-center px-4 text-gray-400">Nossa rede de hotéis está sendo integrada. Forme seu pacote com Voos e Transfers por enquanto.</span>
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button onClick={() => { setActiveView('hotel'); window.scrollTo({top: window.innerHeight, behavior: 'smooth'}); }} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-bold text-xs hover:bg-gray-50 transition">Alterar hotel</button>
                <button onClick={() => selectedHotel && setActiveGalleryHotel(selectedHotel)} className="flex-1 py-2 border border-transparent text-blue-600 rounded font-bold text-xs hover:underline transition">Detalhes hotel</button>
              </div>
            </div>

            {/* COLUNA 2: VOO (PREENCHIDO AUTOMATICAMENTE PELA BUSCA) */}
            <div className="p-5 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between">
              {selectedFlight ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-1.5 text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-widest"><Check size={12}/> Selecionado</div>
                     <span className="font-black text-[#4C1D95] text-sm">R$ {flightTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mb-2"><Plane size={12}/> Ida {formatDateBrFull(selectedFlight.ida?.partida)}</span>
                    <div className="flex items-center gap-2 mb-2">
                      <img src={`https://images.kiwi.com/airlines/64x64/${selectedFlight.ida?.companhiaPrincipal}.png`} className="w-4 h-4 rounded-full border border-gray-200 bg-white" alt="Cia"/>
                      <span className="text-[10px] font-bold text-gray-600">{getAirlineName(selectedFlight.ida?.companhiaPrincipal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-center"><span className="font-black text-sm block leading-none">{formatTime(selectedFlight.ida?.partida)}</span><span className="text-[9px] text-gray-500">{selectedFlight.ida?.origem}</span></div>
                      <div className="flex-1 px-1 border-t-2 border-green-500 relative mx-2">
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] bg-gray-50 px-1 text-gray-500 whitespace-nowrap">{selectedFlight.ida?.duracao}</span>
                        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-gray-900 whitespace-nowrap">{selectedFlight.ida?.escalas === 0 ? 'Voo direto' : selectedFlight.ida?.escalas+' paradas'}</span>
                      </div>
                      <div className="text-center"><span className="font-black text-sm block leading-none">{formatTime(selectedFlight.ida?.chegada)}</span><span className="text-[9px] text-gray-500">{selectedFlight.ida?.destino}</span></div>
                    </div>
                  </div>

                  {selectedFlight.volta && (
                    <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 mb-2"><Plane size={12} className="rotate-180"/> Volta {formatDateBrFull(selectedFlight.volta?.partida)}</span>
                      <div className="flex items-center gap-2 mb-2">
                        <img src={`https://images.kiwi.com/airlines/64x64/${selectedFlight.volta?.companhiaPrincipal}.png`} className="w-4 h-4 rounded-full border border-gray-200 bg-white" alt="Cia"/>
                        <span className="text-[10px] font-bold text-gray-600">{getAirlineName(selectedFlight.volta?.companhiaPrincipal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center"><span className="font-black text-sm block leading-none">{formatTime(selectedFlight.volta?.partida)}</span><span className="text-[9px] text-gray-500">{selectedFlight.volta?.origem}</span></div>
                        <div className="flex-1 px-1 border-t-2 border-green-500 relative mx-2">
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] bg-gray-50 px-1 text-gray-500 whitespace-nowrap">{selectedFlight.volta?.duracao}</span>
                        </div>
                        <div className="text-center"><span className="font-black text-sm block leading-none">{formatTime(selectedFlight.volta?.chegada)}</span><span className="text-[9px] text-gray-500">{selectedFlight.volta?.destino}</span></div>
                      </div>
                    </div>
                  )}
                  {localBagCost > 0 && <p className="text-[10px] text-purple-700 font-bold">📦 Inclui {activeBags} mala(s) extra(s)</p>}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4 text-gray-400 gap-3 text-center">
                   <Plane size={36}/>
                   <div>
                     <span className="text-sm font-bold text-gray-600 block">Nenhum voo encontrado</span>
                     <span className="text-[10px] text-gray-500">A companhia não possui voos para essa rota e data.</span>
                   </div>
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button onClick={() => { setActiveView('flight'); window.scrollTo({top: window.innerHeight, behavior: 'smooth'}); }} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-bold text-xs hover:bg-gray-50 transition">Alterar voo</button>
                <button onClick={() => selectedFlight && setExpandedFlightId(expandedFlightId === selectedFlight.id ? null : selectedFlight.id)} className="flex-1 py-2 border border-transparent text-blue-600 rounded font-bold text-xs hover:underline transition">Detalhes voo</button>
              </div>
            </div>

            {/* COLUNA 3: SERVIÇOS (Transfers) */}
            <div className="p-5 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between">
              {selectedTransfer ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-1.5 text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-widest"><Check size={12}/> Selecionado</div>
                     <span className="font-black text-[#E65100] text-sm">R$ {selectedTransfer.price}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-[13px] leading-tight mb-3">{selectedTransfer.title || selectedTransfer.name}</h3>
                  
                  {selectedTransfer.transferPayload && (
                    <ul className="space-y-2 text-[10px] text-gray-600 leading-tight">
                      <li className="flex items-start gap-1.5">
                        <MapPin size={12} className="text-[#E65100] shrink-0 mt-0.5"/> 
                        <div className="flex flex-col gap-0.5">
                          <span><b>De:</b> {selectedTransfer.transferPayload.pickupName}</span>
                          <span><b>Para:</b> {selectedTransfer.transferPayload.dropoffName}</span>
                        </div>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Clock size={12} className="text-gray-400 shrink-0 mt-0.5"/> 
                        <div className="flex flex-col gap-0.5">
                          <span><b>Ida:</b> {selectedTransfer.transferPayload.date} às {selectedTransfer.transferPayload.time}h</span>
                          {selectedTransfer.transferPayload.tripType === 'roundtrip' && (
                            <span><b>Volta:</b> {selectedTransfer.transferPayload.returnDate} às {selectedTransfer.transferPayload.returnTime}h</span>
                          )}
                        </div>
                      </li>
                      <li className="flex items-start gap-1.5">
                         <Users size={12} className="text-gray-400 shrink-0"/> 
                         <span>{selectedTransfer.transferPayload.adults + selectedTransfer.transferPayload.children} Passageiros</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                         <Briefcase size={12} className="text-gray-400 shrink-0"/> 
                         <span>{selectedTransfer.transferPayload.largeBags} Mala(s) G • {selectedTransfer.transferPayload.smallBags} Mala(s) P</span>
                      </li>
                      {(selectedTransfer.transferPayload.needsChildSeat || selectedTransfer.transferPayload.hasBabyStroller || selectedTransfer.transferPayload.flightNumber) && (
                        <li className="flex items-start gap-1.5 text-green-700 font-bold mt-1">
                          <ShieldCheck size={12} className="shrink-0 mt-0.5"/>
                          <span>
                            {selectedTransfer.transferPayload.flightNumber && `Voo: ${selectedTransfer.transferPayload.flightNumber} `}
                            {selectedTransfer.transferPayload.needsChildSeat && '• Cadeirinha '}
                            {selectedTransfer.transferPayload.hasBabyStroller && '• Carrinho '}
                          </span>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="text-center my-auto px-2">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3"><Car size={20} className="text-yellow-600"/></div>
                  <h4 className="text-xs font-bold text-blue-600 mb-1">Aproveite ainda mais a sua viagem!</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Adicione serviços ao seu pacote e curta ainda mais a sua estadia.</p>
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button onClick={() => { setActiveView('transfer'); window.scrollTo({top: window.innerHeight, behavior: 'smooth'}); }} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-bold text-xs hover:bg-gray-50 transition">{selectedTransfer ? 'Alterar serviço' : 'Adicionar serviços'}</button>
                {selectedTransfer && <button onClick={removeTransfer} className="flex-1 py-2 border border-transparent text-red-600 rounded font-bold text-xs hover:underline transition">Remover</button>}
              </div>
            </div>

            {/* COLUNA 4: RESUMO */}
            <div className="p-5 bg-white flex flex-col justify-between">
              <div>
                <p className="text-[11px] text-gray-500 mb-3 font-bold uppercase tracking-wider">Subtotais do Pacote</p>
                
                <div className="space-y-1 mb-4 pb-3 border-b border-gray-100">
                  {selectedFlight && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-600 flex items-center gap-1"><Plane size={10}/> Voo</span>
                      <span className="text-[11px] font-bold text-gray-800">R$ {flightTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                  )}
                  {selectedHotel && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-600 flex items-center gap-1"><Building size={10}/> Hospedagem</span>
                      <span className="text-[11px] font-bold text-gray-800">R$ {hotelTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                  )}
                  {selectedTransfer && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-600 flex items-center gap-1"><Car size={10}/> Transfer</span>
                      <span className="text-[11px] font-bold text-gray-800">R$ {transferTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-gray-500 mb-2">Para {totalPax} viajante(s)</p>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Preço por viajante</span>
                  <span className="text-sm font-medium text-gray-900">R$ {precoBasePessoa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Taxas e impostos (por viajante)</span>
                  <span className="text-sm font-medium text-gray-900">R$ {(taxasEImpostos || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-900">Valor final</span>
                  <span className="text-2xl font-black text-gray-900">R$ {totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <p className="text-[10px] text-right font-bold text-green-600 mb-4">5% de desconto à vista ou em até 12x</p>

                <button 
                  onClick={handleCheckoutPackage}
                  disabled={loadingCart || (!selectedFlight && !selectedHotel && !selectedTransfer)}
                  className="w-full bg-[#FFD700] hover:bg-[#e5c100] text-gray-900 font-bold py-3 rounded shadow-sm transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {loadingCart ? 'Processando...' : <><ShoppingCart size={16}/> Comprar pacote</>}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================== */}
        {/* MODAL DE DETALHES DO VOO SELECIONADO */}
        {/* ========================================== */}
        {expandedFlightId && selectedFlight && createPortal(
          <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-2xl rounded-2xl p-6 relative shadow-2xl">
                <button onClick={() => setExpandedFlightId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20}/></button>
                <h3 className="font-black text-lg mb-4 text-gray-900">Itinerário Completo do Voo</h3>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                   <div className="bg-gray-50 p-4 rounded-xl border">
                      <p className="font-bold text-xs text-purple-700 uppercase mb-2">Voo de Ida ({getAirlineName(selectedFlight.ida?.companhiaPrincipal)})</p>
                      <p className="text-sm font-bold">{selectedFlight.ida?.origem} ➔ {selectedFlight.ida?.destino}</p>
                      <p className="text-xs text-gray-600 mt-1">Partida: {formatDateBrFull(selectedFlight.ida?.partida)} às {formatTime(selectedFlight.ida?.partida)}</p>
                      <p className="text-xs text-gray-600">Duração: {selectedFlight.ida?.duracao} • {selectedFlight.ida?.escalas === 0 ? 'Direto' : selectedFlight.ida?.escalas+' paradas'}</p>
                   </div>
                   {selectedFlight.volta && (
                      <div className="bg-gray-50 p-4 rounded-xl border">
                         <p className="font-bold text-xs text-orange-700 uppercase mb-2">Voo de Volta ({getAirlineName(selectedFlight.volta?.companhiaPrincipal)})</p>
                         <p className="text-sm font-bold">{selectedFlight.volta?.origem} ➔ {selectedFlight.volta?.destino}</p>
                         <p className="text-xs text-gray-600 mt-1">Partida: {formatDateBrFull(selectedFlight.volta?.partida)} às {formatTime(selectedFlight.volta?.partida)}</p>
                         <p className="text-xs text-gray-600">Duração: {selectedFlight.volta?.duracao} • {selectedFlight.volta?.escalas === 0 ? 'Direto' : selectedFlight.volta?.escalas+' paradas'}</p>
                      </div>
                   )}
                </div>
                <button onClick={() => setExpandedFlightId(null)} className="mt-6 w-full bg-[#4C1D95] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wide">Fechar Detalhes</button>
             </div>
          </div>,
          document.body
        )}

        {/* ========================================== */}
        {/* 3. A LISTA INFERIOR DE ALTERAÇÃO (GAVETA) */}
        {/* ========================================== */}
        {activeView !== 'none' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-10 overflow-hidden animate-in slide-in-from-top-4 duration-300">
            
            <div className="bg-[#4C1D95] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {activeView === 'hotel' ? 'Escolha sua nova hospedagem' : activeView === 'flight' ? 'Escolha seu novo voo' : 'Adicionar Transfer Opcional'}
              </h3>
              <button onClick={() => { setActiveView('none'); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-white hover:text-gray-300 font-bold text-lg">✕ Fechar</button>
            </div>

            <div className="p-6">
              
              {/* 🚘 SE FOR TRANSFER */}
              {activeView === 'transfer' && (
                <PalastoreTransfers 
                  isPackageMode={true}
                  pacoteParams={searchParams}
                  onSelectForPackage={(transferObj) => {
                    changeSelectedTransfer(transferObj);
                    setActiveView('none'); 
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {/* RENDERIZAÇÃO DOS HOTÉIS COM FILTRO DE IMAGEM DA ETG ADICIONADO */}
              {activeView === 'hotel' && (
                <div className="space-y-4">
                  {hotelsResults.map((hotel) => {
                    const isSelected = selectedHotel && hotel.hotelId === selectedHotel.hotelId;
                    const oferta = hotel.ofertas?.[0];
                    const roomImgs = findRoomImages(oferta, hotel.room_groups, hotel.imagensReais);
                    const coverImg = roomImgs.length > 0 ? roomImgs[0] : (getSafeImageUrl(hotel.imagensReais) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=300');
                    
                    return (
                      <div key={hotel.hotelId} className={`flex flex-col sm:flex-row border rounded-lg overflow-hidden p-4 items-center gap-4 ${isSelected ? 'border-[#4C1D95] bg-purple-50/10' : 'border-gray-200'}`}>
                        <img src={coverImg} className="w-32 h-24 object-cover rounded bg-gray-100" alt="Hotel"/>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{hotel.nome}</h4>
                          <p className="text-xs text-orange-400 mb-1">{'⭐'.repeat(hotel.categoria || 3)}</p>
                          <div className="text-[10px] text-gray-600 mb-2">
                             <p><b>Quarto:</b> {oferta?.tipoQuarto || 'Standard'}</p>
                             <p><b>Regime:</b> {oferta?.nomeRegime || 'Consultar'}</p>
                          </div>
                          
                          {oferta?.excludedTaxes?.length > 0 && (
                            <div className="mt-1 flex flex-col items-start">
                              <span className="text-[8px] font-black text-red-600 uppercase tracking-wider">⚠️ Payable at property:</span>
                              {oferta.excludedTaxes.map((t, idx2) => (
                                <span key={idx2} className="text-[9px] text-red-700">{t.name} {t.amount} {t.currency_code}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="w-full sm:w-40 text-right">
                          <span className="text-xl font-black block text-gray-900 mb-2">R$ {oferta?.precoVenda || 0}</span>
                          <button onClick={() => { changeSelectedHotel(hotel); setActiveView('none'); window.scrollTo({top:0, behavior:'smooth'}); }} className="w-full bg-[#4C1D95] text-white font-bold py-2 rounded text-xs hover:bg-purple-900 transition">
                            {isSelected ? 'Selecionado' : 'Selecionar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* RENDERIZAÇÃO DOS VOOS NA GAVETA */}
              {activeView === 'flight' && (
                <div className="space-y-4">
                  {flightsResults.length > 0 ? flightsResults.map((voo) => {
                    const isSelected = selectedFlight && voo.id === selectedFlight.id;
                    const baseFare = parseInt(voo.precoFinal || voo.price || voo.precoBase || voo.safeTotal, 10) || 0;
                    
                    const specUnitBag = voo.bags_price?.['1'] ? Math.ceil(voo.bags_price['1']) : 120;
                    const specBagMulti = !voo.volta ? 2 : 1;
                    const specBagCost = activeBags > 0 ? (activeBags * specUnitBag * specBagMulti) : 0;
                    const displayTotal = baseFare + specBagCost;

                    return (
                      <div key={voo.id} className={`flex flex-col sm:flex-row border rounded-xl overflow-hidden p-5 items-center gap-6 ${isSelected ? 'border-[#4C1D95] bg-purple-50/10' : 'border-gray-200'}`}>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <img src={`https://images.kiwi.com/airlines/64x64/${voo.ida?.companhiaPrincipal}.png`} className="w-6 h-6 rounded-full border bg-white" alt="Cia"/>
                            <span className="text-[10px] font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{getAirlineName(voo.ida?.companhiaPrincipal)}</span>
                            <span className="text-xs font-bold text-gray-800">Ida: {formatTime(voo.ida?.partida)} ({voo.ida?.origem}) ➔ {formatTime(voo.ida?.chegada)} ({voo.ida?.destino}) • {voo.ida?.duracao}</span>
                          </div>
                          {voo.volta && (
                            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                              <img src={`https://images.kiwi.com/airlines/64x64/${voo.volta?.companhiaPrincipal}.png`} className="w-6 h-6 rounded-full border bg-white" alt="Cia"/>
                              <span className="text-[10px] font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{getAirlineName(voo.volta?.companhiaPrincipal)}</span>
                              <span className="text-xs font-bold text-gray-800">Volta: {formatTime(voo.volta?.partida)} ({voo.volta?.origem}) ➔ {formatTime(voo.volta?.chegada)} ({voo.volta?.destino}) • {voo.volta?.duracao}</span>
                            </div>
                          )}
                          <button onClick={() => setExpandedFlightId(voo.id)} className="text-xs text-blue-600 font-bold hover:underline">Ver detalhes do voo</button>
                        </div>
                        <div className="w-full sm:w-40 text-right">
                          <span className="text-xl font-black block text-gray-900 mb-1">R$ {displayTotal}</span>
                          {specBagCost > 0 && <span className="text-[9px] text-gray-500 block mb-2 font-bold">(Incluso R$ {specBagCost} ref a bagagens)</span>}
                          <button onClick={() => { changeSelectedFlight(voo); setActiveView('none'); window.scrollTo({top:0, behavior:'smooth'}); }} className="w-full bg-[#4C1D95] text-white font-bold py-2 rounded text-xs hover:bg-purple-900 transition">
                            {isSelected ? 'Selecionado' : 'Selecionar'}
                          </button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="p-8 text-center text-gray-500 font-bold bg-gray-50 rounded-xl border border-gray-200">
                       Nenhum voo retornado pela companhia aérea para esta rota e data.
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>
        )}
      </div>

      {/* MODAL GALERIA HOTEL */}
      {activeGalleryHotel && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#4C1D95] p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-white truncate pr-4">{activeGalleryHotel.nome}</h3>
              <button onClick={() => setActiveGalleryHotel(null)} className="text-white hover:text-gray-300 font-bold">✕</button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-100">
              {activeGalleryHotel.imagensReais && activeGalleryHotel.imagensReais.length > 0 ? (
                parseImagesList(activeGalleryHotel.imagensReais).map((imgUrl, i) => (
                  <img key={i} src={imgUrl} className="w-full h-32 object-cover rounded border border-gray-200" alt="Foto"/>
                ))
              ) : (
                <div className="col-span-full py-10 text-center text-gray-500 font-bold text-sm">Sem fotos disponíveis no banco.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}