import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import usePackageStore from '../store/usePackageStore';
import useCartStore from '../store/useCartStore';

import PalastoreTransfers from '../components/PalastoreTransfers';

import { 
  Calendar, Users, Check, AlertCircle, 
  Plane, Building, Car, X, 
  Briefcase, Luggage, Info, ArrowRightLeft, MapPin, Clock, ShoppingCart, ShieldCheck, Timer
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

const formatDateShort = (dateStr) => {
  if(!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
  } catch(e) { return ''; }
};

const calcularNoites = (ida, volta) => {
  if(!ida || !volta) return 2;
  return Math.max(1, Math.ceil(Math.abs(new Date(volta) - new Date(ida)) / (1000 * 60 * 60 * 24)));
};

// ==========================================
// FUNÇÕES DE PADRÃO DE OURO DO HOTEL (ETG)
// ==========================================
const getSafeImageUrl = (imgInput) => {
  if (!imgInput) return null;
  let rawUrl = typeof imgInput === 'string' ? imgInput : (imgInput?.url || imgInput?.image || '');
  if (!rawUrl) return null;
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
    if (foundImages.length === 0 && oferta?.rg_ext) {
      const matchedPartial = rGroups.find(rg => {
        return rg.rg_ext && String(rg.rg_ext.class) === String(oferta.rg_ext.class) && String(rg.rg_ext.quality) === String(oferta.rg_ext.quality);
      });
      if (matchedPartial && matchedPartial.images) foundImages = parseImagesList(matchedPartial.images);
    }
    if (foundImages.length === 0 && oferta?.tipoQuartoRaw) {
      const offerNameLower = oferta.tipoQuartoRaw.toLowerCase();
      const matchedByName = rGroups.find(rg => {
        if (!rg.name) return false;
        const staticNameLower = rg.name.toLowerCase();
        const mainWords = staticNameLower.split(' ').filter(w => w.length > 4); 
        if (mainWords.length > 0) return mainWords.some(word => offerNameLower.includes(word));
        return offerNameLower.includes(staticNameLower);
      });
      if (matchedByName && matchedByName.images) foundImages = parseImagesList(matchedByName.images);
    }
    if (foundImages.length === 0 && rGroups.length === 1) {
      if (rGroups[0].images) foundImages = parseImagesList(rGroups[0].images);
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

export default function FlightHotelPackage() {
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  
  const { 
    activeView, setActiveView,
    searchParams, setSearchParams,
    flightsResults, hotelsResults, 
    setFlightsResults, setHotelsResults, 
    selectedFlight, selectedHotel, selectedTransfer,
    changeSelectedFlight, changeSelectedHotel, changeSelectedTransfer,
    removeTransfer, isLoading, setLoading, error, setError
  } = usePackageStore();

  const [loadingCart, setLoadingCart] = useState(false);
  const [activeGalleryHotel, setActiveGalleryHotel] = useState(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [expandedFlightId, setExpandedFlightId] = useState(null);
  
  // ==========================================
  // ESTADO DO CRONÔMETRO DE 10 MINUTOS
  // ==========================================
  const [timeLeft, setTimeLeft] = useState(600);

  const [tempOrigin, setTempOrigin] = useState(searchParams?.origin?.name || 'São Paulo');
  const [selectedOriginObj, setSelectedOriginObj] = useState(searchParams?.origin || { id: 'SAO', name: 'São Paulo' });
  const [originResults, setOriginResults] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  const [tempDest, setTempDest] = useState(searchParams?.destination?.name || 'Rio de Janeiro');
  const [selectedDestObj, setSelectedDestObj] = useState(searchParams?.destination || { id: 'RIO', name: 'Rio de Janeiro' });
  const [destResults, setDestResults] = useState([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [tempDateOut, setTempDateOut] = useState(searchParams?.dateOut || '2026-12-18');
  const [tempDateIn, setTempDateIn] = useState(searchParams?.dateIn || '2026-12-20');
  const [tempPax, setTempPax] = useState(searchParams?.adults || 2);
  
  // ==========================================
  // BAGAGEM UNIFICADA (Idêntica ao Voo Avulso)
  // ==========================================
  const [tempHoldBags, setTempHoldBags] = useState(searchParams?.holdBags || 0);

  // Variáveis Básicas
  const totalPax = searchParams?.adults || 2;
  const noites = calcularNoites(searchParams?.dateOut, searchParams?.dateIn);

  // Cálculos Dinâmicos Locais (Precisão Absoluta)
  const bagMultiplier = selectedFlight && !selectedFlight.volta ? 2 : 1;
  const unitBagPrice = selectedFlight?.bags_price?.['1'] ? Math.ceil(selectedFlight.bags_price['1']) : 120;
  const localBagCost = (searchParams?.holdBags || 0) > 0 ? (searchParams.holdBags * unitBagPrice * bagMultiplier) : 0;

  const baseFlightFare = selectedFlight ? (Number(selectedFlight.precoBase || selectedFlight.safeTotal || selectedFlight.precoFinal || selectedFlight.price) || 0) : 0;
  const localFlightTotal = baseFlightFare + localBagCost;
  
  const localHotelTotal = selectedHotel ? (Number(selectedHotel.ofertas?.[0]?.precoVenda || selectedHotel.price) || 0) : 0;
  const localTransferTotal = selectedTransfer ? (Number(selectedTransfer.price) || 0) : 0;

  const localTotalGeral = localFlightTotal + localHotelTotal + localTransferTotal;
  const localPrecoPorPessoa = Math.ceil(localTotalGeral / (totalPax || 1));
  const localTaxasEImpostos = Math.ceil(localPrecoPorPessoa * 0.12);
  const localPrecoBasePessoa = Math.max(0, localPrecoPorPessoa - localTaxasEImpostos);

  // ==========================================
  // EFEITO DO CRONÔMETRO
  // ==========================================
  useEffect(() => {
    if (isLoading) {
       setTimeLeft(600); // Reseta o relógio durante o loading
       return;
    }
    if (timeLeft <= 0) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, isLoading]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (tempOrigin.trim().length >= 2) {
        try {
          const res = await fetch(`${WORKER_URL}/locations?term=${encodeURIComponent(tempOrigin.trim())}`);
          const data = await res.json();
          setOriginResults(data.locations || []);
          if ((data.locations || []).length > 0) setShowOriginDropdown(true);
        } catch (e) {}
      } else { setOriginResults([]); setShowOriginDropdown(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [tempOrigin]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (tempDest.trim().length >= 2) {
        try {
          const res = await fetch(`${WORKER_URL}/locations?term=${encodeURIComponent(tempDest.trim())}`);
          const data = await res.json();
          setDestResults(data.locations || []);
          if ((data.locations || []).length > 0) setShowDestDropdown(true);
        } catch (e) {}
      } else { setDestResults([]); setShowDestDropdown(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [tempDest]);

  const executarBuscaCompleta = async (origObj, destObj, dateOutStr, dateInStr, paxNum, bagsUnificadas) => {
    setLoading(true); setError(null);
    try {
      const destCode = destObj.id || 'RIO';
      const cleanDestName = destObj.name.split(',')[0];

      let voos = [];
      let hoteis = [];

      const resVoo = await fetch(`${WORKER_URL}/search-flights?origin=${origObj.id}&destination=${destCode}&dateFrom=${dateOutStr}&dateToRange=${dateOutStr}&returnFrom=${dateInStr}&returnToRange=${dateInStr}&adults=${paxNum}&children=0&infants=0&cabin=M&sort=price`);
      const dataVoo = await resVoo.json();
      if (dataVoo.status === 'success' && dataVoo.voos) {
        voos = dataVoo.voos;
        setFlightsResults(voos);
      }

      let cityLat = -23.5505; let cityLng = -46.6333;
      const isTest = cleanDestName.toLowerCase().includes('rio') || cleanDestName.toLowerCase().includes('janeiro') || cleanDestName.toLowerCase().includes('york') || cleanDestName.toLowerCase().includes('paulo');
      const hidsToSearch = isTest ? [10004834, 8819557, 9015534, 8663536] : [];

      if (hidsToSearch.length > 0) {
        const response = await fetch(`${WORKER_URL}/serp-hotels`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hids: hidsToSearch, checkin: dateOutStr, checkout: dateInStr, residency: 'br', currency: "BRL", guests: [{ adults: paxNum, children: [] }] })
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
              imagensReais: dbInfo?.images || h.images || [], 
              room_groups: dbInfo?.room_groups || [],
              description: dbInfo?.description,
              ofertas: (h.rates || []).map(r => {
                // INTEGRANDO PADRÃO ETG
                const taxes = r.payment_options?.payment_types?.[0]?.tax_data?.taxes?.filter(t => !t.included_by_supplier) || [];
                const exactCancellation = r.payment_options?.payment_types?.[0]?.cancellation_penalties?.free_cancellation_before;

                return {
                  tipoQuartoRaw: r.room_name,
                  tipoQuarto: formatRoomName(r), 
                  codigoRegime: r.meal === 'breakfast' ? 'BB' : 'RO', 
                  nomeRegime: r.meal_data?.value || 'Sem refeições',
                  precoVenda: parseFloat(r.payment_options?.payment_types?.[0]?.amount || 0) * 5.1, 
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
        }
      }

      if (voos.length > 0) changeSelectedFlight(voos[0]);
      if (hoteis.length > 0) changeSelectedHotel(hoteis[0]);

    } catch (err) {
      setError("Erro ao processar busca nas APIs de turismo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchParams?.dateOut && !isLoading) {
      const defaultOrig = { id: 'SAO', name: 'São Paulo' };
      const defaultDest = { id: 'GIG', name: 'Rio de Janeiro' };
      const defaultOut = '2026-12-18';
      const defaultIn = '2026-12-20';
      
      setSearchParams({ origin: defaultOrig, destination: defaultDest, dateOut: defaultOut, dateIn: defaultIn, adults: 2, holdBags: 0 });
      executarBuscaCompleta(defaultOrig, defaultDest, defaultOut, defaultIn, 2, 0);
    }
  }, [searchParams, isLoading, setSearchParams]);

  const handleConfirmNewSearch = (e) => {
    e.preventDefault();
    setIsSearchModalOpen(false);
    
    const resolvedOrig = selectedOriginObj || { id: 'SAO', name: tempOrigin };
    const resolvedDest = selectedDestObj || { id: 'GIG', name: tempDest };
    
    setSearchParams({ 
      origin: resolvedOrig, 
      destination: resolvedDest, 
      dateOut: tempDateOut, 
      dateIn: tempDateIn, 
      adults: Number(tempPax),
      holdBags: Number(tempHoldBags)
    });
    executarBuscaCompleta(resolvedOrig, resolvedDest, tempDateOut, tempDateIn, Number(tempPax), Number(tempHoldBags));
  };

  const handleCheckoutPackage = () => {
    if (!selectedFlight && !selectedHotel && !selectedTransfer) return alert("Selecione pelo menos um serviço.");
    if (timeLeft === 0) return alert("A oferta expirou. Por favor, atualize a busca.");

    setLoadingCart(true);
    const packageSku = `PK-${Date.now()}`;
    const destName = searchParams.destination?.name?.split(',')[0] || 'Destino';
    
    let descLines = [];
    descLines.push(`📋 PACOTE COMPLETO: ${destName.toUpperCase()}`);
    descLines.push(`👥 Viajantes: ${totalPax} passageiro(s) | 📅 ${formatDateShort(searchParams.dateOut)} até ${formatDateShort(searchParams.dateIn)} (${noites} noites)`);
    descLines.push(`──────────────────────────────────────────`);

    if (selectedFlight) {
      const ciaIda = getAirlineName(selectedFlight.ida?.companhiaPrincipal);
      const ciaVolta = selectedFlight.volta?.companhiaPrincipal ? getAirlineName(selectedFlight.volta.companhiaPrincipal) : null;
      let ciaStr = ciaVolta && ciaVolta !== ciaIda ? `Ida: ${ciaIda} / Volta: ${ciaVolta}` : ciaIda;

      descLines.push(`✈️ PASSAGENS AÉREAS (${ciaStr}):`);
      descLines.push(`• IDA: ${selectedFlight.ida?.origem} ➔ ${selectedFlight.ida?.destino} | ${formatDateBrFull(selectedFlight.ida?.partida)}`);
      if (selectedFlight.volta) descLines.push(`• VOLTA: ${selectedFlight.volta?.origem} ➔ ${selectedFlight.volta?.destino} | ${formatDateBrFull(selectedFlight.volta?.partida)}`);
      
      descLines.push(`• BAGAGENS: 1 mala de mão (10kg) por passageiro${searchParams.holdBags > 0 ? ` | Malas de porão (23kg): ${searchParams.holdBags} inclusa(s)` : ' | Sem bagagem de porão inclusa'}`);
      descLines.push(`• Subtotal Voo: R$ ${localFlightTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      descLines.push(`──────────────────────────────────────────`);
    }

    if (selectedHotel) {
      descLines.push(`🏨 HOSPEDAGEM:`);
      descLines.push(`• Hotel: ${selectedHotel.nome || selectedHotel.name} (${'⭐'.repeat(selectedHotel.categoria || selectedHotel.stars || 3)})`);
      descLines.push(`• Quarto: ${selectedHotel.ofertas?.[0]?.tipoQuarto || 'Standard'}`);
      descLines.push(`• Regime: ${selectedHotel.ofertas?.[0]?.nomeRegime || 'Sem refeições'}`);
      descLines.push(`• Subtotal Hotel: R$ ${localHotelTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      descLines.push(`──────────────────────────────────────────`);
    }

    if (selectedTransfer) {
      const trf = selectedTransfer.transferPayload || {};
      descLines.push(`🚘 TRANSFER PRIVATIVO:`);
      descLines.push(`• Trajeto: De ${trf.pickupName || 'Origem'} ➔ Para ${trf.dropoffName || 'Destino'}`);
      descLines.push(`• Subtotal Transfer: R$ ${localTransferTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      descLines.push(`──────────────────────────────────────────`);
    }

    descLines.push(`💰 TOTAL DO PACOTE: R$ ${localTotalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (R$ ${localPrecoPorPessoa.toLocaleString('pt-BR', {minimumFractionDigits: 2})} por passageiro)`);
    descLines.push(`• Inclui R$ ${(localTaxasEImpostos || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})} de taxas e tributos por pessoa.`);
    descLines.push(`• Condição: 5% de desconto à vista ou em até 12x.`);

    addItem({
      _id: packageSku, sku: packageSku, title: `Pacote: ${destName}`, 
      variantName: `Período: ${formatDateShort(searchParams.dateOut)} a ${formatDateShort(searchParams.dateIn)} • ${totalPax} Viajante(s)`,
      price: localTotalGeral, quantity: 1, pax: totalPax, 
      image: getSafeImageUrl(selectedHotel?.imagensReais) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=300',
      isTravel: true, description: descLines.join('\n'), 
      packageDetails: { flight: selectedFlight, hotel: selectedHotel, transfer: selectedTransfer, totals: { totalGeral: localTotalGeral, precoPorPessoa: localPrecoPorPessoa, taxasEImpostos: localTaxasEImpostos, flightTotal: localFlightTotal, hotelTotal: localHotelTotal, transferTotal: localTransferTotal } }, 
      addedAt: Date.now()
    });
    
    setTimeout(() => { setLoadingCart(false); navigate('/cart'); }, 600);
  };

  return (
    <div className="w-full bg-[#f4f6f8] font-sans min-h-screen pb-20">
      
      {/* 1. BARRA SUPERIOR (ROXO PALASTORE) */}
      <div className="bg-[#4C1D95] py-3 shadow-md sticky top-0 z-40">
        <div className="max-w-[1300px] mx-auto px-4 flex flex-col md:flex-row items-center gap-4 text-sm font-medium text-white">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col"><span className="font-black text-lg text-white leading-none">{searchParams?.origin?.id || 'SAO'}</span><span className="text-[10px] text-white/70 uppercase">{searchParams?.origin?.name?.split(',')[0] || 'São Paulo'}</span></div>
            <ArrowRightLeft size={16} className="text-[#E65100]"/>
            <div className="flex flex-col"><span className="font-black text-lg text-white leading-none">{searchParams?.destination?.id || 'RIO'}</span><span className="text-[10px] text-white/70 uppercase">{searchParams?.destination?.name?.split(',')[0] || 'Rio de Janeiro'}</span></div>
            
            <div className="w-px h-8 bg-white/20 mx-2 hidden md:block"></div>
            <div className="flex items-center gap-2"><Calendar size={18} className="text-[#E65100]"/> <span className="font-bold text-xs">{formatDateShort(searchParams?.dateOut)} - {formatDateShort(searchParams?.dateIn)}</span></div>
            <div className="w-px h-8 bg-white/20 mx-2 hidden md:block"></div>
            <div className="flex items-center gap-2"><Users size={18} className="text-[#E65100]"/> <span className="font-bold text-xs">1 Quarto(s), {totalPax} Hóspedes</span></div>
            <div className="w-px h-8 bg-white/20 mx-2 hidden md:block"></div>
            <div className="flex items-center gap-2"><Luggage size={18} className="text-[#E65100]"/> <span className="font-bold text-xs">{searchParams?.holdBags || 0} Mala(s) 23kg</span></div>
          </div>
          <button onClick={() => setIsSearchModalOpen(true)} className="bg-[#E65100] hover:bg-orange-600 text-white font-bold px-6 py-2 rounded-full shadow transition text-xs uppercase tracking-wider">
            Alterar Busca
          </button>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-4 mt-8">
        
        {isLoading && <div className="text-center py-6 text-[#4C1D95] font-black animate-pulse">Sincronizando voos e hotéis para o seu pacote...</div>}
        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border-l-4 border-red-500 font-bold flex items-center gap-2"><AlertCircle size={20}/> {error}</div>}

        {selectedHotel && (
          <h1 className="text-xl md:text-2xl font-black text-gray-800 mb-6">{selectedHotel.nome || selectedHotel.name} - {noites+1} dias / {noites} noites</h1>
        )}

        {/* 2. PAINEL DE 4 COLUNAS (CVC STYLE) */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8 overflow-hidden">
          
          <div className="hidden md:grid grid-cols-4 bg-white border-b border-gray-200">
            <div className="p-4 font-black text-gray-900 text-lg border-r border-gray-100">Hospedagem</div>
            <div className="p-4 font-black text-gray-900 text-lg border-r border-gray-100">Voo</div>
            <div className="p-4 font-black text-gray-900 text-lg border-r border-gray-100">Serviços</div>
            <div className="p-4 font-black text-gray-900 text-lg flex items-center justify-between">
               <span>Resumo</span>
               {/* MINI TIMER HEADER */}
               <span className={`text-xs px-2 py-1 rounded ${timeLeft < 60 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-600'} flex items-center gap-1`}><Timer size={12}/> {formatTimer(timeLeft)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4">
            
            {/* COLUNA 1: HOTEL (PADRÃO DE OURO ETG) */}
            <div className="p-5 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between">
              {selectedHotel ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-widest"><Check size={12}/> Selecionado</div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{selectedHotel.nome || selectedHotel.name}</h3>
                  <div className="flex gap-0.5 mb-3 text-yellow-400 text-[10px]">{'⭐'.repeat(selectedHotel.categoria || selectedHotel.stars || 3)}</div>
                  
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    <li className="flex items-start gap-1.5"><Calendar size={14} className="text-gray-400 shrink-0 mt-0.5"/> {noites} noites | {formatDateShort(searchParams?.dateOut)} - {formatDateShort(searchParams?.dateIn)}</li>
                    <li className="flex items-start gap-1.5"><Coffee size={14} className="text-gray-400 shrink-0 mt-0.5"/> {selectedHotel.ofertas?.[0]?.nomeRegime || 'Consultar Regime'}</li>
                    <li className="flex items-start gap-1.5"><Building size={14} className="text-gray-400 shrink-0 mt-0.5"/> {selectedHotel.ofertas?.[0]?.tipoQuarto || 'Quarto Standard'}</li>
                    <li className="flex items-start gap-1.5"><Users size={14} className="text-gray-400 shrink-0 mt-0.5"/> {totalPax} passageiros</li>
                  </ul>

                  {/* ALERTAS ETG DIRETOS DA OFERTA */}
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
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2"><Building size={32}/><span>Nenhum hotel</span></div>
              )}

              <div className="mt-5 flex gap-2">
                <button onClick={() => { setActiveView('hotel'); window.scrollTo({top: window.innerHeight, behavior: 'smooth'}); }} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded font-bold text-xs hover:bg-gray-50 transition">Alterar hotel</button>
                <button onClick={() => selectedHotel && setActiveGalleryHotel(selectedHotel)} className="flex-1 py-2 border border-transparent text-blue-600 rounded font-bold text-xs hover:underline transition">Detalhes hotel</button>
              </div>
            </div>

            {/* COLUNA 2: VOO (COM CUSTO DE BAGAGEM UNIFICADA) */}
            <div className="p-5 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between">
              {selectedFlight ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-1.5 text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-widest"><Check size={12}/> Selecionado</div>
                     <span className="font-black text-[#4C1D95] text-sm">R$ {localFlightTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
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
                  {searchParams?.holdBags > 0 && <p className="text-[10px] text-purple-700 font-bold">📦 Inclui {searchParams.holdBags} mala(s) de porão unificada(s)</p>}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2"><Plane size={32}/><span>Nenhum voo</span></div>
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
                     <span className="font-black text-[#E65100] text-sm">R$ {localTransferTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
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

            {/* COLUNA 4: RESUMO COM CRONÔMETRO DE VALIDADE */}
            <div className="p-5 bg-white flex flex-col justify-between">
              <div>
                {/* AVISO DE EXPIRAÇÃO */}
                {timeLeft === 0 && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold p-2 rounded-lg mb-3 flex items-center gap-1.5 shadow-inner">
                    <AlertCircle size={14} className="shrink-0"/> Oferta expirada. Refaça a busca para atualizar os preços.
                  </div>
                )}

                <div className="flex justify-between items-center mb-3">
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Subtotais do Pacote</p>
                  {timeLeft > 0 && <span className={`text-[10px] font-black ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-[#4C1D95]'}`}>⏱ {formatTimer(timeLeft)}</span>}
                </div>
                
                <div className="space-y-1 mb-4 pb-3 border-b border-gray-100">
                  {selectedFlight && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-600 flex items-center gap-1"><Plane size={10}/> Voo (+ Malas)</span>
                      <span className="text-[11px] font-bold text-gray-800">R$ {localFlightTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                  )}
                  {selectedHotel && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-600 flex items-center gap-1"><Building size={10}/> Hospedagem</span>
                      <span className="text-[11px] font-bold text-gray-800">R$ {localHotelTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                  )}
                  {selectedTransfer && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-gray-600 flex items-center gap-1"><Car size={10}/> Transfer</span>
                      <span className="text-[11px] font-bold text-gray-800">R$ {localTransferTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-gray-500 mb-2">Para {totalPax} viajante(s)</p>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Preço por viajante</span>
                  <span className="text-sm font-medium text-gray-900">R$ {localPrecoBasePessoa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                  <span className="text-xs text-gray-600">Taxas e impostos (por viajante)</span>
                  <span className="text-sm font-medium text-gray-900">R$ {(localTaxasEImpostos || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-900">Valor final</span>
                  <span className={`text-2xl font-black ${timeLeft === 0 ? 'text-gray-400 line-through' : 'text-gray-900'}`}>R$ {localTotalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <p className="text-[10px] text-right font-bold text-green-600 mb-4">5% de desconto à vista ou em até 12x</p>

                <button 
                  onClick={handleCheckoutPackage}
                  disabled={loadingCart || timeLeft === 0 || (!selectedFlight && !selectedHotel && !selectedTransfer)}
                  className="w-full bg-[#FFD700] hover:bg-[#e5c100] disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 font-bold py-3 rounded shadow-sm transition flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed"
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
        {/* 3. A LISTA INFERIOR DE ALTERAÇÃO */}
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
              
              {/* RENDERIZAÇÃO DE TRANSFERS */}
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

              {/* RENDERIZAÇÃO DOS HOTÉIS (COM FILTRO ETG) */}
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

              {/* RENDERIZAÇÃO DOS VOOS */}
              {activeView === 'flight' && (
                <div className="space-y-4">
                  {flightsResults.map((voo) => {
                    const isSelected = selectedFlight && voo.id === selectedFlight.id;
                    const baseFare = parseInt(voo.precoFinal || voo.price, 10) || 0;
                    
                    const specUnitBag = voo.bags_price?.['1'] ? Math.ceil(voo.bags_price['1']) : 120;
                    const specBagMulti = !voo.volta ? 2 : 1;
                    const specBagCost = (searchParams?.holdBags || 0) > 0 ? (searchParams.holdBags * specUnitBag * specBagMulti) : 0;
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
                  })}
                </div>
              )}

            </div>

          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL: ALTERAR BUSCA COM AUTOCOMPLETE (BAGAGEM UNIFICADA) */}
      {/* ========================================== */}
      {isSearchModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
            <button onClick={() => setIsSearchModalOpen(false)} className="absolute top-5 right-5 text-gray-400 hover:text-black"><X size={24}/></button>
            <h3 className="text-2xl font-black text-gray-900 mb-6">Alterar Busca do Pacote</h3>
            
            <form onSubmit={handleConfirmNewSearch} className="space-y-4">
              
              <div className="relative">
                <label className="text-xs font-bold text-gray-700 block mb-1">Origem (Ex: São Paulo - GRU)</label>
                <input 
                  type="text" 
                  value={tempOrigin} 
                  onChange={e => { setTempOrigin(e.target.value); setShowOriginDropdown(true); }} 
                  onFocus={() => { if(originResults.length > 0) setShowOriginDropdown(true); }}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#4C1D95]" 
                  required 
                />
                {showOriginDropdown && originResults.length > 0 && (
                  <ul className="absolute left-0 right-0 top-[105%] bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                    {originResults.map(loc => (
                      <li 
                        key={loc.id} 
                        onClick={() => { 
                          setSelectedOriginObj({ id: loc.code || loc.id, name: `${loc.name} (${loc.code || loc.id})` });
                          setTempOrigin(`${loc.name} (${loc.code || loc.id})`); 
                          setShowOriginDropdown(false); 
                        }} 
                        className="p-3 hover:bg-purple-50 cursor-pointer text-xs border-b border-gray-50 flex flex-col"
                      >
                        <span className="font-bold text-gray-800">{loc.name} ({loc.code || loc.id})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative">
                <label className="text-xs font-bold text-gray-700 block mb-1">Destino (Ex: Rio de Janeiro - GIG)</label>
                <input 
                  type="text" 
                  value={tempDest} 
                  onChange={e => { setTempDest(e.target.value); setShowDestDropdown(true); }} 
                  onFocus={() => { if(destResults.length > 0) setShowDestDropdown(true); }}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#4C1D95]" 
                  required 
                />
                {showDestDropdown && destResults.length > 0 && (
                  <ul className="absolute left-0 right-0 top-[105%] bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                    {destResults.map(loc => (
                      <li 
                        key={loc.id} 
                        onClick={() => { 
                          setSelectedDestObj({ id: loc.code || loc.id, name: `${loc.name} (${loc.code || loc.id})` });
                          setTempDest(`${loc.name} (${loc.code || loc.id})`); 
                          setShowDestDropdown(false); 
                        }} 
                        className="p-3 hover:bg-purple-50 cursor-pointer text-xs border-b border-gray-50 flex flex-col"
                      >
                        <span className="font-bold text-gray-800">{loc.name} ({loc.code || loc.id})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={(e) => { const input = e.currentTarget.querySelector('input[type="date"]'); if(input && input.showPicker) input.showPicker(); }}
                  className="cursor-pointer"
                >
                  <label className="text-xs font-bold text-gray-700 block mb-1 cursor-pointer">Data de Ida</label>
                  <input type="date" value={tempDateOut} onChange={e => setTempDateOut(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#4C1D95] cursor-pointer" required />
                </div>
                <div 
                  onClick={(e) => { const input = e.currentTarget.querySelector('input[type="date"]'); if(input && input.showPicker) input.showPicker(); }}
                  className="cursor-pointer"
                >
                  <label className="text-xs font-bold text-gray-700 block mb-1 cursor-pointer">Data de Volta</label>
                  <input type="date" value={tempDateIn} onChange={e => setTempDateIn(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#4C1D95] cursor-pointer" required />
                </div>
              </div>

              {/* CONTROLES UNIFICADOS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Viajantes</label>
                  <input type="number" min="1" max="8" value={tempPax} onChange={e => {setTempPax(e.target.value); setTempHoldBags(0);}} className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold outline-none focus:border-[#4C1D95]" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Malas Porão (23kg)</label>
                  <select value={tempHoldBags} onChange={e => setTempHoldBags(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold outline-none bg-white cursor-pointer">
                    {[...Array(((parseInt(tempPax, 10) || 1) * 2) + 1).keys()].map(n => <option key={n} value={n}>{n} mala(s)</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-[#4C1D95] hover:bg-purple-900 text-white font-black py-4 rounded-xl text-sm uppercase tracking-wider shadow-lg transition mt-4">
                Aplicar Nova Busca
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL GALERIA HOTEL ETG */}
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