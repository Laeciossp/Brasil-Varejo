import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase'; 
import { createClient } from '@supabase/supabase-js';
import { Heart, Check } from 'lucide-react';
import useCartStore from '../store/useCartStore';

const SUPABASE_URL = "https://vcqiilytjrrurdbscmio.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_leFg1lWGZlctiU3CXYR2Gw_FpOG2qR3"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COUNTRIES = [
  { code: 'br', name: 'Brasil' }, { code: 'us', name: 'Estados Unidos' }, { code: 'pt', name: 'Portugal' },
  { code: 'ar', name: 'Argentina' }, { code: 'uy', name: 'Uruguai' }, { code: 'cl', name: 'Chile' },
  { code: 'co', name: 'Colômbia' }, { code: 'pe', name: 'Peru' }, { code: 'mx', name: 'México' },
  { code: 'ca', name: 'Canadá' }, { code: 'gb', name: 'Reino Unido' }, { code: 'es', name: 'Espanha' },
  { code: 'fr', name: 'França' }, { code: 'it', name: 'Itália' }, { code: 'de', name: 'Alemanha' },
  { code: 'cn', name: 'China' }, { code: 'jp', name: 'Japão' }, { code: 'ae', name: 'Emirados Árabes Unidos' },
  { code: 'ao', name: 'Angola' }, { code: 'mz', name: 'Moçambique' }, { code: 'za', name: 'África do Sul' },
  { code: 'ru', name: 'Federação Russa' }, { code: 'in', name: 'Índia' }, { code: 'au', name: 'Austrália' }
];

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
    return list.map(img => {
      let rawUrl = typeof img === 'string' ? img : (img?.url || img?.image || '');
      if (!rawUrl) return null;
      let formattedUrl = rawUrl.startsWith('//') ? 'https:' + rawUrl : rawUrl;
      return formattedUrl.replace('{size}', '1024x768');
    }).filter(Boolean);
  }
  return [];
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
  return `Cancelamento gratuito até ${datePart} às ${timePart}`;
};

const calculateNights = (inDate, outDate) => {
  if (!inDate || !outDate) return 1;
  const start = new Date(inDate);
  const end = new Date(outDate);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
};

