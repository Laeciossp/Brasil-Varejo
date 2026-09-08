import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vcqiilytjrrurdbscmio.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_leFg1lWGZlctiU3CXYR2Gw_FpOG2qR3"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function HotelDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  const { hotel, checkInDate, checkOutDate, rooms: searchRooms, residency } = location.state || {};
  const currentRooms = searchRooms || [{ adults: 1, childrenAges: [] }];
  const currentResidency = residency || 'br';

  const [staticData, setStaticData] = useState(null);
  const [loadingStatic, setLoadingStatic] = useState(true);
  
  const [filterCamas, setFilterCamas] = useState('todas');
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
        if (error) console.warn("Hotel não encontrado no Supabase, usando fallback.");

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
          });
        } else {
          setStaticData({
            name: hotel.nome, address: hotel.endereco, star_rating: hotel.categoria,
            latitude: hotel.latitude, longitude: hotel.longitude, images: hotel.imagensReais || [],
            amenity_groups: parseAmenities(hotel.comodidades), description: parseDescription(hotel.descricao)
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
              const newOffers = data.data.hotels[0].rates.map(r => ({
                  tipoQuarto: r.room_name || 'Quarto Standard', 
                  codigoRegime: r.meal === 'breakfast' ? 'BB' : 'RO',
                  nomeRegime: r.meal_data?.value || 'Sem refeições', 
                  precoVenda: parseFloat(r.payment_options?.payment_types?.[0]?.amount || r.daily_prices?.[0] || 0) * 5.1,
                  paymentTypeObj: r.payment_options?.payment_types?.[0], 
                  bookHash: r.book_hash, 
                  freeCancellation: r.payment_options?.payment_types?.[0]?.cancellation_penalties?.free_cancellation_before != null
              }));
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
    
    // 🚀 IDs limpos e padrão para produção
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

  const noites = (!checkInDate || !checkOutDate) ? 1 : Math.ceil(Math.abs(new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
  const totalGuests = currentRooms.reduce((acc, r) => acc + r.adults + r.childrenAges.length, 0);
  const totalQuartos = currentRooms.length; 
  
  const menorPreco = ofertasAtuais && ofertasAtuais.length > 0 ? Math.min(...ofertasAtuais.map(o => o.precoVenda)) : 0;

  const ofertasFiltradas = (ofertasAtuais || []).filter(oferta => {
    let matchRefeicao = filterRefeicoes === 'todas' || oferta.codigoRegime === filterRefeicoes;
    let matchCancelamento = filterCancelamento === 'todas' || (filterCancelamento === 'gratuito' ? oferta.freeCancellation : !oferta.freeCancellation);
    return matchRefeicao && matchCancelamento;
  });

  return (
    <div className="w-full bg-[#f2f2f2] font-sans min-h-screen pb-20">
      
      <div className="bg-white border-b border-gray-200 py-3 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 flex justify-between items-center">
          <div className="flex gap-8 items-center text-xs">
            <div><span className="font-bold text-gray-500 uppercase block">Check-in</span><span className="font-bold text-gray-900">{formatarData(checkInDate)}</span></div>
            <div><span className="font-bold text-gray-500 uppercase block">Check-out</span><span className="font-bold text-gray-900">{formatarData(checkOutDate)}</span></div>
          </div>
          <button onClick={() => navigate(-1)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-2 rounded text-xs transition">
            Alterar busca
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 mt-6 space-y-6">
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[#84cc16] text-xs">{'★'.repeat(staticData?.star_rating || hotel.categoria || 4)}</span>
              <h1 className="text-2xl font-black text-gray-900">{staticData?.name || hotel.nome}</h1>
              <p className="text-xs text-gray-500 mt-1">📍 {staticData?.address || hotel.endereco}</p>
            </div>
          </div>

          {!buscandoTarifas && ofertasAtuais.length === 0 && (
             <div className="p-8 text-center bg-red-50 text-red-700">
                <span className="text-4xl mb-3 block">⚠️</span>
                <h3 className="text-lg font-bold mb-1">Não há tarifas disponíveis</h3>
                <p className="text-sm font-medium">{hpError || "O hotel não possui quartos que acomodem essa configuração."}</p>
             </div>
          )}

          {ofertasAtuais.length > 0 && (
            <>
              <div className="hidden md:grid grid-cols-12 gap-2 bg-[#2d3748] text-white text-[10px] font-bold p-3 uppercase mt-6">
                <div className="col-span-4 pl-2">Opção de Acomodação</div>
                <div className="col-span-2">Refeições</div>
                <div className="col-span-2">Cancelamento</div>
                <div className="col-span-2">Preço LÍQUIDO</div>
                <div className="col-span-2 text-center">Ação</div>
              </div>

              {ofertasFiltradas.map((oferta, idx) => {
                return (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center hover:bg-gray-50 transition">
                    <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                      <div className="w-20 h-16 rounded bg-gray-100 border border-gray-200 flex items-center justify-center cursor-pointer hover:opacity-80 text-gray-400">🛏️</div>
                      <div>
                        <h3 onClick={() => setActiveRoomDetail({ oferta })} className="font-bold text-xs text-blue-600 cursor-pointer hover:underline leading-tight">{oferta.tipoQuarto}</h3>
                        <span className="bg-[#4C1D95]/10 text-[#4C1D95] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider block w-max mt-1.5 border border-[#4C1D95]/20">
                          Cobre {totalQuartos} Quarto(s) • {totalGuests} Hóspedes
                        </span>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 text-xs font-bold text-[#15803d]">🍽️ {oferta.nomeRegime}</div>
                    <div className="col-span-1 md:col-span-2 text-xs font-bold">{oferta.freeCancellation ? <span className="text-[#15803d]">↩️ Gratuito</span> : <span className="text-red-600">❌ Não reembolsável</span>}</div>
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-sm font-black text-gray-900 block">BRL {oferta.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-center">
                      <button onClick={() => setActiveRoomDetail({ oferta })} disabled={buscandoTarifas} className="w-full bg-[#ffc107] hover:bg-yellow-500 disabled:opacity-50 text-gray-900 font-bold px-4 py-2 rounded shadow text-xs transition uppercase">
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
              <h3 className="font-black text-sm uppercase tracking-wide">Finalizar Reserva</h3>
              {bookingStep !== 'booking' && <button onClick={() => setBookingStep('idle')} className="text-gray-400 hover:text-white text-xl">✕</button>}
            </div>

            <div className="p-6 sm:p-7">
              {bookingStep === 'prebooking' && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-800 font-black text-lg">Validando disponibilidade e tarifas...</p>
                </div>
              )}

              {bookingStep === 'details' && selectedOffer && (
                <form onSubmit={handleConfirmBooking}>
                  <div className="mb-5 bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-inner">
                    <p className="font-black text-gray-900 text-base">{selectedOffer.hotelNome}</p>
                    <p className="text-xl font-black text-green-700 mt-2">BRL {selectedOffer.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>

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
                      <input type="text" placeholder="Telefone" required value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium outline-none" />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl shadow-lg uppercase text-sm tracking-wide">
                    Confirmar Reserva 
                  </button>
                </form>
              )}

              {bookingStep === 'booking' && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-800 font-black text-lg">Processando sua reserva...</p>
                </div>
              )}

              {bookingStep === 'success' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">✓</div>
                  <h4 className="text-xl font-black text-gray-900 mb-2">Reserva Confirmada!</h4>
                  <p className="text-sm text-gray-600 mb-5 bg-gray-50 py-2 px-4 rounded-lg border inline-block">ID do Pedido: <span className="font-bold">{finalPartnerOrderId}</span></p>
                  <button onClick={() => setBookingStep('idle')} className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide">Fechar</button>
                </div>
              )}

              {bookingStep === 'error' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">✕</div>
                  <h4 className="text-xl font-black text-gray-900 mb-2">Ops! Ocorreu um problema.</h4>
                  <p className="text-sm text-red-600 mb-5 bg-red-50 p-3 rounded-lg border border-red-100 break-words max-h-40 overflow-y-auto">{bookingError}</p>
                  <button onClick={() => setBookingStep('idle')} className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide">Tentar Novamente</button>
                </div>
              )}
            </div>

          </div>
        </div>, document.body
      )}
    </div>
  );
}