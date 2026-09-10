import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vcqiilytjrrurdbscmio.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_leFg1lWGZlctiU3CXYR2Gw_FpOG2qR3"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// HELPER: Formatação Estruturada do Nome do Quarto (Requisito ETG)
const formatRoomName = (r) => {
  if (r.room_data_trans) {
    const main = r.room_data_trans.main_room_type || r.room_data_trans.main_name || r.room_name;
    const bedding = r.room_data_trans.bedding_type ? ` (${r.room_data_trans.bedding_type})` : '';
    const misc = r.room_data_trans.misc_room_type ? ` - ${r.room_data_trans.misc_room_type}` : '';
    return `${main}${bedding}${misc}`.trim();
  }
  return r.room_name || 'Quarto Standard';
};

// HELPER: Formatação da Política de Cancelamento exata e Fuso Horário (Requisito ETG)
const formatCancellation = (deadlineUtc) => {
  if (!deadlineUtc) return null;
  const datePart = deadlineUtc.split('T')[0];
  const timePart = deadlineUtc.split('T')[1]?.substring(0, 5) || '00:00';
  return `Cancelamento gratuito até ${datePart} às ${timePart} (Horário Local do Hotel)`;
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

  const [ofertasAtuais, setOfertasAtuais] = useState([]);
  const [buscandoTarifas, setBuscandoTarifas] = useState(true);
  const [hpError, setHpError] = useState(null);
  const [currentHid, setCurrentHid] = useState(null);

  // ==========================================
  // ESTADOS DO FLUXO DE RESERVA 
  // ==========================================
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
          if (typeof descData === 'string') return descData;
          if (Array.isArray(descData)) return descData.map(item => item.paragraphs ? item.paragraphs.join(' ') : '').join('\n\n');
          return "";
        };

        const parseAmenities = (amenitiesData) => {
          let parsed = amenitiesData;
          if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed.amenities) parsed = parsed.amenities;
          if (!Array.isArray(parsed)) return [];
          return parsed[0]?.group_name ? parsed : [{ group_name: "Comodidades Gerais", amenities: parsed }];
        };

        if (data) {
          setStaticData({
            name: data.name || hotel.nome, address: data.address || hotel.endereco, star_rating: data.starRating || hotel.categoria,
            latitude: data.latitude || hotel.latitude, longitude: data.longitude || hotel.longitude,
            images: data.images?.length > 0 ? data.images : (hotel.imagensReais || []),
            amenity_groups: parseAmenities(data.amenities || data.amenity_groups || hotel.comodidades),
            description: parseDescription(data.description || data.description_struct || hotel.descricao),
            check_in_time: data.check_in_time ? String(data.check_in_time).slice(0, 5) : null,
            check_out_time: data.check_out_time ? String(data.check_out_time).slice(0, 5) : null,
            metapolicy_extra_info: data.metapolicy_extra_info || hotel.metapolicy_extra_info || null
          });
        } else {
          setStaticData({
            name: hotel.nome, address: hotel.endereco, star_rating: hotel.categoria,
            latitude: hotel.latitude, longitude: hotel.longitude, images: hotel.imagensReais || [],
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
                  id: rawId, 
                  checkin: safeCheckin, 
                  checkout: safeCheckout, 
                  residency: currentResidency || "br", 
                  currency: "USD", 
                  guests: guestsPayload 
              })
          });
          const data = await res.json();
          
          if (data.status === 'ok' && data.data?.hotels?.[0]?.rates) {
              setCurrentHid(data.data.hotels[0].hid);
              const newOffers = data.data.hotels[0].rates.map(r => {
                
                // Formatação e extração das taxas B2B exclusas e políticas de taxa (Deposit/NoShow)
                const taxes = r.payment_options?.payment_types?.[0]?.tax_data?.taxes?.filter(t => !t.included_by_supplier) || [];
                const exactCancellation = r.payment_options?.payment_types?.[0]?.cancellation_penalties?.free_cancellation_before;

                return {
                  tipoQuarto: formatRoomName(r), 
                  codigoRegime: r.meal === 'breakfast' ? 'BB' : 'RO',
                  nomeRegime: r.meal_data?.value || 'Sem refeições', 
                  precoVenda: parseFloat(r.payment_options?.payment_types?.[0]?.amount || r.daily_prices?.[0] || 0) * 5.1,
                  paymentTypeObj: r.payment_options?.payment_types?.[0], 
                  bookHash: r.book_hash, 
                  freeCancellation: exactCancellation != null,
                  cancellationDeadline: formatCancellation(exactCancellation),
                  excludedTaxes: taxes,
                  noShow: r.no_show,
                  deposit: r.deposit
                };
              });
              setOfertasAtuais(newOffers);
          } else {
              setOfertasAtuais([]);
              const realError = data.debug?.validation_error || data.error || "A RateHawk não retornou disponibilidade.";
              setHpError(`Motivo: ${realError}`);
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
        setBookingError("Erro Crítico: Hash de reserva ausente. Por favor, faça a busca novamente.");
        return;
    }

    setActiveRoomDetail(null); 
    setSelectedOffer({ ...oferta, hotelNome: staticData?.name || hotel.nome, hotelId: hotel.hotelId });
    setBookingStep('prebooking');
    setBookingError(null);

    try {
      const prebookPayload = { book_hash: oferta.bookHash };
      
      if (Number(currentHid) === 8819557) {
         prebookPayload.price_increase_percent = 10;
      }

      const res = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-prebook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prebookPayload)
      });
      const data = await res.json();

      if (data.status !== 'ok') {
        const realError = data.debug?.validation_error || data.error || data.message || "Erro desconhecido";
        throw new Error(`RateHawk recusou: ${realError}`);
      }

      const prebookRate = data.data?.hotels?.[0]?.rates?.[0];
      const novoBookHashP = prebookRate?.book_hash || oferta.bookHash;
      const novaInfoPagamento = prebookRate?.payment_options?.payment_types?.[0];

      if (!novoBookHashP.startsWith('p-')) throw new Error("Hash inválido retornado pelo fornecedor.");

      setSelectedOffer(prev => ({ 
          ...prev, 
          bookHash: novoBookHashP,
          paymentTypeObj: novaInfoPagamento || prev.paymentTypeObj 
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
      const sanitizeName = (name) => {
        if (!name) return "";
        return name
          .normalize("NFD") 
          .replace(/[\u0300-\u036f]/g, "") 
          .replace(/[^a-zA-Z\s'-,.]/g, "") 
          .trim();
      };

      const sanitizedGuestForms = guestForms.map(room => ({
        guests: room.guests.map(g => ({
          ...g,
          first_name: sanitizeName(g.first_name),
          last_name: sanitizeName(g.last_name)
        }))
      }));

      const orderPayload = {
        partner_order_id: partnerOrderId,
        hash: selectedOffer.bookHash,
        language: "en",
        user: { email: guestEmail, phone: guestPhone || "+5571999999999", comment: "Reserva Palastore" },
        rooms: sanitizedGuestForms 
      };

      const formRes = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-booking-form', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload)
      });
      const formData = await formRes.json();
      
      if (formData.status !== 'ok') {
        const realError = formData.debug?.validation_error || formData.error || formData.message;
        throw new Error(`Erro API Form: ${realError}`);
      }

      let finalAmount = selectedOffer.paymentTypeObj?.amount;
      let finalCurrency = selectedOffer.paymentTypeObj?.currency_code || "USD";

      const formRates = formData.data?.hotel?.rates || formData.data?.hotels?.[0]?.rates;
      if (formRates && formRates.length > 0) {
          const pmts = formRates[0].payment_options?.payment_types;
          if (pmts && pmts.length > 0) {
              const depOption = pmts.find(p => p.type === 'deposit') || pmts[0];
              finalAmount = depOption.amount;
              finalCurrency = depOption.currency_code;
          }
      }

      const paymentTypeData = {
          type: "deposit",
          amount: String(finalAmount),
          currency_code: finalCurrency
      };

      const finishRes = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-booking-finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          partner_order_id: partnerOrderId, payment_type: paymentTypeData, user_ip: "8.8.8.8", language: "en",
          user: orderPayload.user, rooms: orderPayload.rooms 
        })
      });
      const finishData = await finishRes.json();
      
      if (finishData.status !== 'ok' && finishData.error !== 'timeout' && finishData.error !== 'unknown') {
         const realError = finishData.debug?.validation_error || finishData.error || finishData.message;
         throw new Error(`Erro API Finish: ${realError}`);
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
        else if (data.status !== 'processing' && data.error && !['timeout', 'unknown'].includes(data.error)) {
          clearInterval(interval); setBookingStep('error'); setBookingError(`Status retornou falha final: ${JSON.stringify(data.error)}`);
        }
        if (attempts >= 60) { clearInterval(interval); setBookingStep('error'); setBookingError("Timeout do fornecedor."); }
      } catch (err) {}
    }, 3000);
  };

  if (!hotel) return null;

  const formatarData = (dataString) => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    const meses = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return `${dia} de ${meses[mes - 1]} de ${ano}`;
  };

  const totalQuartos = currentRooms.length; 
  const totalGuests = currentRooms.reduce((acc, r) => acc + r.adults + r.childrenAges.length, 0);
  const metaInfo = staticData?.metapolicy_extra_info;

  const ofertasFiltradas = (ofertasAtuais || []).filter(oferta => {
    let matchRefeicao = filterRefeicoes === 'todas' || oferta.codigoRegime === filterRefeicoes;
    let matchCancelamento = filterCancelamento === 'todas' || (filterCancelamento === 'gratuito' ? oferta.freeCancellation : !oferta.freeCancellation);
    return matchRefeicao && matchCancelamento;
  });

  // Função para renderizar o iframe do mapa de forma limpa na lateral
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
            <div><span className="font-bold text-gray-500 uppercase block">Check-in</span><span className="font-bold text-gray-900">{formatarData(checkInDate)}</span></div>
            <div><span className="font-bold text-gray-500 uppercase block">Check-out</span><span className="font-bold text-gray-900">{formatarData(checkOutDate)}</span></div>
          </div>
          <button onClick={() => navigate(-1)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-2 rounded text-xs transition">
            Alterar busca
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LADO ESQUERDO: DETALHES, MAPA E POLÍTICAS */}
          <div className="lg:col-span-3 space-y-6">
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
               <span className="text-[#84cc16] text-xs">{'★'.repeat(staticData?.star_rating || hotel.categoria || 4)}</span>
               <h1 className="text-xl font-black text-gray-900 leading-tight">{staticData?.name || hotel.nome}</h1>
               <p className="text-xs text-gray-500 mt-2 flex gap-1"><span>📍</span> {staticData?.address || hotel.endereco}</p>
            </div>

            {/* MAPA RESTAURADO NA PÁGINA DE DETALHES */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-64 relative">
              <iframe title="Localização do Hotel" width="100%" height="100%" style={{ border: 0 }} srcDoc={buildSingleHotelMapHtml()}></iframe>
            </div>

            {/* POLÍTICAS E CONDIÇÕES DO HOTEL (METAPOLICY) */}
            {metaInfo && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 shadow-sm">
                <h3 className="font-bold text-sm mb-2 flex items-center gap-1">ℹ️ Políticas do Hotel (Meta Policy)</h3>
                <p className="whitespace-pre-line leading-relaxed">{metaInfo}</p>
              </div>
            )}

          </div>

          {/* LADO DIREITO: TARIFAS E QUARTOS */}
          <div className="lg:col-span-9 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            
            {!buscandoTarifas && ofertasAtuais.length === 0 && (
               <div className="p-8 text-center bg-red-50 text-red-700 rounded-xl border border-red-100">
                  <span className="text-4xl mb-3 block">⚠️</span>
                  <h3 className="text-lg font-bold mb-1">Não há tarifas disponíveis</h3>
                  <p className="text-sm font-medium">{hpError || "O hotel não possui quartos que acomodem essa configuração."}</p>
               </div>
            )}

            {ofertasAtuais.length > 0 && (
              <>
                <div className="hidden md:grid grid-cols-12 gap-2 bg-[#2d3748] text-white text-[10px] font-bold p-3 rounded-t-xl uppercase">
                  <div className="col-span-4 pl-2">Opção de Acomodação e Políticas</div>
                  <div className="col-span-2">Refeições</div>
                  <div className="col-span-3">Cancelamento</div>
                  <div className="col-span-2 text-right pr-4">Preço LÍQUIDO</div>
                  <div className="col-span-1 text-center">Ação</div>
                </div>

                {ofertasFiltradas.map((oferta, idx) => {
                  return (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 border-b border-gray-100 items-start hover:bg-gray-50 transition">
                      <div className="col-span-1 md:col-span-4 flex flex-col gap-1.5">
                        <h3 onClick={() => setActiveRoomDetail({ oferta })} className="font-bold text-sm text-blue-600 cursor-pointer hover:underline leading-tight pr-2">{oferta.tipoQuarto}</h3>
                        <span className="bg-[#4C1D95]/10 text-[#4C1D95] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider block w-max border border-[#4C1D95]/20">
                          Cobre {totalQuartos} Quarto(s) • {totalGuests} Hóspedes
                        </span>

                        {/* RATE POLICIES: NO SHOW E DEPOSIT */}
                        <div className="mt-2 space-y-1">
                          {oferta.noShow && (
                             <p className="text-[9px] text-orange-700 bg-orange-50 p-1 rounded border border-orange-100 inline-block w-max">
                               ⚠️ Multa de No-Show: {oferta.noShow.amount} {oferta.noShow.currency_code}
                             </p>
                          )}
                          {oferta.deposit && (
                             <p className="text-[9px] text-blue-700 bg-blue-50 p-1 rounded border border-blue-100 inline-block w-max">
                               💳 Depósito exigido: Ver regras do hotel
                             </p>
                          )}
                        </div>

                        {/* TAXAS NÃO INCLUSAS NO DETALHE DO QUARTO */}
                        {oferta.excludedTaxes?.length > 0 && (
                          <div className="mt-2 bg-red-50 p-2 rounded border border-red-100">
                            <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Taxas a pagar no hotel:</p>
                            <ul className="list-disc pl-3">
                              {oferta.excludedTaxes.map((tax, i) => (
                                <li key={i} className="text-[10px] text-red-600 font-medium">{tax.name}: {tax.amount} {tax.currency_code}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="col-span-1 md:col-span-2 text-xs font-bold text-[#15803d] pt-1">🍽️ {oferta.nomeRegime}</div>
                      
                      <div className="col-span-1 md:col-span-3 text-xs font-bold pt-1 flex flex-col gap-1 pr-2">
                        {oferta.freeCancellation ? (
                          <span className="text-[#15803d] leading-snug">↩️ {oferta.cancellationDeadline}</span>
                        ) : (
                          <span className="text-red-600 leading-snug">❌ Não reembolsável</span>
                        )}
                      </div>

                      <div className="col-span-1 md:col-span-2 pt-1 text-right pr-4">
                        <span className="text-base font-black text-gray-900 block tracking-tight">BRL {oferta.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                      </div>

                      <div className="col-span-1 md:col-span-1 flex justify-center pt-1">
                        <button onClick={() => setActiveRoomDetail({ oferta })} disabled={buscandoTarifas} className="w-full bg-[#ffc107] hover:bg-yellow-500 disabled:opacity-50 text-gray-900 font-bold py-2 rounded shadow text-xs transition uppercase">
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

      {/* MODAL: DETALHES E START PREBOOK */}
      {activeRoomDetail && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden relative p-8">
            <button onClick={() => setActiveRoomDetail(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black font-black text-xl">✕</button>
            <h2 className="text-xl font-black text-gray-900 leading-tight mb-2">{activeRoomDetail.oferta.tipoQuarto}</h2>
            
            <div className="text-center mb-6 mt-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Preço Total para todo o Grupo ({totalQuartos} quartos)</p>
              <p className="text-3xl font-black text-gray-900">BRL {activeRoomDetail.oferta.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>

            <button onClick={() => handleStartBooking(activeRoomDetail.oferta)} className="w-full bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-bold py-3.5 rounded-xl shadow-md transition text-xs uppercase tracking-wider">
              Confirmar e Prosseguir
            </button>
          </div>
        </div>, document.body
      )}

      {/* MODAL DO CHECKOUT (FORM + FINISH) */}
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

                  {/* ALERTA DE TAXAS NO CHECKOUT B2B */}
                  {selectedOffer.excludedTaxes?.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                      <p className="text-sm font-black text-red-700 mb-2 flex items-center gap-1.5">⚠️ Atenção: Impostos locais não incluídos</p>
                      <p className="text-xs text-red-600 mb-3 font-medium">O hotel cobrará obrigatoriamente as seguintes taxas diretamente no destino (payable at the hotel):</p>
                      <ul className="list-disc pl-5">
                        {selectedOffer.excludedTaxes.map((t, i) => (
                          <li key={i} className="text-xs font-black text-red-800 tracking-wide mb-1">{t.name}: {t.amount} {t.currency_code}</li>
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