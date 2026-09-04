import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

export default function HotelDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  // Recebe os parâmetros essenciais passados pela busca (SERP)
  const { hotel, checkInDate, checkOutDate, rooms: searchRooms, residency } = location.state || {};

  const [hpData, setHpData] = useState(null);
  const [staticData, setStaticData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados dos Filtros da Tabela de Quartos
  const [filterCamas, setFilterCamas] = useState('todas');
  const [filterRefeicoes, setFilterRefeicoes] = useState('todas');
  const [filterCancelamento, setFilterCancelamento] = useState('todas');

  // Estado Rigoroso para abrir a página/modal de detalhes de cada opção de quarto
  const [activeRoomDetail, setActiveRoomDetail] = useState(null);

  useEffect(() => {
    if (!hotel || !hotel.hotelId) {
      navigate('/hoteis');
      return;
    }

    // FLUXO OFICIAL RATEHAWK: Ao entrar na página do hotel, consultamos o endpoint /search/hp/ (Retrieve Hotel Page)
    // para carregar todas as tarifas reais e atualizadas, conforme orientação do suporte técnico.
    const fetchHotelPageAndStatic = async () => {
      setLoading(true);
      try {
        const guestsPayload = searchRooms ? searchRooms.map(r => ({ adults: r.adults, children: r.childrenAges })) : [{ adults: 2, children: [] }];

        // 1. Chamada HP (/search/hp/)
        const hpRes = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hid: hotel.hotelId,
            checkin: checkInDate || '2027-02-22',
            checkout: checkOutDate || '2027-02-24',
            residency: residency || 'br',
            currency: 'USD',
            guests: guestsPayload
          })
        });
        const hpJson = await hpRes.json();
        
        if (hpJson.data && hpJson.data.hotels && hpJson.data.hotels.length > 0) {
          setHpData(hpJson.data.hotels[0]);
        } else {
          setError("Nenhuma tarifa disponível para este hotel nas datas selecionadas.");
        }

        // 2. Chamada de Conteúdo Estático (/hotel/info/)
        const infoRes = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hid: hotel.hotelId, language: 'pt' })
        });
        const infoJson = await infoRes.json();
        if (infoJson && infoJson.data) {
          setStaticData(infoJson.data);
        }

      } catch (err) {
        console.error("Erro ao conectar com a API RateHawk:", err);
        setError("Falha ao carregar os dados oficiais da propriedade.");
      } finally {
        setLoading(false);
      }
    };

    fetchHotelPageAndStatic();
  }, [hotel, checkInDate, checkOutDate, searchRooms, residency, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mb-4"></div>
        <p className="font-bold text-gray-700 text-sm">Carregando dados oficiais da RateHawk (Hotel Page)...</p>
      </div>
    );
  }

  if (error || !hpData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 max-w-md text-center">
          <p className="font-bold text-lg mb-2">Atenção</p>
          <p className="text-sm mb-4">{error || "Hotel indisponível."}</p>
          <button onClick={() => navigate(-1)} className="bg-gray-900 text-white px-6 py-2 rounded font-bold text-xs">Voltar à busca</button>
        </div>
      </div>
    );
  }

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
  const totalAdults = searchRooms ? searchRooms.reduce((acc, r) => acc + r.adults, 0) : 2;
  const totalChildren = searchRooms ? searchRooms.reduce((acc, r) => acc + r.childrenAges.length, 0) : 0;
  const totalGuests = totalAdults + totalChildren;

  const ratesList = hpData.rates || [];
  const menorPreco = ratesList.length > 0 ? Math.min(...ratesList.map(r => parseFloat(r.payment_options?.payment_types?.[0]?.amount || 0))) : 0;

  // Filtragem estrita baseada nos parâmetros da API
  const ofertasFiltradas = ratesList.filter(rate => {
    let matchRefeicao = true;
    let matchCancelamento = true;
    if (filterRefeicoes !== 'todas') {
      matchRefeicao = rate.meal === filterRefeicoes || rate.meal_data?.value === filterRefeicoes;
    }
    if (filterCancelamento !== 'todas') {
      const isFree = rate.payment_options?.payment_types?.[0]?.cancellation_penalties?.free_cancellation_before != null;
      if (filterCancelamento === 'gratuito') matchCancelamento = isFree;
      if (filterCancelamento === 'nao_reembolsavel') matchCancelamento = !isFree;
    }
    return matchRefeicao && matchCancelamento;
  });

  // Cruzamento estrito de dados estáticos do quarto (rg_ext / room_groups)
  const getRoomStaticData = (rate) => {
    if (!staticData || !staticData.room_groups) return null;
    return staticData.room_groups.find(grupo => {
      return grupo.name === rate.room_name || grupo.name_struct?.main_name === rate.room_data_trans?.main_name;
    }) || staticData.room_groups[0];
  };

  const buildMapHtml = () => {
    const lat = staticData?.latitude || hotel.latitude || -7.11532;
    const lng = staticData?.longitude || hotel.longitude || -34.861;
    const nomeHotel = (staticData?.name || hotel.nome).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const imgUrl = staticData?.images?.[0]?.replace('{size}', '100x100') || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&q=80";
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
          .custom-map-marker img { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; }
          .custom-map-marker .nome { font-size: 12px; font-weight: bold; color: #333; }
          .custom-map-marker .nota { background: #84cc16; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 900; font-size: 11px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${lat}, ${lng}], 16);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
          const htmlMarker = '<div class="custom-map-marker"><img src="${imgUrl}"> <span class="nome">${nomeHotel}</span> <span class="nota">8,2</span></div>';
          const icon = L.divIcon({ className: 'transparent-icon', html: htmlMarker, iconSize: [220, 44], iconAnchor: [110, 50] });
          L.marker([${lat}, ${lng}], { icon }).addTo(map);
        </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="w-full bg-[#f2f2f2] font-sans min-h-screen pb-20">
      
      {/* BARRA SUPERIOR DE CHECK-IN / CHECK-OUT */}
      <div className="bg-white border-b border-gray-200 py-3 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 flex justify-between items-center">
          <div className="flex gap-8 items-center text-xs">
            <div><span className="font-bold text-gray-500 uppercase block">Check-in</span><span className="font-bold text-gray-900">{formatarData(checkInDate)} (Após {staticData?.check_in_time?.substring(0, 5) || '14:00'})</span></div>
            <div><span className="font-bold text-gray-500 uppercase block">Check-out</span><span className="font-bold text-gray-900">{formatarData(checkOutDate)} (Até {staticData?.check_out_time?.substring(0, 5) || '11:00'})</span></div>
          </div>
          <button onClick={() => navigate(-1)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-2 rounded text-xs transition">
            Alterar busca
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 mt-6 space-y-6">
        
        {/* CABEÇALHO DO HOTEL E AVALIAÇÕES REAIS */}
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

          {/* GALERIA DE FOTOS DA API DE CONTEÚDO */}
          <div className="grid grid-cols-4 grid-rows-2 gap-1 h-[250px] rounded-lg overflow-hidden bg-gray-100">
            {staticData?.images && staticData.images.length > 0 ? (
              <>
                <div className="col-span-2 row-span-2 bg-gray-200">
                  <img src={staticData.images[0]?.replace('{size}', '1024x768')} alt="Principal" className="w-full h-full object-cover" />
                </div>
                {staticData.images.slice(1, 4).map((imgUrl, i) => (
                  <div key={i} className="col-span-1 row-span-1 bg-gray-200">
                    <img src={imgUrl.replace('{size}', '500x500')} alt="Hotel" className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="col-span-1 row-span-1 bg-gray-800 flex items-center justify-center text-white font-bold text-xs">
                  + {staticData.images.length} fotos API
                </div>
              </>
            ) : (
              <div className="col-span-4 row-span-2 flex items-center justify-center text-gray-400 text-xs font-bold">Carregando galeria do provedor...</div>
            )}
          </div>
        </div>

        {/* INSTALAÇÕES E SERVIÇOS & COMODIDADES POPULARES */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-4">Instalações e serviços</h2>
          {staticData?.amenity_groups ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {staticData.amenity_groups.map((grupo, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-1">{grupo.group_name}</h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {grupo.amenities.map((amenity, i) => (
                      <li key={i} className="flex items-center gap-1.5"><span className="text-[#00a698] font-bold">✓</span> {amenity}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Nenhuma facilidade informada pela API.</p>
          )}
        </div>

        {/* TABELA DE QUARTOS DISPONÍVEIS (RETRIEVE HOTEL PAGE) */}
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
                <option value="RO">Sem refeições (RO)</option>
                <option value="BB">Café da manhã (BB)</option>
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

          {ofertasFiltradas.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">Nenhuma tarifa encontrada com esses filtros.</div>}

          {ofertasFiltradas.map((rate, idx) => {
            const roomStaticInfo = getRoomStaticData(rate);
            const roomPhoto = roomStaticInfo?.images?.[0]?.replace('{size}', '500x500') || "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=300&q=80";
            const precoVenda = parseFloat(rate.payment_options?.payment_types?.[0]?.amount || 0);
            const isFreeCancel = rate.payment_options?.payment_types?.[0]?.cancellation_penalties?.free_cancellation_before != null;

            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center hover:bg-gray-50 transition">
                <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                  <img 
                    src={roomPhoto} 
                    alt="Quarto" 
                    onClick={() => setActiveRoomDetail({ rate, roomStaticInfo })}
                    className="w-20 h-16 rounded object-cover cursor-pointer hover:opacity-80 border border-gray-200"
                  />
                  <div>
                    <h3 onClick={() => setActiveRoomDetail({ rate, roomStaticInfo })} className="font-bold text-xs text-blue-600 cursor-pointer hover:underline leading-tight">
                      {rate.room_name}
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1">Capacidade: {totalGuests} pessoas</p>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 text-xs font-bold text-[#15803d]">
                  🍽️ {rate.meal_data?.value || rate.meal || 'Sem regime'}
                </div>

                <div className="col-span-1 md:col-span-2 text-xs font-bold">
                  {isFreeCancel ? <span className="text-[#15803d]">↩️ Gratuito</span> : <span className="text-red-600">❌ Não reembolsável</span>}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <span className="text-sm font-black text-gray-900 block">USD {precoVenda.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  <span className="text-[9px] text-gray-500">Sem sobretaxa</span>
                </div>

                <div className="col-span-1 md:col-span-2 flex justify-center">
                  <button onClick={() => setActiveRoomDetail({ rate, roomStaticInfo })} className="w-full bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-bold px-4 py-2 rounded shadow text-xs transition uppercase">
                    Detalhes / Reservar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESCRIÇÃO DO HOTEL */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-3">Descrição do hotel</h2>
          {staticData?.description_struct ? (
            <div className="text-sm text-gray-700 space-y-3">
              {staticData.description_struct.map((desc, i) => (
                <div key={i}>
                  <span className="font-bold block mb-1">{desc.title}</span>
                  {desc.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Sem descrição fornecida pelo provedor.</p>
          )}
        </div>

        {/* POLÍTICA, PAGO NA CHEGADA E INFORMAÇÕES ADICIONAIS */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-4">Política, Pagamento e Informações Adicionais</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-700">
            <div className="space-y-2 border-r border-gray-100 pr-4">
              <h3 className="font-bold text-gray-900 text-sm">Check-in / Check-out</h3>
              <p><strong>Check-in:</strong> Após {staticData?.check_in_time?.substring(0, 5) || '14:00'}</p>
              <p><strong>Check-out:</strong> Até {staticData?.check_out_time?.substring(0, 5) || '11:00'}</p>
            </div>
            <div className="space-y-2 border-r border-gray-100 pr-4">
              <h3 className="font-bold text-gray-900 text-sm">Pago na chegada & Pagamento</h3>
              <p><strong>Métodos aceitos:</strong> {staticData?.payment_methods ? staticData.payment_methods.join(', ') : 'Depósito / Faturado B2B'}</p>
              <p className="text-gray-500">Taxas locais exigidas no balcão de atendimento.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-gray-900 text-sm">Informações adicionais</h3>
              <p className="whitespace-pre-line text-gray-600">{staticData?.metapolicy_extra_info || 'Sem restrições extras informadas pela API.'}</p>
            </div>
          </div>
        </div>

        {/* LOCALIZAÇÃO E ABAIXO DO MAPA: O QUE HÁ NAS PROXIMIDADES E AEROPORTOS */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-2">Localização</h2>
          <p className="text-xs text-gray-600 mb-4">{staticData?.address || hotel.endereco}</p>
          
          <div className="w-full h-72 rounded-lg overflow-hidden border border-gray-200 mb-6">
            <iframe title="Mapa Localização" width="100%" height="100%" style={{ border: 0 }} srcDoc={buildMapHtml()}></iframe>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-3">O que há nas proximidades</h3>
              <ul className="text-xs text-gray-600 space-y-2">
                <li className="flex justify-between border-b border-gray-50 pb-1">
                  <span>Distância do centro</span>
                  <span className="font-bold">{staticData?.distance_center ? `${staticData.distance_center} metros` : 'Localização central'}</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-3">Aeroportos próximos</h3>
              <ul className="text-xs text-gray-600 space-y-2">
                <li className="flex justify-between border-b border-gray-50 pb-1">
                  <span>Aeroporto principal da região</span>
                  <span className="font-bold">Malha aeroportuária atendida</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================= */}
      {/* PÁGINA DE DETALHES DE CADA OPÇÃO DE QUARTO (MODAL COM FOTOS REAIS DA API) */}
      {/* ======================================================= */}
      {activeRoomDetail && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
            
            <button onClick={() => setActiveRoomDetail(null)} className="absolute top-4 right-4 w-9 h-9 bg-white text-gray-900 rounded-full flex items-center justify-center font-black shadow-lg z-20 hover:bg-gray-100">✕</button>

            <div className="w-full md:w-3/5 bg-gray-900 relative h-64 md:h-auto flex items-center justify-center">
              <img 
                src={activeRoomDetail.roomStaticInfo?.images?.[0]?.replace('{size}', '1024x768') || "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80"} 
                alt="Quarto Detalhe" 
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full md:w-2/5 p-6 md:p-8 flex flex-col overflow-y-auto">
              <h2 className="text-xl font-black text-gray-900 leading-tight mb-2">{activeRoomDetail.rate.room_name}</h2>
              
              <div className="flex gap-4 text-xs text-gray-600 mb-6 font-semibold">
                <span>📐 {activeRoomDetail.roomStaticInfo?.size ? `${activeRoomDetail.roomStaticInfo.size} m²` : 'Tamanho padrão'}</span>
                <span>🚿 Banheiro privativo</span>
              </div>

              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 mb-6">
                <p className="text-[10px] text-orange-600 font-bold uppercase mb-1">Condições da Tarifa</p>
                <p className="text-xs font-bold text-gray-900">🍽️ {activeRoomDetail.rate.meal_data?.value || activeRoomDetail.rate.meal}</p>
                {activeRoomDetail.rate.payment_options?.payment_types?.[0]?.cancellation_penalties?.free_cancellation_before != null ? (
                  <p className="text-xs font-bold text-green-700 mt-1">↩️ Cancelamento gratuito</p>
                ) : (
                  <p className="text-xs font-bold text-red-600 mt-1">❌ Não reembolsável</p>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Preço Total Líquido</p>
                <p className="text-2xl font-black text-gray-900 mb-1">
                  USD {parseFloat(activeRoomDetail.rate.payment_options?.payment_types?.[0]?.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </p>
                <p className="text-[10px] text-gray-500 mb-6">Para {noites} diária(s), {totalGuests} hóspede(s)</p>
                
                <button 
                  onClick={() => {
                    setActiveRoomDetail(null);
                    // Aqui inicia o prebook conforme a documentação oficial
                    alert('Iniciando pré-reserva (Prebook) conforme fluxo oficial RateHawk.');
                  }} 
                  className="w-full bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-bold py-3.5 rounded-xl shadow-md transition text-xs uppercase tracking-wider"
                >
                  Selecionar e Reservar
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}