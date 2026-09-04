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

  const { hotel, checkInDate, checkOutDate, rooms: searchRooms } = location.state || {};
  const currentRooms = searchRooms || [{ adults: 1, childrenAges: [] }];

  const [staticData, setStaticData] = useState(null);
  const [loadingStatic, setLoadingStatic] = useState(true);
  
  const [filterCamas, setFilterCamas] = useState('todas');
  const [filterRefeicoes, setFilterRefeicoes] = useState('todas');
  const [filterCancelamento, setFilterCancelamento] = useState('todas');
  const [activeRoomDetail, setActiveRoomDetail] = useState(null);

  // ==========================================
  // ESTADOS DO FLUXO DE RESERVA B2B
  // ==========================================
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [bookingStep, setBookingStep] = useState('idle'); 
  const [bookingError, setBookingError] = useState(null);
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [finalPartnerOrderId, setFinalPartnerOrderId] = useState('');

  useEffect(() => {
    if (!hotel || !hotel.hotelId) {
      navigate('/hoteis');
      return;
    }

    const fetchHotelFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('Hotel')
          .select('*')
          .eq('id', String(hotel.hotelId))
          .single();

        if (error) {
          console.warn("Hotel não encontrado na base local do Supabase, utilizando dados básicos da busca.");
        }

        if (data) {
          setStaticData({
            name: data.name,
            address: data.address,
            star_rating: data.starRating,
            latitude: data.latitude,
            longitude: data.longitude,
            images: data.images || [],
            amenity_groups: data.amenities || [],
            check_in_time: "14:00",
            check_out_time: "11:00",
            payment_methods: ["Cartão de Crédito", "Faturado B2B"],
            metapolicy_extra_info: "Consulte as regras de cancelamento e taxas locais aplicáveis no momento do prebook."
          });
        } else {
          setStaticData({
            name: hotel.nome,
            address: hotel.endereco,
            star_rating: hotel.categoria,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            images: [],
            amenity_groups: []
          });
        }
      } catch (err) {
        console.error("Erro ao buscar dados estáticos do Supabase:", err);
      } finally {
        setLoadingStatic(false);
      }
    };

    fetchHotelFromSupabase();
  }, [hotel, navigate]);

  // ==========================================
  // LÓGICA DE FINALIZAÇÃO DA RESERVA (PREBOOK -> BOOKING -> FINISH)
  // ==========================================
  const handleStartBooking = async (oferta) => {
    setActiveRoomDetail(null); // Fecha o modal de detalhes do quarto
    setSelectedOffer({ ...oferta, hotelNome: staticData?.name || hotel.nome, hotelId: hotel.hotelId });
    setBookingStep('prebooking');
    setBookingError(null);

    try {
      const res = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-prebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_hash: oferta.bookHash, price_increase_percent: 10 })
      });
      const data = await res.json();

      if (data.error || data.data?.error || data.status === 'error') {
        setBookingStep('error');
        setBookingError("Tarifa esgotada ou indisponível (no_available_rates).");
        return;
      }

      const novoBookHashP = data.data?.hotels?.[0]?.rates?.[0]?.book_hash || oferta.bookHash;
      const infoPagamentoAtualizada = data.data?.hotels?.[0]?.rates?.[0]?.payment_options?.payment_types?.[0];

      if (!novoBookHashP || !novoBookHashP.startsWith('p-')) {
        throw new Error("O Prebook não retornou um hash de reserva válido (p-...).");
      }

      setSelectedOffer(prev => ({ 
        ...prev, 
        bookHash: novoBookHashP, 
        paymentTypeObj: infoPagamentoAtualizada || prev.paymentTypeObj
      }));

      setBookingStep('details');
    } catch (err) {
      setBookingStep('error');
      setBookingError(err.message || "Erro ao validar tarifa no fornecedor.");
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!guestFirstName || !guestLastName || !guestEmail) return;

    setBookingStep('booking');
    setBookingError(null);
    const partnerOrderId = `palastore_${Date.now()}`;
    setFinalPartnerOrderId(partnerOrderId);

    try {
      const roomsFormatados = currentRooms.map(() => {
        return {
          guests: [
            {
              first_name: guestFirstName,
              last_name: guestLastName,
              is_child: false
            }
          ]
        };
      });

      const orderPayload = {
        partner_order_id: partnerOrderId,
        hash: selectedOffer.bookHash,
        language: "en",
        user: { 
          email: guestEmail, 
          phone: guestPhone || "+5571999999999", 
          comment: "Reserva Teste B2B - Certificação" 
        },
        rooms: roomsFormatados
      };

      const formRes = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-booking-form', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload)
      });
      const formData = await formRes.json();
      
      if (formData.status !== 'ok') {
        console.error("Erro API Form:", formData);
        throw new Error(`Erro API Form: ${JSON.stringify(formData.error || formData.message || "Desconhecido")}`);
      }

      const paymentTypeData = selectedOffer.paymentTypeObj ? {
        type: selectedOffer.paymentTypeObj.type || "deposit",
        amount: selectedOffer.paymentTypeObj.amount,
        currency_code: selectedOffer.paymentTypeObj.currency_code
      } : { type: "deposit" };

      const finishRes = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-booking-finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          partner_order_id: partnerOrderId,
          payment_type: paymentTypeData,
          user_ip: "8.8.8.8",
          language: "en",
          user: orderPayload.user,
          rooms: roomsFormatados 
        })
      });
      const finishData = await finishRes.json();
      
      if (finishData.status !== 'ok' && finishData.error !== 'timeout' && finishData.error !== 'unknown') {
        console.error("Erro API Finish:", finishData);
        throw new Error(`Erro API Finish: ${JSON.stringify(finishData.error || finishData.message || "Desconhecido")}`);
      }

      pollBookingStatus(partnerOrderId);
    } catch (err) {
      setBookingStep('error');
      setBookingError(err.message || "Erro no processamento da reserva.");
    }
  };

  const pollBookingStatus = async (partnerOrderId) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-booking-status', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partner_order_id: partnerOrderId })
        });
        const data = await res.json();

        if (data.status === 'ok') {
          clearInterval(interval);
          setBookingStep('success');
        } else if (data.status !== 'processing' && data.error && !['timeout', 'unknown'].includes(data.error)) {
          clearInterval(interval);
          setBookingStep('error');
          setBookingError(`Reserva falhou. Motivo: ${data.error}`);
        }

        if (attempts >= 60) {
          clearInterval(interval);
          setBookingStep('error');
          setBookingError("Tempo limite excedido aguardando o fornecedor.");
        }
      } catch (err) {
        console.error("Erro no polling:", err);
      }
    }, 3000);
  };

  if (!hotel) return null;

  const formatarData = (dataString) => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    const meses = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return `${dia} de ${meses[mes - 1]} de ${ano}`;
  };

  const calcularNoites = () => {
    if (!checkInDate || !checkOutDate) return 1;
    const diffTime = Math.abs(new Date(checkOutDate) - new Date(checkInDate));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const noites = calcularNoites();
  const totalAdults = currentRooms.reduce((acc, r) => acc + r.adults, 0);
  const totalChildren = currentRooms.reduce((acc, r) => acc + r.childrenAges.length, 0);
  const totalGuests = totalAdults + totalChildren;
  const menorPreco = hotel.ofertas && hotel.ofertas.length > 0 ? Math.min(...hotel.ofertas.map(o => o.precoVenda)) : 0;

  const ofertasFiltradas = (hotel.ofertas || []).filter(oferta => {
    let matchRefeicao = true;
    let matchCancelamento = true;
    if (filterRefeicoes !== 'todas') matchRefeicao = oferta.codigoRegime === filterRefeicoes;
    if (filterCancelamento !== 'todas') {
      if (filterCancelamento === 'gratuito') matchCancelamento = oferta.freeCancellation === true;
      if (filterCancelamento === 'nao_reembolsavel') matchCancelamento = oferta.freeCancellation === false;
    }
    return matchRefeicao && matchCancelamento;
  });

  const getRoomStaticData = (oferta) => {
    if (!staticData || !staticData.room_groups) return null;
    return staticData.room_groups.find(grupo => {
      return grupo.name === oferta.tipoQuarto || grupo.name_struct?.main_name === oferta.tipoQuarto;
    }) || staticData.room_groups[0];
  };

  const buildMapHtml = () => {
    const lat = staticData?.latitude || hotel.latitude || -7.11532;
    const lng = staticData?.longitude || hotel.longitude || -34.861;
    const nomeHotel = (staticData?.name || hotel.nome).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; font-family: sans-serif; }
          #map { height: 100%; width: 100%; }
          .custom-map-marker { display: flex; align-items: center; gap: 8px; background: white; padding: 4px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); width: max-content; }
          .custom-map-marker .nome { font-size: 12px; font-weight: bold; color: #333; }
          .custom-map-marker .nota { background: #84cc16; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 900; font-size: 11px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${lat}, ${lng}], 16);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
          const htmlMarker = '<div class="custom-map-marker"><div style="width:36px;height:36px;border-radius:6px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:16px;">📍</div> <span class="nome">${nomeHotel}</span> <span class="nota">8,2</span></div>';
          const icon = L.divIcon({ className: 'transparent-icon', html: htmlMarker, iconSize: [200, 44], iconAnchor: [100, 50] });
          L.marker([${lat}, ${lng}], { icon }).addTo(map);
        </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="w-full bg-[#f2f2f2] font-sans min-h-screen pb-20">
      
      <div className="bg-white border-b border-gray-200 py-3 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 flex justify-between items-center">
          <div className="flex gap-8 items-center text-xs">
            <div><span className="font-bold text-gray-500 uppercase block">Check-in</span><span className="font-bold text-gray-900">{formatarData(checkInDate)} (Após {staticData?.check_in_time || '14:00'})</span></div>
            <div><span className="font-bold text-gray-500 uppercase block">Check-out</span><span className="font-bold text-gray-900">{formatarData(checkOutDate)} (Até {staticData?.check_out_time || '11:00'})</span></div>
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
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1 justify-end">
                <span className="text-sm font-bold text-gray-900">Avaliação RateHawk</span>
                <span className="bg-[#84cc16] text-white font-black px-2.5 py-1 rounded text-sm">8,2</span>
              </div>
              <span className="text-xs text-gray-500 uppercase">A partir de USD {menorPreco.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 grid-rows-2 gap-1 h-[250px] rounded-lg overflow-hidden bg-gray-100">
            {staticData?.images && staticData.images.length > 0 ? (
              <>
                <div className="col-span-2 row-span-2 bg-gray-200">
                  <img src={typeof staticData.images[0] === 'string' ? staticData.images[0].replace('{size}', '1024x768') : staticData.images[0]} alt="Principal" className="w-full h-full object-cover" />
                </div>
                {staticData.images.slice(1, 4).map((imgUrl, i) => (
                  <div key={i} className="col-span-1 row-span-1 bg-gray-200">
                    <img src={typeof imgUrl === 'string' ? imgUrl.replace('{size}', '500x500') : imgUrl} alt="Hotel" className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="col-span-1 row-span-1 bg-gray-800 flex items-center justify-center text-white font-bold text-xs">
                  + {staticData.images.length} fotos
                </div>
              </>
            ) : (
              <div className="col-span-4 row-span-2 flex items-center justify-center text-gray-400 text-xs font-bold bg-gray-200">
                Nenhuma imagem cadastrada no banco para este hotel.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-4">Instalações e serviços</h2>
          {loadingStatic ? (
            <p className="text-xs text-gray-500">Carregando instalações do banco...</p>
          ) : staticData?.amenity_groups && staticData.amenity_groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {staticData.amenity_groups.map((grupo, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-1">{grupo.group_name || "Comodidades"}</h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {(grupo.amenities || []).map((amenity, i) => (
                      <li key={i} className="flex items-center gap-1.5"><span className="text-[#00a698] font-bold">✓</span> {typeof amenity === 'string' ? amenity : amenity.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Nenhuma facilidade cadastrada.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-black text-gray-900 mb-4">Quartos disponíveis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select value={filterCamas} onChange={(e) => setFilterCamas(e.target.value)} className="border border-gray-300 rounded p-2 text-xs outline-none">
                <option value="todas">Camas: todas as opções</option>
                <option value="casal">Cama de casal</option>
              </select>
              <select value={filterRefeicoes} onChange={(e) => setFilterRefeicoes(e.target.value)} className="border border-gray-300 rounded p-2 text-xs outline-none">
                <option value="todas">Refeições: todas as opções</option>
                <option value="RO">Sem refeições</option>
                <option value="BB">Café da manhã</option>
              </select>
              <select value={filterCancelamento} onChange={(e) => setFilterCancelamento(e.target.value)} className="border border-gray-300 rounded p-2 text-xs outline-none">
                <option value="todas">Cancelamento: todas as opções</option>
                <option value="gratuito">Cancelamento gratuito</option>
              </select>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-12 gap-2 bg-[#2d3748] text-white text-[10px] font-bold p-3 uppercase">
            <div className="col-span-4 pl-2">Quarto</div>
            <div className="col-span-2">Refeições</div>
            <div className="col-span-2">Cancelamento</div>
            <div className="col-span-2">Preço LÍQUIDO</div>
            <div className="col-span-2 text-center">Ação</div>
          </div>

          {ofertasFiltradas.map((oferta, idx) => {
            const roomStaticInfo = getRoomStaticData(oferta);
            const roomPhoto = roomStaticInfo?.images?.[0]?.replace('{size}', '500x500') || (staticData?.images?.[0] ? (typeof staticData.images[0] === 'string' ? staticData.images[0].replace('{size}', '500x500') : staticData.images[0]) : null);

            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center hover:bg-gray-50 transition">
                <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                  
                  {roomPhoto ? (
                    <img 
                      src={roomPhoto} 
                      alt="Quarto" 
                      onClick={() => setActiveRoomDetail({ oferta, roomStaticInfo })}
                      className="w-20 h-16 rounded object-cover cursor-pointer hover:opacity-80 border border-gray-200"
                    />
                  ) : (
                    <div 
                      onClick={() => setActiveRoomDetail({ oferta, roomStaticInfo })}
                      className="w-20 h-16 rounded bg-gray-100 border border-gray-200 flex items-center justify-center cursor-pointer hover:opacity-80 text-gray-400"
                    >
                      <span className="text-xl" title="Sem foto no Sandbox">🛏️</span>
                    </div>
                  )}

                  <div>
                    <h3 onClick={() => setActiveRoomDetail({ oferta, roomStaticInfo })} className="font-bold text-xs text-blue-600 cursor-pointer hover:underline leading-tight">
                      {oferta.tipoQuarto}
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1">Clique para ver detalhes do quarto</p>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 text-xs font-bold text-[#15803d]">
                  🍽️ {oferta.nomeRegime}
                </div>

                <div className="col-span-1 md:col-span-2 text-xs font-bold">
                  {oferta.freeCancellation ? <span className="text-[#15803d]">↩️ Gratuito</span> : <span className="text-red-600">❌ Não reembolsável</span>}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <span className="text-sm font-black text-gray-900 block">USD {oferta.precoVenda.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  <span className="text-[9px] text-gray-500">Sem sobretaxa</span>
                </div>

                <div className="col-span-1 md:col-span-2 flex justify-center">
                  <button onClick={() => setActiveRoomDetail({ oferta, roomStaticInfo })} className="w-full bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-bold px-4 py-2 rounded shadow text-xs transition uppercase">
                    Detalhes / Reservar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-4">Política, Pagamento e Informações Adicionais</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-700">
            <div className="space-y-2 border-r border-gray-100 pr-4">
              <h3 className="font-bold text-gray-900 text-sm">Check-in / Check-out</h3>
              <p><strong>Check-in:</strong> Após {staticData?.check_in_time || '14:00'}</p>
              <p><strong>Check-out:</strong> Até {staticData?.check_out_time || '11:00'}</p>
            </div>
            <div className="space-y-2 border-r border-gray-100 pr-4">
              <h3 className="font-bold text-gray-900 text-sm">Pagamento</h3>
              <p><strong>Métodos aceitos:</strong> {staticData?.payment_methods ? staticData.payment_methods.join(', ') : 'Cartão / Faturado B2B'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-gray-900 text-sm">Informações adicionais</h3>
              <p className="whitespace-pre-line text-gray-600">{staticData?.metapolicy_extra_info || 'Sem restrições extras.'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-2">Localização</h2>
          <p className="text-xs text-gray-600 mb-4">{staticData?.address || hotel.endereco}</p>
          
          <div className="w-full h-72 rounded-lg overflow-hidden border border-gray-200 mb-6">
            <iframe title="Mapa Localização" width="100%" height="100%" style={{ border: 0 }} srcDoc={buildMapHtml()}></iframe>
          </div>
        </div>

      </div>

      {/* MODAL 1: DETALHES DO QUARTO */}
      {activeRoomDetail && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
            
            <button onClick={() => setActiveRoomDetail(null)} className="absolute top-4 right-4 w-9 h-9 bg-white text-gray-900 rounded-full flex items-center justify-center font-black shadow-lg z-20 hover:bg-gray-100">✕</button>

            <div className="w-full md:w-3/5 bg-gray-900 relative h-64 md:h-auto flex items-center justify-center">
              {(() => {
                const modalRoomPhoto = activeRoomDetail.roomStaticInfo?.images?.[0]?.replace('{size}', '1024x768') || (staticData?.images?.[0] ? (typeof staticData.images[0] === 'string' ? staticData.images[0].replace('{size}', '1024x768') : staticData.images[0]) : null);
                
                return modalRoomPhoto ? (
                  <img 
                    src={modalRoomPhoto} 
                    alt="Quarto Detalhe" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                    <span className="text-5xl mb-3">🛏️</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest border border-gray-700 px-3 py-1 rounded text-gray-400">Sem foto da acomodação no Sandbox</span>
                  </div>
                );
              })()}
            </div>

            <div className="w-full md:w-2/5 p-6 md:p-8 flex flex-col overflow-y-auto bg-white">
              <h2 className="text-xl font-black text-gray-900 leading-tight mb-2">{activeRoomDetail.oferta.tipoQuarto}</h2>
              
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 mb-6 mt-4">
                <p className="text-[10px] text-orange-600 font-bold uppercase mb-1">Condições da Tarifa</p>
                <p className="text-xs font-bold text-gray-900">🍽️ {activeRoomDetail.oferta.nomeRegime}</p>
                {activeRoomDetail.oferta.freeCancellation ? (
                  <p className="text-xs font-bold text-green-700 mt-1">↩️ Cancelamento gratuito</p>
                ) : (
                  <p className="text-xs font-bold text-red-600 mt-1">❌ Não reembolsável</p>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Preço Total Líquido</p>
                <p className="text-2xl font-black text-gray-900 mb-1">
                  USD {activeRoomDetail.oferta.precoVenda.toLocaleString('en-US', {minimumFractionDigits: 2})}
                </p>
                <p className="text-[10px] text-gray-500 mb-6">Para {noites} diária(s), {totalGuests} hóspede(s)</p>
                
                <button 
                  onClick={() => handleStartBooking(activeRoomDetail.oferta)} 
                  className="w-full bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-bold py-3.5 rounded-xl shadow-md transition text-xs uppercase tracking-wider"
                >
                  Reservar Agora
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: FLUXO DE CHECKOUT B2B (PREBOOK -> BOOKING FORM) */}
      {bookingStep !== 'idle' && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999999] bg-black/80 backdrop-blur-sm overflow-y-auto flex items-start justify-center pt-10 sm:pt-16 pb-10 px-4" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col relative overflow-hidden my-auto border border-gray-200">
            
            <div className="bg-gray-900 p-5 flex justify-between items-center text-white shrink-0">
              <h3 className="font-black text-sm uppercase tracking-wide">Finalizar Reserva B2B</h3>
              {bookingStep !== 'booking' && (
                <button onClick={() => setBookingStep('idle')} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
              )}
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
                    <p className="font-black text-gray-900 text-base leading-tight">{selectedOffer.hotelNome}</p>
                    <p className="text-xs font-medium text-gray-700 mt-1">{selectedOffer.tipoQuarto} - {selectedOffer.codigoRegime}</p>
                    <p className="text-xl font-black text-green-700 mt-2">USD {selectedOffer.precoVenda.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                  </div>

                  <p className="text-xs font-black text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-100 pb-2">Dados do Hóspede Principal</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <input type="text" placeholder="Nome" required value={guestFirstName} onChange={e => setGuestFirstName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition shadow-sm" />
                    <input type="text" placeholder="Sobrenome" required value={guestLastName} onChange={e => setGuestLastName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition shadow-sm" />
                  </div>
                  <input type="email" placeholder="E-mail" required value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium mb-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition shadow-sm" />
                  <input type="text" placeholder="Telefone com DDD" required value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium mb-6 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition shadow-sm" />

                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3 sm:py-4 rounded-xl shadow-lg hover:shadow-xl transition uppercase text-sm tracking-wide">
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
                  <p className="text-sm text-gray-600 mb-5 bg-gray-50 py-2 px-4 rounded-lg border border-gray-100 inline-block">ID do Pedido: <span className="font-bold">{finalPartnerOrderId}</span></p>
                  <button onClick={() => setBookingStep('idle')} className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-gray-800 transition shadow-lg">Fechar e Voltar</button>
                </div>
              )}

              {bookingStep === 'error' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">✕</div>
                  <h4 className="text-xl font-black text-gray-900 mb-2">Ops! Ocorreu um problema.</h4>
                  <p className="text-sm text-red-600 mb-5 bg-red-50 p-3 rounded-lg border border-red-100 break-words">{bookingError}</p>
                  <button onClick={() => setBookingStep('idle')} className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-gray-800 transition shadow-lg">Tentar Novamente</button>
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}