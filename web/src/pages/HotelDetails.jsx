import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vcqiilytjrrurdbscmio.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_leFg1lWGZlctiU3CXYR2Gw_FpOG2qR3"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// HELPER: Lógica com Fallback de Resgate (Evita o "Sem Foto" após o Anti-Fachada)
const findRoomImages = (oferta, roomGroups, hotelImages) => {
  let rGroups = roomGroups;
  if (typeof rGroups === 'string' && rGroups.trim().startsWith('[')) {
      try { rGroups = JSON.parse(rGroups); } catch(e) { rGroups = []; }
  }
  
  let foundImages = [];
  const parsedHotelImages = parseImagesList(hotelImages);
  const fachadaHotel = parsedHotelImages.length > 0 ? parsedHotelImages[0] : null;

  if (rGroups && Array.isArray(rGroups) && rGroups.length > 0) {
    
    // 1. MATCH ESTRITO 
    if (oferta.rg_ext && typeof oferta.rg_ext === 'object') {
      const matchedByRgExt = rGroups.find(rg => {
        if (!rg.rg_ext || typeof rg.rg_ext !== 'object') return false;
        const searchKeys = Object.keys(oferta.rg_ext);
        if (searchKeys.length === 0) return false;
        return searchKeys.every(key => String(rg.rg_ext[key]) === String(oferta.rg_ext[key]));
      });
      if (matchedByRgExt && matchedByRgExt.images) foundImages = parseImagesList(matchedByRgExt.images);
    }

    // 2. MATCH PARCIAL
    if (foundImages.length === 0 && oferta.rg_ext) {
      const matchedPartial = rGroups.find(rg => {
        return rg.rg_ext && 
               String(rg.rg_ext.class) === String(oferta.rg_ext.class) && 
               String(rg.rg_ext.quality) === String(oferta.rg_ext.quality);
      });
      if (matchedPartial && matchedPartial.images) foundImages = parseImagesList(matchedPartial.images);
    }

    // 3. MATCH POR NOME 
    if (foundImages.length === 0 && oferta.tipoQuarto) {
      const offerNameLower = oferta.tipoQuarto.toLowerCase();
      const matchedByName = rGroups.find(rg => {
        if (!rg.name) return false;
        const staticNameLower = rg.name.toLowerCase();
        const mainWords = staticNameLower.split(' ').filter(w => w.length > 4); 
        if (mainWords.length > 0) return mainWords.some(word => offerNameLower.includes(word));
        return offerNameLower.includes(staticNameLower);
      });
      if (matchedByName && matchedByName.images) foundImages = parseImagesList(matchedByName.images);
    }

    // 4. QUARTO ÚNICO 
    if (foundImages.length === 0 && rGroups.length === 1) {
      if (rGroups[0].images) foundImages = parseImagesList(rGroups[0].images);
    }
  }

  // 5. FILTRO ANTI-FACHADA IMEDIATO
  // Exclui a fachada da RateHawk que foi mapeada indevidamente para dentro do quarto
  if (foundImages.length > 0 && fachadaHotel) {
    foundImages = foundImages.filter(img => img !== fachadaHotel);
  }

  // 6. FALLBACK DE RESGATE 
  // Se o quarto não achou foto, ou se o Anti-Fachada apagou a única foto que ele tinha,
  // nós injetamos o interior do hotel (camas) para evitar o bloco "SEM FOTO".
  if (foundImages.length === 0 && parsedHotelImages.length > 0) {
    foundImages = parsedHotelImages.filter(img => img !== fachadaHotel);
  }

  return foundImages; 
};

// FORMATO DE CANCELAMENTO DECLARADO NO QUESTIONÁRIO DA ETG
const formatCancellation = (deadlineUtc) => {
  if (!deadlineUtc) return null;
  const datePart = deadlineUtc.split('T')[0];
  const timePart = deadlineUtc.split('T')[1]?.substring(0, 5) || '00:00';
  return `Free cancellation before ${datePart} at ${timePart} (Hotel Local Time)`;
};