export default function HotelSearch() {
  const { favorites, toggleFavorite } = useCartStore(); 
  const navigate = useNavigate();
  const [destinationQuery, setDestinationQuery] = useState('');
  const [regionId, setRegionId] = useState('');
  const [regionsResults, setRegionsResults] = useState([]);
  const [hotelsResults, setHotelsResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  
  const [rooms, setRooms] = useState([{ adults: 1, childrenAges: [] }]);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  
  const [residency, setResidency] = useState('br'); 
  const [stars, setStars] = useState([]); 
  const [meals, setMeals] = useState([]); 
  const [freeCancellation, setFreeCancellation] = useState(false);
  const [filterHotelName, setFilterHotelName] = useState('');
  const [sortBy, setSortBy] = useState('preco_crescente');

  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [searchOnMapMove, setSearchOnMapMove] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeGalleryHotel, setActiveGalleryHotel] = useState(null);
  const [mapCenterLatLon, setMapCenterLatLon] = useState(null);

  const dropdownRef = useRef(null);
  const guestDropdownRef = useRef(null);
  const checkInRef = useRef(null);
  const checkOutRef = useRef(null);

  const totalAdults = rooms.reduce((acc, r) => acc + r.adults, 0);
  const totalChildren = rooms.reduce((acc, r) => acc + r.childrenAges.length, 0);
  const totalGuests = totalAdults + totalChildren;
  const nightsCount = calculateNights(checkInDate, checkOutDate);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowDropdown(false);
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target)) setShowGuestDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleIframeMessage = (event) => {
      if (event.data && event.data.type === 'SELECT_HOTEL') {
        const idClicado = String(event.data.hotelId);
        const hotelSelecionado = results.find(h => String(h.hotelId) === idClicado);
        if (hotelSelecionado) {
          navigate('/hotel-details', { state: { hotel: hotelSelecionado, checkInDate, checkOutDate, rooms, residency } });
        }
      }
      if (event.data && event.data.type === 'MAP_MOVED') {
        setMapBounds(event.data.bounds);
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [results, navigate, checkInDate, checkOutDate, rooms, residency]);

  useEffect(() => {
    const fetchAutocompleteFromAPI = async () => {
      if (!destinationQuery || destinationQuery.length < 2) {
        setRegionsResults([]); setHotelsResults([]); setShowDropdown(false); return;
      }
      try {
        const workerUrl = `https://palastore-flights-api.laeciossp.workers.dev/hotel-autocomplete?query=${encodeURIComponent(destinationQuery)}`;
        const res = await fetch(workerUrl);
        const data = await res.json();
        const ratehawkRegions = data.regions || data.data?.regions || [];
        const ratehawkHotels = data.hotels || data.data?.hotels || [];

        setRegionsResults([...ratehawkRegions]); 
        setHotelsResults([...ratehawkHotels]);
        setShowDropdown(ratehawkRegions.length > 0 || ratehawkHotels.length > 0);
      } catch (err) {
        console.error("Erro no autocompletar:", err);
      }
    };
    const timer = setTimeout(fetchAutocompleteFromAPI, 350);
    return () => clearTimeout(timer);
  }, [destinationQuery]);

  const updateAdults = (roomIndex, delta) => {
    const newRooms = [...rooms];
    newRooms[roomIndex].adults = Math.max(1, Math.min(6, newRooms[roomIndex].adults + delta)); 
    setRooms(newRooms);
  };
  const addChild = (roomIndex) => {
    const newRooms = [...rooms];
    if (newRooms[roomIndex].childrenAges.length < 4) { newRooms[roomIndex].childrenAges.push(8); setRooms(newRooms); }
  };
  const removeChild = (roomIndex, childIndex) => {
    const newRooms = [...rooms];
    newRooms[roomIndex].childrenAges.splice(childIndex, 1);
    setRooms(newRooms);
  };
  const updateChildAge = (roomIndex, childIndex, age) => {
    const newRooms = [...rooms];
    newRooms[roomIndex].childrenAges[childIndex] = parseInt(age, 10);
    setRooms(newRooms);
  };
  const addRoom = () => { if (rooms.length < 9) setRooms([...rooms, { adults: 1, childrenAges: [] }]); };
  const removeRoom = (roomIndex) => { if (rooms.length > 1) setRooms(rooms.filter((_, idx) => idx !== roomIndex)); };

  const formatarDataExibicao = (dataString) => {
    if(!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    const meses = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return `${dia} de ${meses[mes - 1]} de ${ano}`;
  };

  const toggleStar = (star) => {
    if (stars.includes(star)) setStars(stars.filter(s => s !== star));
    else setStars([...stars, star]);
  };

  const toggleMeal = (meal) => {
    if (meals.includes(meal)) setMeals(meals.filter(m => m !== meal));
    else setMeals([...meals, meal]);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const targetDest = regionId || destinationQuery;
    if (!targetDest) return setError("Informe ou selecione um destino válido.");
    if (!checkInDate || !checkOutDate) return setError("Preencha as datas de check-in e check-out.");

    setLoading(true); setError(null); setResults([]); setShowGuestDropdown(false); 

    let cityLat = -23.5505; 
    let cityLng = -46.6333;
    try {
      const cityName = destinationQuery.split(',')[0];
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`);
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        cityLat = parseFloat(geoData[0].lat);
        cityLng = parseFloat(geoData[0].lon);
      }
    } catch (err) {}
    
    setMapCenterLatLon(`${cityLat},${cityLng}`);

    let ratehawkResults = [];

    try {
      const queryLower = destinationQuery.toLowerCase();
      const isTestSearch = queryLower.includes('los angeles') || queryLower.includes('conrad') || queryLower.includes('us-lax') || queryLower.includes('dubai');
      const hidsToSearch = isTestSearch ? [10004834, 8819557, 9015534, 8663536, 8473727] : [];

      if (hidsToSearch.length > 0) {
        const baseUrl = `https://palastore-flights-api.laeciossp.workers.dev/serp-hotels`; 
        const guestsPayload = rooms.map(room => ({
          adults: room.adults, children: room.childrenAges
        }));

        const response = await fetch(baseUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hids: hidsToSearch, checkin: checkInDate, checkout: checkOutDate, residency: residency, currency: "USD", guests: guestsPayload
          })
        });

        const resData = await response.json();
        const combinados = resData.data?.hotels || [];

        if (combinados.length > 0) {
          const matchedIds = combinados.map(h => String(h.id));
          let dbHotels = [];
          if (matchedIds.length > 0) {
            const { data } = await supabase.from('Hotel').select('id, images, amenities, description').in('id', matchedIds);
            if (data) dbHotels = data;
          }

          ratehawkResults = combinados.map((h) => {
            const dbInfo = dbHotels.find(dbH => dbH.id === String(h.id));
            let imagensOficiais = dbInfo?.images || h.images || [];

            // SOLUÇÃO DAS COORDENADAS: Força o uso do offset para evitar sobreposição dos pinos no mapa
            const latOffset = (Math.random() - 0.5) * 0.015;
            const lngOffset = (Math.random() - 0.5) * 0.015;
            const finalLat = h.latitude ? h.latitude : (cityLat + latOffset);
            const finalLng = h.longitude ? h.longitude : (cityLng + lngOffset);

            return {
              hotelId: `rh_${h.id}`, 
              nome: h.name || `Hotel RateHawk (${h.id})`, 
              categoria: h.star_rating || 4, 
              endereco: h.address || '',
              distancia: 'RateHawk',
              latitude: finalLat,
              longitude: finalLng,
              imagensReais: imagensOficiais,
              ofertas: h.rates.map(r => {
                const exactCancellation = r.payment_options?.payment_types?.[0]?.cancellation_penalties?.free_cancellation_before;
                return {
                  tipoQuarto: formatRoomName(r),
                  codigoRegime: r.meal === 'breakfast' ? 'BB' : 'RO',
                  nomeRegime: r.meal_data?.value || 'Sem refeições', 
                  precoVenda: parseFloat(r.payment_options?.payment_types?.[0]?.amount || r.daily_prices?.[0] || 0) * 5.1,
                  freeCancellation: exactCancellation != null,
                  cancellationDeadline: formatCancellation(exactCancellation)
                };
              }).sort((a, b) => a.precoVenda - b.precoVenda) 
            };
          });
        }
      }
    } catch (err) {
      console.error("Aviso: Falha na busca RateHawk:", err);
    }

    if (ratehawkResults.length > 0) {
      setResults(ratehawkResults);
    } else {
      setError("Nenhum hotel encontrado para esta data e destino.");
    }
    setLoading(false);
  };

  const filteredResults = results.filter(hotel => {
    if (filterHotelName && !hotel.nome.toLowerCase().includes(filterHotelName.toLowerCase())) return false;
    if (stars.length > 0 && !stars.includes(hotel.categoria)) return false;
    const validOffers = hotel.ofertas.filter(oferta => {
      const mealMatch = meals.length === 0 || meals.includes(oferta.codigoRegime);
      const cancelMatch = !freeCancellation || oferta.freeCancellation;
      return mealMatch && cancelMatch;
    });
    return validOffers.length > 0;
  }).sort((a, b) => {
    const minPriceA = Math.min(...a.ofertas.map(o => o.precoVenda));
    const minPriceB = Math.min(...b.ofertas.map(o => o.precoVenda));
    return minPriceA - minPriceB; 
  });

  const hoteisExibidosNaLista = filteredResults.filter(hotel => {
    if (searchOnMapMove && mapBounds && hotel.latitude && hotel.longitude) {
      return hotel.latitude <= mapBounds.north && hotel.latitude >= mapBounds.south &&
             hotel.longitude <= mapBounds.east && hotel.longitude >= mapBounds.west;
    }
    return true;
  });

  // Geração do HTML do Mapa
  const buildMapHtml = () => {
    const centerLat = mapCenterLatLon ? mapCenterLatLon.split(',')[0] : -23.5505;
    const centerLng = mapCenterLatLon ? mapCenterLatLon.split(',')[1] : -46.6333;
    
    const pinsData = filteredResults.filter(h => h.latitude && h.longitude).map(h => {
      const img = getSafeImageUrl(h.imagensReais) || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=='; 
      const precoMin = Math.min(...h.ofertas.map(o => o.precoVenda));

      return {
        id: h.hotelId, lat: h.latitude, lng: h.longitude,
        nome: h.nome.replace(/'/g, "\\'").replace(/"/g, '&quot;'),
        preco: `BRL ${precoMin.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 
        estrelas: '⭐'.repeat(h.categoria || 4), imagem: img
      };
    });

    // Lógica auto-bounds (Enquadra todos os pinos ao inicializar o mapa)
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
          .leaflet-popup-tip-container { display: none; }
          .leaflet-popup-content-wrapper { padding: 0; margin: 0; border-radius: 12px; overflow: hidden; }
          .leaflet-popup-content { margin: 0; width: 220px !important; }
          .map-card { display: flex; flex-direction: column; background: white; }
          .map-card-img { width: 100%; height: 130px; object-fit: cover; }
          .map-card-info { padding: 12px; }
          .map-card-stars { font-size: 10px; color: #fbbf24; margin-bottom: 4px; }
          .map-card-title { font-size: 14px; font-weight: bold; color: #111; margin: 0 0 6px 0; }
          .map-card-price { font-size: 16px; font-weight: 900; color: #00a698; margin: 0; }
          .map-card-btn { margin-top: 8px; width: 100%; background: #ffc107; color: #111; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer;}
          .price-pin { background-color: white; border: 1px solid #ccc; border-radius: 8px; padding: 5px 10px; font-weight: 800; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); text-align: center; white-space: nowrap; position: relative; cursor: pointer; }
          .price-pin:hover { background-color: #00a698; color: white; border-color: #00a698; z-index: 9999 !important; }
          .price-pin::after { content: ''; position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); border-width: 5px 5px 0; border-style: solid; border-color: white transparent transparent transparent; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const center = [${centerLat}, ${centerLng}];
          const hotels = ${JSON.stringify(pinsData)};
          const map = L.map('map');
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

          if (hotels.length > 0) {
            const bounds = L.latLngBounds(hotels.map(h => [h.lat, h.lng]));
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
          } else {
            map.setView(center, 14);
          }

          map.on('moveend', function() {
            const bounds = map.getBounds();
            window.parent.postMessage({
              type: 'MAP_MOVED', bounds: { north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() }
            }, '*');
          });

          hotels.forEach(hotel => {
            const customIcon = L.divIcon({ className: 'custom-pin', html: '<div class="price-pin">' + hotel.preco + '</div>', iconSize: [130, 36], iconAnchor: [65, 36], popupAnchor: [0, -38] });
            const popupContent = '<div class="map-card"><img src="' + hotel.imagem + '" class="map-card-img" /><div class="map-card-info"><div class="map-card-stars">' + hotel.estrelas + '</div><h4 class="map-card-title">' + hotel.nome + '</h4><p class="map-card-price">' + hotel.preco + '</p><button class="map-card-btn" onclick="window.parent.postMessage({type: \\'SELECT_HOTEL\\', hotelId: \\'' + hotel.id + '\\'}, \\'*\\')">Detalhes do Hotel</button></div></div>';
            const marker = L.marker([hotel.lat, hotel.lng], { icon: customIcon }).addTo(map);
            marker.bindPopup(popupContent);
            marker.on('mouseover', function (e) { this.openPopup(); });
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="w-full bg-gray-50 font-sans min-h-screen pb-10">
      
      {/* Top Nav Minimalista */}
      <div className="w-full bg-white border-b border-gray-200 py-3 px-4 shadow-sm mb-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span className="cursor-pointer hover:text-orange-500 transition">Página principal</span>
            <span>›</span>
            <span className="font-bold text-gray-900 cursor-pointer">{destinationQuery ? destinationQuery.split(',')[0] : 'Destino'}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-3 mb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-visible relative z-40">
          
          <div className="flex overflow-x-auto bg-white border-b border-gray-200 rounded-t-xl">
            <button className="flex items-center gap-2 px-6 py-4 bg-[#333333] text-white text-sm font-bold whitespace-nowrap rounded-tl-xl">
              <span>🏨</span> Hotéis e apartamentos
            </button>
          </div>

          <div className="p-5 md:p-6 bg-orange-500 rounded-b-xl">
            <form onSubmit={handleSearch}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                
                <div className="col-span-1 lg:col-span-4 relative bg-white border border-gray-300 rounded-md hover:border-gray-400 transition" ref={dropdownRef}>
                  <label className="block text-[10px] text-gray-400 uppercase pt-1.5 px-3">Destino</label>
                  <div className="flex items-center px-3 pb-1.5">
                    <input 
                      type="text" value={destinationQuery} 
                      onChange={(e) => { setDestinationQuery(e.target.value); setRegionId(''); }}
                      onFocus={() => { if (regionsResults.length > 0 || hotelsResults.length > 0) setShowDropdown(true); }}
                      className="flex-1 outline-none text-sm text-gray-900 font-medium bg-transparent w-full" 
                      placeholder="Cidade, região ou hotel" 
                    />
                  </div>

                  {showDropdown && (regionsResults.length > 0 || hotelsResults.length > 0) && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-72 overflow-y-auto z-50">
                      {regionsResults.map((item, idx) => (
                        <div 
                          key={`reg-${idx}`} 
                          onClick={() => { setDestinationQuery(item.cleanQuery || item.name.split(',')[0]); setRegionId(item.id); setShowDropdown(false); }} 
                          className="px-4 py-3 text-sm text-gray-800 hover:bg-orange-50 cursor-pointer border-b border-gray-100 flex justify-between items-center"
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-[10px] text-gray-500 uppercase">{item.label || 'Região'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-span-1 lg:col-span-4 flex bg-white border border-gray-300 rounded-md hover:border-gray-400 transition relative overflow-hidden">
                  <div className="flex-1 px-3 flex flex-col justify-center relative cursor-pointer group hover:bg-gray-50 transition" onClick={() => checkInRef.current && checkInRef.current.showPicker()}>
                    <label className="block text-[10px] text-gray-400 uppercase pt-1 cursor-pointer">Check-in</label>
                    <div className="text-sm text-gray-900 font-bold pb-1 truncate cursor-pointer">
                      {checkInDate ? formatarDataExibicao(checkInDate) : <span className="text-gray-300 font-normal">Adicionar data</span>}
                    </div>
                    <input type="date" ref={checkInRef} min={getTodayStr()} value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="absolute bottom-0 left-0 w-full h-0 opacity-0 pointer-events-none" />
                  </div>

                  <div className="w-[1px] bg-gray-300 my-2"></div>

                  <div className="flex-1 px-3 flex flex-col justify-center relative cursor-pointer group hover:bg-gray-50 transition" onClick={() => checkOutRef.current && checkOutRef.current.showPicker()}>
                    <label className="block text-[10px] text-gray-400 uppercase pt-1 cursor-pointer">Check-out</label>
                    <div className="text-sm text-gray-900 font-bold pb-1 truncate cursor-pointer">
                      {checkOutDate ? formatarDataExibicao(checkOutDate) : <span className="text-gray-300 font-normal">Adicionar data</span>}
                    </div>
                    <input type="date" ref={checkOutRef} min={checkInDate || getTomorrowStr()} value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="absolute bottom-0 left-0 w-full h-0 opacity-0 pointer-events-none" />
                  </div>
                </div>

                <div className="col-span-1 lg:col-span-2 relative bg-white border border-gray-300 rounded-md px-3 py-1.5 cursor-pointer hover:border-gray-400 transition flex flex-col justify-center" ref={guestDropdownRef} onClick={() => setShowGuestDropdown(!showGuestDropdown)}>
                  <span className="block text-[10px] text-gray-400 uppercase">{rooms.length} quarto{rooms.length > 1 ? 's' : ''} para</span>
                  <div className="text-sm text-gray-900 font-medium flex justify-between items-center">
                    <span>{totalGuests} hóspedes</span>
                    <span className="text-gray-400 text-xs">▼</span>
                  </div>

                  {showGuestDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-[340px] md:w-[380px] bg-white border border-gray-200 rounded-lg shadow-2xl p-5 z-[100]" onClick={(e) => e.stopPropagation()}>
                      <div className="max-h-[360px] overflow-y-auto pr-2 scrollbar-thin">
                        {rooms.map((room, roomIndex) => (
                          <div key={roomIndex} className="mb-5 pb-5 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-bold text-gray-900 text-base">Quarto {roomIndex + 1}</h4>
                              {roomIndex > 0 && <button type="button" onClick={() => removeRoom(roomIndex)} className="text-sm text-red-500 hover:underline">Remover</button>}
                            </div>
                            <div className="flex gap-4">
                              <div className="flex flex-col items-start w-1/3 shrink-0">
                                <span className="text-xs text-gray-500 mb-1.5">Adultos</span>
                                <div className="flex items-center border border-gray-300 rounded overflow-hidden h-9">
                                  <button type="button" onClick={() => updateAdults(roomIndex, -1)} disabled={room.adults <= 1} className="w-8 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition">−</button>
                                  <span className="w-6 text-center text-sm font-medium text-gray-800">{room.adults}</span>
                                  <button type="button" onClick={() => updateAdults(roomIndex, 1)} disabled={room.adults >= 6} className="w-8 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition">+</button>
                                </div>
                              </div>
                              <div className="flex flex-col items-start flex-1">
                                <span className="text-xs text-gray-500 mb-1.5">Crianças</span>
                                <div className="flex flex-wrap gap-2">
                                  {room.childrenAges.map((age, childIndex) => (
                                    <div key={childIndex} className="flex items-center border border-gray-300 rounded h-9 bg-white overflow-hidden shadow-sm">
                                      <select value={age} onChange={(e) => updateChildAge(roomIndex, childIndex, e.target.value)} className="pl-2 pr-1 h-full text-sm text-gray-800 outline-none bg-transparent cursor-pointer appearance-none">
                                        {[...Array(18).keys()].map(n => <option key={n} value={n}>{n === 0 ? '0 ano' : `${n} ano${n !== 1 ? 's' : ''}`}</option>)}
                                      </select>
                                      <button type="button" onClick={() => removeChild(roomIndex, childIndex)} className="px-2 h-full flex items-center justify-center border-l border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-red-500 transition font-bold">✕</button>
                                    </div>
                                  ))}
                                  {room.childrenAges.length < 4 && (
                                    <button type="button" onClick={() => addChild(roomIndex)} className={`border border-gray-300 rounded h-9 text-gray-700 hover:bg-gray-50 transition text-sm font-medium ${room.childrenAges.length === 0 ? 'px-4' : 'w-9 flex items-center justify-center'}`}>
                                      {room.childrenAges.length === 0 ? 'Adicionar uma criança' : '+'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 mt-2 border-t border-gray-100 flex flex-col gap-4">
                        {rooms.length < 9 && <button type="button" onClick={addRoom} className="text-sm text-blue-600 hover:text-blue-800 font-medium text-left">Adicionar um quarto</button>}
                        <button type="button" onClick={() => setShowGuestDropdown(false)} className="w-full bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-bold py-2.5 rounded shadow-sm transition text-sm">Concluído</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-1 lg:col-span-2">
                  <button type="submit" disabled={loading} className="w-full h-full bg-[#333333] hover:bg-black text-white font-medium rounded-md shadow-sm text-sm transition">
                    {loading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Main Layout - 3 Columns */}
      <div className="max-w-[1400px] mx-auto px-3 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* BARRA LATERAL ESQUERDA - Filtros Padrão ETG */}
          <div className="lg:col-span-3 space-y-5 hidden lg:block sticky top-4 max-h-screen overflow-y-auto pr-2 scrollbar-thin">
            
            {/* Bloco 1: Nome do Hotel */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <label className="block text-sm font-black text-gray-900 mb-3">Nome do hotel</label>
              <input type="text" placeholder="Buscar na lista" value={filterHotelName} onChange={(e) => setFilterHotelName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-orange-500 transition bg-gray-50"/>
            </div>

            {/* Bloco 2: Nacionalidade / Cidadania */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <label className="block text-sm font-black text-gray-900 mb-3">Cidadania</label>
              <div className="border border-gray-300 rounded-lg bg-gray-50 px-3 py-2 cursor-pointer hover:border-gray-400 transition">
                <select value={residency} onChange={(e) => setResidency(e.target.value)} className="text-sm text-gray-900 font-medium outline-none bg-transparent w-full cursor-pointer">
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Bloco 3: Pagamento e Reserva */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <h3 className="block text-sm font-black text-gray-900 mb-3">Pagamento e reserva</h3>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${freeCancellation ? 'bg-[#ffc107] border-[#ffc107]' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                  {freeCancellation && <Check size={14} className="text-gray-900 font-bold" />}
                </div>
                <span className="text-sm font-medium text-gray-700 select-none">Cancelamento grátis</span>
                <input type="checkbox" checked={freeCancellation} onChange={(e) => setFreeCancellation(e.target.checked)} className="hidden" />
              </label>
            </div>

            {/* Bloco 4: Estrelas */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <h3 className="block text-sm font-black text-gray-900 mb-3">Classificação</h3>
              <div className="flex flex-col gap-2.5">
                {[5, 4, 3, 2].map(star => (
                  <label key={star} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${stars.includes(star) ? 'bg-[#ffc107] border-[#ffc107]' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                      {stars.includes(star) && <Check size={14} className="text-gray-900 font-bold" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      {'⭐'.repeat(star)} 
                    </span>
                    <input type="checkbox" checked={stars.includes(star)} onChange={() => toggleStar(star)} className="hidden" />
                  </label>
                ))}
                <label className="flex items-center gap-3 cursor-pointer group mt-1">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${stars.includes(0) ? 'bg-[#ffc107] border-[#ffc107]' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                    {stars.includes(0) && <Check size={14} className="text-gray-900 font-bold" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Sem classificação</span>
                  <input type="checkbox" checked={stars.includes(0)} onChange={() => toggleStar(0)} className="hidden" />
                </label>
              </div>
            </div>

            {/* Bloco 5: Refeições */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <h3 className="block text-sm font-black text-gray-900 mb-3">Refeições</h3>
              <div className="flex flex-col gap-2.5">
                {[
                  { id: 'RO', label: 'Sem refeições incluídas' },
                  { id: 'BB', label: 'Pequeno-almoço incluído' },
                  { id: 'HB', label: 'Meia Pensão' },
                  { id: 'FB', label: 'Pensão Completa' },
                  { id: 'AI', label: 'Tudo incluído' }
                ].map(meal => (
                  <label key={meal.id} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${meals.includes(meal.id) ? 'bg-[#ffc107] border-[#ffc107]' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                      {meals.includes(meal.id) && <Check size={14} className="text-gray-900 font-bold" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{meal.label}</span>
                    <input type="checkbox" checked={meals.includes(meal.id)} onChange={() => toggleMeal(meal.id)} className="hidden" />
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* LISTA DE HOTÉIS - Centro */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-black text-gray-900 leading-tight">
                {destinationQuery ? destinationQuery.split(',')[0] : 'Destino'}: {hoteisExibidosNaLista.length} opções
              </h2>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-bold border border-red-200 shadow-sm">{error}</div>}

            {/* CARDS COM UMA ÚNICA OFERTA (A MAIS BARATA) E LAYOUT HORIZONTAL ESTRITO */}
            {hoteisExibidosNaLista.map((hotel, index) => {
              const cardBg = getSafeImageUrl(hotel.imagensReais);
              const isFavorite = favorites.some(fav => fav._id === String(hotel.hotelId) && fav.type === 'hotel');
              const cheapestOffer = hotel.ofertas[0]; 
              
              const guestsText = `para ${nightsCount} noite${nightsCount > 1 ? 's' : ''} para ${totalAdults} adulto${totalAdults > 1 ? 's' : ''}${totalChildren > 0 ? ` e ${totalChildren} criança${totalChildren > 1 ? 's' : ''}` : ''}`;

              const handleToggleFavorite = (e) => {
                e.stopPropagation(); e.preventDefault();
                toggleFavorite({
                    _id: String(hotel.hotelId), type: 'hotel', name: hotel.nome,
                    price: cheapestOffer?.precoVenda || 0, image: cardBg,
                    originalHotelData: hotel, checkInDate, checkOutDate, rooms, residency
                });
              };

              return (
                <div 
                  key={index} 
                  onMouseEnter={() => { if(hotel.latitude && hotel.longitude) setMapCenterLatLon(`${hotel.latitude},${hotel.longitude}`); }}
                  className="flex flex-col md:flex-row bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden"
                >
                  {/* FACHADA DO HOTEL */}
                  <div 
                    onClick={() => setActiveGalleryHotel(hotel)} 
                    className="relative w-full md:w-[260px] h-[220px] md:h-auto bg-gray-100 shrink-0 cursor-pointer group border-b md:border-b-0 md:border-r border-gray-200"
                  >
                    <button onClick={handleToggleFavorite} className="absolute top-3 left-3 z-20 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform">
                      <Heart size={18} className={isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"} />
                    </button>
                    {cardBg ? (
                      <img src={cardBg} alt={hotel.nome} className="w-full h-full object-cover group-hover:opacity-90 transition duration-300" />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                        <span className="text-3xl mb-1">🏨</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Sem Imagem</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1 hover:bg-black/80 transition">
                      <span>⟨</span> 1 / {parseImagesList(hotel.imagensReais).length || 1} <span>⟩</span>
                    </div>
                  </div>

                  {/* INFO DO HOTEL & OFERTA PRINCIPAL */}
                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="text-amber-400 text-xs">{'⭐'.repeat(hotel.categoria || 4)}</div>
                        <div className="bg-green-600 text-white font-black text-sm px-2.5 py-1 rounded shadow-sm">8,6</div>
                      </div>
                      
                      <h3 
                        onClick={() => navigate('/hotel-details', { state: { hotel, checkInDate, checkOutDate, rooms, residency } })}
                        className="font-bold text-blue-600 text-lg leading-tight hover:underline cursor-pointer"
                      >
                        {hotel.nome}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 truncate">{hotel.endereco || hotel.distancia}</p>
                      
                      {/* RESUMO DO QUARTO MAIS BARATO */}
                      {cheapestOffer && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                           <p className="text-sm font-bold text-gray-800">{cheapestOffer.tipoQuarto}</p>
                           <p className="text-[10px] text-gray-500 uppercase mt-0.5">Opção mais econômica para {totalGuests} hóspedes</p>
                           
                           <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-medium text-gray-700">
                              <span className="flex items-center gap-1">🍽️ {cheapestOffer.nomeRegime}</span>
                              {cheapestOffer.freeCancellation ? (
                                <span className="flex items-center gap-1 text-green-700">↩️ {cheapestOffer.cancellationDeadline || 'Cancelamento especial'}</span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600">❌ Não reembolsável</span>
                              )}
                           </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-col sm:flex-row justify-between items-end border-t border-gray-100 pt-4 gap-3 sm:gap-0">
                      <div className="w-full sm:w-auto text-right sm:text-left flex-1">
                         <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">A partir de</p>
                         <p className="text-2xl font-black text-gray-900 leading-none">BRL {cheapestOffer?.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                      </div>
                      
                      <button 
                        onClick={() => navigate('/hotel-details', { state: { hotel, checkInDate, checkOutDate, rooms, residency } })}
                        className="w-full sm:w-auto bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-bold py-2.5 px-6 rounded-lg shadow-sm text-xs uppercase tracking-wider transition"
                      >
                        Mostrar todos os quartos
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* MAPA STICKY - Lado Direito */}
          <div className="lg:col-span-4 sticky top-4 h-[calc(100vh-40px)] bg-gray-100 rounded-xl border border-gray-300 overflow-hidden shadow-inner hidden lg:flex flex-col">
            <div className="bg-white p-3 border-b border-gray-200 flex justify-between items-center z-10 shadow-sm relative">
              <button onClick={() => setIsMapExpanded(true)} className="bg-white border border-gray-300 text-xs font-bold px-4 py-2 rounded shadow hover:bg-gray-50 transition flex items-center gap-1 text-gray-700">
                <span>⛶</span> Ampliar o mapa
              </button>
              <label className="flex items-center gap-2 cursor-pointer ml-3 bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-100 transition">
                <input type="checkbox" checked={searchOnMapMove} onChange={(e) => setSearchOnMapMove(e.target.checked)} className="accent-[#ffc107] w-4 h-4 cursor-pointer" />
                <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap uppercase">Pesquisar movendo o mapa</span>
              </label>
            </div>

            <div className="flex-1 w-full relative">
              {filteredResults.length > 0 ? (
                <iframe title="Mapa de Localização com Preços" width="100%" height="100%" style={{ border: 0 }} srcDoc={buildMapHtml()}></iframe>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm font-medium">Faça uma busca para ver os hotéis no mapa</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* GALERIA GERAL DE FOTOS */}
      {activeGalleryHotel && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl p-6 rounded-2xl relative shadow-2xl">
            <button onClick={() => setActiveGalleryHotel(null)} className="absolute top-4 right-4 text-xl font-bold text-gray-500 hover:text-black">✕</button>
            <h3 className="font-black text-lg mb-4 text-gray-900">Galeria Oficial: {activeGalleryHotel.nome}</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
              {activeGalleryHotel.imagensReais && activeGalleryHotel.imagensReais.length > 0 ? (
                parseImagesList(activeGalleryHotel.imagensReais).map((imgUrl, i) => (
                  <img key={i} src={imgUrl} className="rounded-lg h-32 w-full object-cover shadow-sm border border-gray-100" alt={`Hotel API ${i}`} />
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-500 text-xs font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Nenhuma imagem estática cadastrada no banco de dados para este hotel.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setActiveGalleryHotel(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-bold text-sm transition">
                Fechar
              </button>
              <button 
                onClick={() => { 
                  const h = activeGalleryHotel;
                  setActiveGalleryHotel(null); 
                  navigate('/hotel-details', { state: { hotel: h, checkInDate, checkOutDate, rooms, residency } }); 
                }} 
                className="flex-1 bg-[#ffc107] hover:bg-yellow-500 text-gray-900 py-3 rounded-xl font-black text-sm transition shadow-md"
              >
                Ver Página Completa do Hotel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MAPA EXPANDIDO TELA CHEIA */}
      {isMapExpanded && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999999] bg-white flex flex-col">
          <div className="p-4 bg-gray-900 flex justify-between items-center shadow-md">
            <h2 className="font-black text-white text-lg">Mapa de Acomodações</h2>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-700 transition">
                <input type="checkbox" checked={searchOnMapMove} onChange={(e) => setSearchOnMapMove(e.target.checked)} className="accent-[#ffc107] w-4 h-4" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">Pesquisar movendo o mapa</span>
              </label>
              <button onClick={() => setIsMapExpanded(false)} className="bg-[#ffc107] hover:bg-yellow-500 text-gray-900 px-6 py-2 rounded-lg font-black text-sm uppercase tracking-wide transition shadow-lg">
                Fechar Mapa
              </button>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            <iframe title="Mapa Expandido" width="100%" height="100%" style={{ border: 0 }} srcDoc={buildMapHtml()}></iframe>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}