export default function HotelDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  const { hotel, checkInDate, checkOutDate, rooms: searchRooms, residency } = location.state || {};
  const currentRooms = searchRooms || [{ adults: 1, childrenAges: [] }];
  const currentResidency = residency || 'br';

  const [staticData, setStaticData] = useState(null);
  const [loadingStatic, setLoadingStatic] = useState(true);
  
  const [filterRefeicoes, setFilterRefeicoes] = useState('todas');
  const [filterCancelamento, setFilterCancelamento] = useState('todas');
  
  const [activeRoomDetail, setActiveRoomDetail] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null); 
  const [roomLightboxIndex, setRoomLightboxIndex] = useState(null); 

  const [ofertasAtuais, setOfertasAtuais] = useState([]);
  const [buscandoTarifas, setBuscandoTarifas] = useState(true);
  const [hpError, setHpError] = useState(null);
  const [currentHid, setCurrentHid] = useState(null);

  const [selectedOffer, setSelectedOffer] = useState(null);
  const [bookingStep, setBookingStep] = useState('idle'); 
  const [bookingError, setBookingError] = useState(null);

  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [finalPartnerOrderId, setFinalPartnerOrderId] = useState('');
  const [guestForms, setGuestForms] = useState([]);

  useEffect(() => {
    if (currentRooms) {
      const forms = currentRooms.map(room => {
        const adults = Array.from({ length: room.adults }, () => ({ first_name: '', last_name: '', is_child: false }));
        const children = room.childrenAges.map(age => ({ first_name: '', last_name: '', is_child: true, age: parseInt(age, 10) }));
        return { guests: [...adults, ...children] };
      });
      setGuestForms(forms);
    }
  }, [currentRooms]);

  const handleGuestChange = (roomIndex, guestIndex, field, value) => {
    const newForms = [...guestForms];
    newForms[roomIndex].guests[guestIndex][field] = value;
    setGuestForms(newForms);
  };

  useEffect(() => {
    if (!hotel || !hotel.hotelId) {
      navigate('/hoteis');
      return;
    }

    const rawId = String(hotel.hotelId).replace('rh_', '').replace('restel_', '');

    const fetchHotelFromSupabase = async () => {
      try {
        const { data, error } = await supabase.from('Hotel').select('*').eq('id', rawId).single();

        const parseDescription = (descData) => {
          if (!descData) return "";
          if (typeof descData === 'string' && descData.trim().startsWith('[')) {
            try { descData = JSON.parse(descData); } catch (e) {}
          }
          if (typeof descData === 'string') return descData;
          if (Array.isArray(descData)) return descData.map(item => item.paragraphs ? item.paragraphs.join(' ') : '').join('\n\n');
          return "";
        };

        const parseAmenities = (amenitiesData) => {
          let parsed = amenitiesData;
          if (typeof parsed === 'string' && parsed.trim().startsWith('[')) {
            try { parsed = JSON.parse(parsed); } catch (e) {}
          }
          if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed?.amenities) parsed = parsed.amenities;
          if (!Array.isArray(parsed)) return [];
          return parsed[0]?.group_name ? parsed : [{ group_name: "Comodidades Gerais", amenities: parsed }];
        };

        let processedImages = parseImagesList(data?.images || hotel?.imagensReais);
        let parsedRoomGroups = data?.room_groups || [];

        if (data) {
          setStaticData({
            name: data.name || hotel.nome, address: data.address || hotel.endereco, star_rating: data.starRating || hotel.categoria,
            latitude: data.latitude || hotel.latitude, longitude: data.longitude || hotel.longitude,
            images: processedImages,
            room_groups: parsedRoomGroups,
            amenity_groups: parseAmenities(data.amenities || data.amenity_groups || hotel.comodidades),
            description: parseDescription(data.description || data.description_struct || hotel.descricao),
            metapolicy_extra_info: data.metapolicy_extra_info || hotel.metapolicy_extra_info || null
          });
        } else {
          setStaticData({
            name: hotel.nome, address: hotel.endereco, star_rating: hotel.categoria,
            latitude: hotel.latitude, longitude: hotel.longitude, images: processedImages,
            room_groups: [],
            amenity_groups: parseAmenities(hotel.comodidades), description: parseDescription(hotel.descricao),
            metapolicy_extra_info: hotel.metapolicy_extra_info || null
          });
        }
      } catch (err) {
        console.error("Erro Supabase:", err);
      } finally {
        setLoadingStatic(false);
      }
    };

    const fetchFreshRates = async () => {
      try {
          const guestsPayload = currentRooms.map(room => ({ 
              adults: Number(room.adults) || 1, 
              children: (room.childrenAges || []).map(age => Number(age)) 
          }));
          
          const safeCheckin = checkInDate || new Date().toISOString().split('T')[0];
          const safeCheckout = checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];

          const res = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-page', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  id: rawId, checkin: safeCheckin, checkout: safeCheckout, residency: currentResidency || "br", currency: "USD", guests: guestsPayload 
              })
          });
          const data = await res.json();
          
          if (data.status === 'ok' && data.data?.hotels?.[0]?.rates) {
              setCurrentHid(data.data.hotels[0].hid);
              const newOffers = data.data.hotels[0].rates.map(r => {
                const taxes = r.payment_options?.payment_types?.[0]?.tax_data?.taxes?.filter(t => !t.included_by_supplier) || [];
                const exactCancellation = r.payment_options?.payment_types?.[0]?.cancellation_penalties?.free_cancellation_before;

                return {
                  tipoQuarto: r.room_name,
                  codigoRegime: r.meal === 'breakfast' ? 'BB' : 'RO',
                  nomeRegime: r.meal_data?.value || 'Sem refeições', 
                  precoVenda: parseFloat(r.payment_options?.payment_types?.[0]?.amount || r.daily_prices?.[0] || 0) * 5.1,
                  paymentTypeObj: r.payment_options?.payment_types?.[0], 
                  bookHash: r.book_hash, 
                  freeCancellation: exactCancellation != null,
                  cancellationDeadline: formatCancellation(exactCancellation),
                  excludedTaxes: taxes,
                  noShow: r.no_show,
                  deposit: r.deposit,
                  rg_ext: r.rg_ext
                };
              });
              setOfertasAtuais(newOffers);
          } else {
              setOfertasAtuais([]);
              setHpError(`Motivo: ${data.debug?.validation_error || data.error || "Indisponível."}`);
          }
      } catch(e) {
          setOfertasAtuais([]);
          setHpError("Erro de comunicação com a API RateHawk.");
      } finally {
          setBuscandoTarifas(false);
      }
    };

    fetchHotelFromSupabase();
    if (String(hotel.hotelId).startsWith('rh_')) fetchFreshRates(); else setBuscandoTarifas(false);
  }, [hotel, navigate, checkInDate, checkOutDate, currentRooms, currentResidency]);

  const handleStartBooking = async (oferta) => {
    if (!oferta.bookHash) {
        setBookingStep('error');
        setBookingError("Hash de reserva ausente. Busque novamente.");
        return;
    }
    setActiveRoomDetail(null); 
    setSelectedOffer({ ...oferta, hotelNome: staticData?.name || hotel.nome, hotelId: hotel.hotelId });
    setBookingStep('prebooking');
    setBookingError(null);

    try {
      // PREBOOK: price_increase_percent = 5 fixo como exigido pela certificação ETG
      const prebookPayload = { book_hash: oferta.bookHash, price_increase_percent: 5 };

      const res = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-prebook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prebookPayload)
      });
      const data = await res.json();

      if (data.status !== 'ok') throw new Error(`RateHawk recusou: ${data.debug?.validation_error || data.error || data.message}`);
      
      const prebookRate = data.data?.hotels?.[0]?.rates?.[0];
      if (!prebookRate?.book_hash?.startsWith('p-')) throw new Error("Hash inválido retornado pelo fornecedor.");

      setSelectedOffer(prev => ({ 
          ...prev, bookHash: prebookRate.book_hash, paymentTypeObj: prebookRate?.payment_options?.payment_types?.[0] || prev.paymentTypeObj 
      }));
      setBookingStep('details');
    } catch (err) {
      setBookingStep('error');
      setBookingError(err.message);
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setBookingStep('booking');
    setBookingError(null);
    
    const partnerOrderId = `palastore_${Date.now()}`;
    setFinalPartnerOrderId(partnerOrderId);

    try {
      const sanitizeName = (name) => name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z\s'-,.]/g, "").trim() : "";
      const sanitizedGuestForms = guestForms.map(room => ({
        guests: room.guests.map(g => ({ ...g, first_name: sanitizeName(g.first_name), last_name: sanitizeName(g.last_name) }))
      }));

      const orderPayload = {
        partner_order_id: partnerOrderId, hash: selectedOffer.bookHash, language: "en",
        user: { email: "contato@palastore.com.br", phone: guestPhone || "+5571999999999", comment: "Reserva B2B" },
        rooms: sanitizedGuestForms 
      };

      const formRes = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-booking-form', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload)
      });
      const formData = await formRes.json();
      if (formData.status !== 'ok') throw new Error(`Erro Form: ${formData.debug?.validation_error || formData.error}`);

      let finalAmount = selectedOffer.paymentTypeObj?.amount;
      let finalCurrency = selectedOffer.paymentTypeObj?.currency_code || "USD";
      const paymentTypeData = { type: "deposit", amount: String(finalAmount), currency_code: finalCurrency };

      const finishRes = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-booking-finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          partner_order_id: partnerOrderId, payment_type: paymentTypeData, user_ip: "8.8.8.8", language: "en", user: orderPayload.user, rooms: orderPayload.rooms 
        })
      });
      const finishData = await finishRes.json();
      
      if (finishData.status !== 'ok' && !['timeout', 'unknown'].includes(finishData.error)) {
         throw new Error(`Erro Finish: ${finishData.debug?.validation_error || finishData.error}`);
      }
      
      pollBookingStatus(partnerOrderId);
    } catch (err) {
      setBookingStep('error');
      setBookingError(err.message);
    }
  };

  const pollBookingStatus = async (partnerOrderId) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-booking-status', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partner_order_id: partnerOrderId })
        });
        const data = await res.json();
        if (data.status === 'ok') { clearInterval(interval); setBookingStep('success'); } 
        else if (data.status !== 'processing' && !['timeout', 'unknown'].includes(data.error)) {
          clearInterval(interval); setBookingStep('error'); setBookingError(`Falha final: ${JSON.stringify(data.error)}`);
        }
        if (attempts >= 60) { clearInterval(interval); setBookingStep('error'); setBookingError("Timeout do fornecedor (180s excedido)."); }
      } catch (err) {}
    }, 3000);
  };

  if (!hotel) return null;
  const totalQuartos = currentRooms.length; 

  const ofertasFiltradas = (ofertasAtuais || []).filter(oferta => {
    let matchRefeicao = filterRefeicoes === 'todas' || oferta.codigoRegime === filterRefeicoes;
    let matchCancelamento = filterCancelamento === 'todas' || (filterCancelamento === 'gratuito' ? oferta.freeCancellation : !oferta.freeCancellation);
    return matchRefeicao && matchCancelamento;
  });

  const buildSingleHotelMapHtml = () => {
    const lat = staticData?.latitude || hotel.latitude || -23.5505;
    const lng = staticData?.longitude || hotel.longitude || -46.6333;
    const hName = staticData?.name || hotel.nome || "Hotel";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; font-family: -apple-system, sans-serif; }
          #map { height: 100%; width: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${lat}, ${lng}], 16);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
          L.marker([${lat}, ${lng}]).addTo(map).bindPopup("<b>${hName.replace(/'/g, "\\'").replace(/"/g, '&quot;')}</b>").openPopup();
        </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="w-full bg-[#f2f2f2] font-sans min-h-screen pb-20">
      
      <div className="bg-white border-b border-gray-200 py-3 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 flex justify-between items-center">
          <div className="flex gap-8 items-center text-xs">
            <div><span className="font-bold text-gray-500 uppercase block">Check-in</span><span className="font-bold text-gray-900">{checkInDate}</span></div>
            <div><span className="font-bold text-gray-500 uppercase block">Check-out</span><span className="font-bold text-gray-900">{checkOutDate}</span></div>
          </div>
          <button onClick={() => navigate(-1)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-2 rounded text-xs transition">
            Alterar busca
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 mt-6">
        
        {/* CARROSSEL HORIZONTAL DE FOTOS DO HOTEL (GALERIA GERAL) */}
        <div className="mb-6 relative">
          {staticData?.images?.length > 0 ? (
            <div className="flex overflow-x-auto gap-3 pb-3 snap-x scrollbar-thin">
              {staticData.images.map((imgUrl, index) => (
                <div 
                  key={index} 
                  onClick={() => setLightboxIndex(index)}
                  className="h-56 w-72 sm:w-80 shrink-0 snap-start rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-gray-100 cursor-pointer group relative"
                >
                  <img src={imgUrl} alt={`Foto do hotel ${index}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition duration-300 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white font-bold bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm text-xs uppercase tracking-wider transition duration-300">
                      Ampliar Imagem
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full py-8 text-center bg-white rounded-xl text-gray-500 text-xs font-bold uppercase border border-gray-200 shadow-sm">
              Nenhuma imagem geral disponível para este estabelecimento.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
               <span className="text-[#84cc16] text-xs">{'★'.repeat(staticData?.star_rating || hotel.categoria || 4)}</span>
               <h1 className="text-xl font-black text-gray-900 leading-tight">{staticData?.name || hotel.nome}</h1>
               <p className="text-xs text-gray-500 mt-2 flex gap-1"><span>📍</span> {staticData?.address || hotel.endereco}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-64 relative">
              <iframe title="Localização do Hotel" width="100%" height="100%" style={{ border: 0 }} srcDoc={buildSingleHotelMapHtml()}></iframe>
            </div>

            {staticData?.amenity_groups?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-bold text-sm mb-3 text-gray-900 flex items-center gap-1.5">🏨 Comodidades</h3>
                <div className="space-y-3">
                  {staticData.amenity_groups.map((group, idx) => (
                    <div key={idx}>
                      <p className="text-xs font-bold text-gray-700 uppercase mb-1">{group.group_name || "Geral"}</p>
                      <ul className="text-xs text-gray-600 space-y-1 pl-2">
                        {group.amenities?.slice(0, 5).map((amenity, aIdx) => (
                          <li key={aIdx} className="flex items-center gap-1.5"><span className="text-green-600">✓</span> {amenity}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEÇÃO OBRIGATÓRIA: HOTEL POLICIES & IMPORTANT INFO */}
            {staticData?.metapolicy_extra_info && (
              <div className="bg-orange-50 rounded-xl border border-orange-200 shadow-sm p-5">
                <h3 className="font-black text-sm mb-3 text-orange-800 flex items-center gap-1.5">⚠️ Hotel Policies & Important Information</h3>
                <p className="text-xs text-orange-900 whitespace-pre-line leading-relaxed">
                  {staticData.metapolicy_extra_info}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-9 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            {!buscandoTarifas && ofertasAtuais.length === 0 && (
               <div className="p-8 text-center bg-red-50 text-red-700 rounded-xl border border-red-100">
                  <span className="text-4xl mb-3 block">⚠️</span>
                  <h3 className="text-lg font-bold mb-1">Não há tarifas disponíveis</h3>
                  <p className="text-sm font-medium">{hpError || "O hotel não possui quartos para esta configuração."}</p>
               </div>
            )}

            {ofertasAtuais.length > 0 && (
              <>
                <div className="hidden md:grid grid-cols-12 gap-2 bg-[#2d3748] text-white text-[10px] font-bold p-3 rounded-t-xl uppercase">
                  <div className="col-span-4 pl-2">Acomodação</div>
                  <div className="col-span-2">Refeições</div>
                  <div className="col-span-3">Cancelamento</div>
                  <div className="col-span-2 text-right pr-4">Preço LÍQUIDO</div>
                  <div className="col-span-1 text-center">Ação</div>
                </div>

                {ofertasFiltradas.map((oferta, idx) => {
                  const roomImgs = findRoomImages(oferta, staticData?.room_groups, staticData?.images);
                  const coverImg = roomImgs.length > 0 ? roomImgs[0] : null;

                  return (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 border-b border-gray-100 items-start hover:bg-gray-50 transition">
                      <div className="col-span-1 md:col-span-4 flex gap-4">
                        
                        <div 
                           className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:opacity-80 transition bg-gray-100 flex items-center justify-center relative group"
                           onClick={() => setActiveRoomDetail({ oferta, roomImgs })}
                        >
                           {coverImg ? (
                             <>
                               <img src={coverImg} alt="Quarto" className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                                 <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-bold">Ver +</span>
                               </div>
                             </>
                           ) : (
                             <div className="flex flex-col items-center justify-center p-2 text-center text-gray-400">
                               <span className="text-2xl mb-1">🛏️</span>
                               <span className="text-[9px] font-bold uppercase tracking-wider leading-tight">Sem Foto</span>
                             </div>
                           )}
                        </div>

                        <div className="flex flex-col gap-1.5 flex-1">
                          <h3 onClick={() => setActiveRoomDetail({ oferta, roomImgs })} className="font-bold text-sm text-blue-600 cursor-pointer hover:underline leading-tight pr-2">{oferta.tipoQuarto}</h3>
                          <span className="bg-[#4C1D95]/10 text-[#4C1D95] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider block w-max border border-[#4C1D95]/20">
                            Cobre {totalQuartos} Quarto(s)
                          </span>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-2 text-xs font-bold text-[#15803d] pt-1">🍽️ {oferta.nomeRegime}</div>
                      
                      <div className="col-span-1 md:col-span-3 text-xs font-bold pt-1 pr-2">
                        {oferta.freeCancellation ? <span className="text-[#15803d]">↩️ {oferta.cancellationDeadline}</span> : <span className="text-red-600">❌ Não reembolsável</span>}
                      </div>

                      <div className="col-span-1 md:col-span-2 pt-1 text-right pr-4">
                        <span className="text-base font-black text-gray-900 block tracking-tight">BRL {oferta.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                      </div>

                      <div className="col-span-1 md:col-span-1 flex justify-center pt-1">
                        <button onClick={() => setActiveRoomDetail({ oferta, roomImgs })} disabled={buscandoTarifas} className="w-full bg-[#ffc107] hover:bg-yellow-500 disabled:opacity-50 text-gray-900 font-bold py-2 rounded shadow text-xs transition uppercase">
                          Reservar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* LIGHTBOX DA GALERIA GERAL DO HOTEL EM TELA CHEIA */}
      {lightboxIndex !== null && staticData?.images && (
        <div className="fixed inset-0 z-[99999999] bg-black/95 flex items-center justify-center w-screen h-screen overflow-hidden select-none">
          <button 
            onClick={() => setLightboxIndex(null)} 
            className="absolute top-4 right-4 md:top-8 md:right-8 text-white hover:text-gray-300 text-3xl font-black z-[100] w-12 h-12 bg-black/50 rounded-full flex items-center justify-center cursor-pointer border border-white/20 transition shadow-lg"
          >
            ✕
          </button>
          
          <button 
            onClick={() => setLightboxIndex(prev => prev > 0 ? prev - 1 : staticData.images.length - 1)} 
            className="absolute left-2 md:left-8 text-white text-4xl hover:text-yellow-400 z-[100] w-14 h-14 bg-black/50 rounded-full flex items-center justify-center cursor-pointer border border-white/20 transition shadow-lg"
          >
            ‹
          </button>
          
          <img 
            src={staticData.images[lightboxIndex]} 
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl relative z-50" 
            alt="Hotel Ampliada" 
          />
          
          <button 
            onClick={() => setLightboxIndex(prev => prev < staticData.images.length - 1 ? prev + 1 : 0)} 
            className="absolute right-2 md:right-8 text-white text-4xl hover:text-yellow-400 z-[100] w-14 h-14 bg-black/50 rounded-full flex items-center justify-center cursor-pointer border border-white/20 transition shadow-lg"
          >
            ›
          </button>

          <div className="absolute bottom-6 text-white text-sm font-bold bg-black/60 px-5 py-2 rounded-xl border border-white/10 z-[100]">
            {lightboxIndex + 1} de {staticData.images.length}
          </div>
        </div>
      )}

      {/* MODAL DE FOTOS DO QUARTO COM GRID */}
      {activeRoomDetail && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden relative p-6 max-h-[90vh]">
            <button onClick={() => setActiveRoomDetail(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black font-black text-2xl z-10 cursor-pointer">✕</button>
            <h2 className="text-xl font-black text-gray-900 leading-tight mb-4 pr-6">{activeRoomDetail.oferta.tipoQuarto}</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 overflow-y-auto max-h-[50vh] pr-2 scrollbar-thin">
              {activeRoomDetail.roomImgs && activeRoomDetail.roomImgs.length > 0 ? (
                activeRoomDetail.roomImgs.map((img, i) => (
                  <div key={i} className="relative group cursor-pointer" onClick={() => setRoomLightboxIndex(i)}>
                     <img src={img} alt={`Quarto ${i}`} className="h-40 w-full object-cover rounded-lg border border-gray-200 shadow-sm group-hover:opacity-80 transition duration-300" />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center rounded-lg">
                       <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded">Ampliar</span>
                     </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center bg-gray-50 text-gray-500 text-xs font-bold uppercase rounded-xl border border-dashed border-gray-300">
                  <span className="text-3xl block mb-2">🛏️</span>
                  Nenhuma foto específica para este quarto fornecida pelo hotel.
                </div>
              )}
            </div>

            <div className="text-center mb-6 pt-4 border-t border-gray-100 shrink-0">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Preço Total para ({totalQuartos} quartos)</p>
              <p className="text-3xl font-black text-gray-900">BRL {activeRoomDetail.oferta.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>

            <button onClick={() => handleStartBooking(activeRoomDetail.oferta)} className="w-full bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-bold py-4 rounded-xl shadow-md transition text-sm uppercase tracking-wider shrink-0 cursor-pointer">
              Confirmar e Prosseguir
            </button>
          </div>
        </div>, document.body
      )}

      {/* LIGHTBOX EXCLUSIVO PARA O QUARTO EM TELA CHEIA */}
      {roomLightboxIndex !== null && activeRoomDetail?.roomImgs && createPortal(
        <div className="fixed inset-0 z-[99999999] bg-black/95 flex items-center justify-center w-screen h-screen overflow-hidden select-none">
          <button 
            onClick={() => setRoomLightboxIndex(null)} 
            className="absolute top-4 right-4 md:top-8 md:right-8 text-white hover:text-gray-300 text-3xl font-black z-[100] w-12 h-12 bg-black/50 rounded-full flex items-center justify-center cursor-pointer border border-white/20 transition shadow-lg"
          >
            ✕
          </button>
          
          <button 
            onClick={() => setRoomLightboxIndex(prev => prev > 0 ? prev - 1 : activeRoomDetail.roomImgs.length - 1)} 
            className="absolute left-2 md:left-8 text-white text-4xl hover:text-yellow-400 z-[100] w-14 h-14 bg-black/50 rounded-full flex items-center justify-center cursor-pointer border border-white/20 transition shadow-lg"
          >
            ‹
          </button>
          
          <img 
            src={activeRoomDetail.roomImgs[roomLightboxIndex]} 
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl relative z-50" 
            alt="Quarto Ampliado" 
          />
          
          <button 
            onClick={() => setRoomLightboxIndex(prev => prev < activeRoomDetail.roomImgs.length - 1 ? prev + 1 : 0)} 
            className="absolute right-2 md:right-8 text-white text-4xl hover:text-yellow-400 z-[100] w-14 h-14 bg-black/50 rounded-full flex items-center justify-center cursor-pointer border border-white/20 transition shadow-lg"
          >
            ›
          </button>

          <div className="absolute bottom-6 text-white text-sm font-bold bg-black/60 px-5 py-2 rounded-xl border border-white/10 z-[100]">
            {roomLightboxIndex + 1} de {activeRoomDetail.roomImgs.length}
          </div>
        </div>, document.body
      )}

      {/* MODAL DE FINALIZAÇÃO DA RESERVA */}
      {bookingStep !== 'idle' && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999999] bg-black/80 backdrop-blur-sm overflow-y-auto flex items-start justify-center pt-10 pb-10 px-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col relative overflow-hidden my-auto border border-gray-200">
            <div className="bg-gray-900 p-5 flex justify-between items-center text-white shrink-0">
              <h3 className="font-black text-sm uppercase tracking-wide">Finalizar Reserva B2B</h3>
              {bookingStep !== 'booking' && <button onClick={() => setBookingStep('idle')} className="text-gray-400 hover:text-white text-xl">✕</button>}
            </div>
            <div className="p-6 sm:p-7">
               {bookingStep === 'prebooking' && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-800 font-black text-lg">Validando disponibilidade e tarifas...</p>
                  <p className="text-xs text-gray-500 mt-1">Conectando com a RateHawk (Prebook)</p>
                </div>
              )}

              {bookingStep === 'details' && selectedOffer && (
                <form onSubmit={handleConfirmBooking}>
                  <div className="mb-5 bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-inner">
                    <p className="text-[10px] text-orange-600 font-black uppercase tracking-wider mb-1">Resumo do Hotel</p>
                    <p className="font-black text-gray-900 text-base">{selectedOffer.hotelNome}</p>
                    <p className="text-xs font-medium text-gray-700 mt-1">{selectedOffer.tipoQuarto} - {selectedOffer.codigoRegime}</p>
                    <p className="text-xl font-black text-green-700 mt-2">BRL {selectedOffer.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>

                  {/* FORMATAÇÃO EXATA DE TAXAS DECLARADA À ETG */}
                  {selectedOffer.excludedTaxes?.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                      <p className="text-sm font-black text-red-700 mb-2 flex items-center gap-1.5">⚠️ Mandatory Fees</p>
                      <ul className="list-disc pl-5">
                        {selectedOffer.excludedTaxes.map((t, i) => (
                          <li key={i} className="text-xs font-black text-red-800 tracking-wide mb-1">
                            Payable at the property: {t.name} {t.amount} {t.currency_code}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mb-6">
                    <p className="text-xs font-black text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-100 pb-2">Hóspedes da Reserva</p>
                    
                    {guestForms.map((room, rIdx) => (
                      <div key={rIdx} className="mb-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                        <p className="font-bold text-sm text-[#4C1D95] mb-3">Quarto {rIdx + 1}</p>
                        
                        {room.guests.map((g, gIdx) => (
                          <div key={gIdx} className="flex gap-2 mb-3 items-center">
                            <span className="text-xs font-bold w-16 text-gray-600">{g.is_child ? `Criança` : 'Adulto'}</span>
                            <input type="text" required placeholder="Nome" value={g.first_name} onChange={e => handleGuestChange(rIdx, gIdx, 'first_name', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-xs outline-none" />
                            <input type="text" required placeholder="Sobrenome" value={g.last_name} onChange={e => handleGuestChange(rIdx, gIdx, 'last_name', e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-xs outline-none" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="mb-6">
                    <p className="text-xs font-black text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-100 pb-2">Contato</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {/* O email corporativo já é mandado na payload oculta para a ETG */}
                      <input type="email" placeholder="E-mail" required value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium outline-none" />
                      <input type="text" placeholder="Telefone com DDD" required value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium outline-none" />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl shadow-lg uppercase text-sm tracking-wide transition transform active:scale-95">
                    Confirmar Reserva B2B
                  </button>
                </form>
              )}

              {bookingStep === 'booking' && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-800 font-black text-lg">Processando sua reserva...</p>
                  <p className="text-xs text-gray-500 mt-1">Aguardando confirmação do fornecedor</p>
                </div>
              )}

              {bookingStep === 'success' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">✓</div>
                  <h4 className="text-xl font-black text-gray-900 mb-2">Reserva Confirmada!</h4>
                  <p className="text-sm text-gray-600 mb-5 bg-gray-50 py-2 px-4 rounded-lg border inline-block">ID do Pedido: <span className="font-bold">{finalPartnerOrderId}</span></p>
                  <button onClick={() => setBookingStep('idle')} className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition hover:bg-gray-800 shadow-lg">Fechar e Voltar</button>
                </div>
              )}

              {bookingStep === 'error' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">✕</div>
                  <h4 className="text-xl font-black text-gray-900 mb-2">Ops! Ocorreu um problema.</h4>
                  <p className="text-sm text-red-600 mb-5 bg-red-50 p-3 rounded-lg border border-red-100 break-words max-h-40 overflow-y-auto">{bookingError}</p>
                  <button onClick={() => setBookingStep('idle')} className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition hover:bg-gray-800 shadow-lg">Tentar Novamente</button>
                </div>
              )}
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}