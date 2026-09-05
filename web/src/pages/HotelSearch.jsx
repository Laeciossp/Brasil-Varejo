import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase'; 
import { createClient } from '@supabase/supabase-js';
import { Heart } from 'lucide-react';
import useCartStore from '../store/useCartStore';

// INTEGRAÇÃO SUPABASE: Conexão direta com seu banco para buscar as imagens do catálogo
const SUPABASE_URL = "https://vcqiilytjrrurdbscmio.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_leFg1lWGZlctiU3CXYR2Gw_FpOG2qR3"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COUNTRIES = [
  { code: 'br', name: 'Brasil' }, { code: 'aw', name: 'Aruba' }, { code: 'af', name: 'Afeganistão' },
  { code: 'ao', name: 'Angola' }, { code: 'ai', name: 'Anguilla' }, { code: 'ax', name: 'Ilhas Alanda' },
  { code: 'al', name: 'Albânia' }, { code: 'ad', name: 'Andorra' }, { code: 'ae', name: 'Emirados Árabes Unidos' },
  { code: 'ar', name: 'Argentina' }, { code: 'am', name: 'Arménia' }, { code: 'as', name: 'Samoa Americana' },
  { code: 'aq', name: 'Antártida' }, { code: 'tf', name: 'Territórios Franceses do Sul' }, { code: 'ag', name: 'Antígua e Barbuda' },
  { code: 'au', name: 'Austrália' }, { code: 'at', name: 'Áustria' }, { code: 'az', name: 'Azerbaijão' },
  { code: 'bi', name: 'Burundi' }, { code: 'be', name: 'Bélgica' }, { code: 'bj', name: 'Benim' },
  { code: 'bq', name: 'Bonaire, Santo Eustáquio e Saba' }, { code: 'bf', name: 'Burkina Faso' }, { code: 'bd', name: 'Bangladeche' },
  { code: 'bg', name: 'Bulgária' }, { code: 'bh', name: 'Barém' }, { code: 'bs', name: 'Bahamas' },
  { code: 'ba', name: 'Bósnia e Herzegovina' }, { code: 'bl', name: 'Saint Barthélemy' }, { code: 'by', name: 'Bielorússia' },
  { code: 'bz', name: 'Belize' }, { code: 'bm', name: 'Bermudas' }, { code: 'bo', name: 'Bolívia' },
  { code: 'bb', name: 'Barbados' }, { code: 'bn', name: 'Brunei' }, { code: 'bt', name: 'Butão' },
  { code: 'bv', name: 'Ilha Bouvet' }, { code: 'bw', name: 'Botsuana' }, { code: 'cf', name: 'República Centro-Africana' },
  { code: 'ca', name: 'Canadá' }, { code: 'cc', name: 'Ilhas Cocos' }, { code: 'ch', name: 'Suíça' },
  { code: 'cl', name: 'Chile' }, { code: 'cn', name: 'China' }, { code: 'ci', name: 'Costa do Marfim' },
  { code: 'cm', name: 'Camarões' }, { code: 'cd', name: 'Congo, República Democrática do' }, { code: 'cg', name: 'Congo' },
  { code: 'ck', name: 'Ilhas Cook' }, { code: 'co', name: 'Colômbia' }, { code: 'km', name: 'Comores' },
  { code: 'cv', name: 'Cabo Verde' }, { code: 'cr', name: 'Costa Rica' }, { code: 'cu', name: 'Cuba' },
  { code: 'cw', name: 'Curação' }, { code: 'cx', name: 'Ilha Natal' }, { code: 'ky', name: 'Ilhas Caimão' },
  { code: 'cy', name: 'Chipre' }, { code: 'cz', name: 'Chéquia' }, { code: 'de', name: 'Alemanha' },
  { code: 'dj', name: 'Djibouti' }, { code: 'dm', name: 'Dominica' }, { code: 'dk', name: 'Dinamarca' },
  { code: 'do', name: 'República Dominicana' }, { code: 'dz', name: 'Argélia' }, { code: 'ec', name: 'Equador' },
  { code: 'eg', name: 'Egito' }, { code: 'er', name: 'Eritreia' }, { code: 'eh', name: 'Saara Ocidental' },
  { code: 'es', name: 'Espanha' }, { code: 'ee', name: 'Estónia' }, { code: 'et', name: 'Etiópia' },
  { code: 'fi', name: 'Finlândia' }, { code: 'fj', name: 'Fiji' }, { code: 'fk', name: 'Ilhas Falkland (Malvinas)' },
  { code: 'fr', name: 'França' }, { code: 'fo', name: 'Ilhas Faroé' }, { code: 'fm', name: 'Micronésia, Estados Federados da' },
  { code: 'ga', name: 'Gabão' }, { code: 'gb', name: 'Reino Unido' }, { code: 'ge', name: 'Geórgia' },
  { code: 'gg', name: 'Guernsey' }, { code: 'gh', name: 'Gana' }, { code: 'gi', name: 'Gibraltar' },
  { code: 'gn', name: 'Guiné' }, { code: 'gp', name: 'Guadalupe' }, { code: 'gm', name: 'Gâmbia' },
  { code: 'gw', name: 'Guiné-Bissáu' }, { code: 'gq', name: 'Guiné Equatorial' }, { code: 'gr', name: 'Grécia' },
  { code: 'gd', name: 'Granada' }, { code: 'gl', name: 'Gronelândia' }, { code: 'gt', name: 'Guatemala' },
  { code: 'gf', name: 'Guiana Francesa' }, { code: 'gu', name: 'Guam' }, { code: 'gy', name: 'Guiana' },
  { code: 'hk', name: 'Hong Kong' }, { code: 'hm', name: 'Ilha Heard e Ilhas McDonald' }, { code: 'hn', name: 'Honduras' },
  { code: 'hr', name: 'Croácia' }, { code: 'ht', name: 'Haiti' }, { code: 'hu', name: 'Hungria' },
  { code: 'id', name: 'Indonésia' }, { code: 'im', name: 'Ilha de Man' }, { code: 'in', name: 'Índia' },
  { code: 'io', name: 'Território Britânico do Oceano Índico' }, { code: 'ie', name: 'Irlanda' }, { code: 'ir', name: 'Irão' },
  { code: 'iq', name: 'Iraque' }, { code: 'is', name: 'Islândia' }, { code: 'il', name: 'Israel' },
  { code: 'it', name: 'Itália' }, { code: 'jm', name: 'Jamaica' }, { code: 'je', name: 'Jersey' },
  { code: 'jo', name: 'Jordânia' }, { code: 'jp', name: 'Japão' }, { code: 'kz', name: 'Cazaquistão' },
  { code: 'ke', name: 'Quénia' }, { code: 'kg', name: 'Quirguistão' }, { code: 'kh', name: 'Camboja' },
  { code: 'ki', name: 'Kiribati' }, { code: 'kn', name: 'São Cristóvão e Nevis' }, { code: 'kr', name: 'Coreia do Sul' },
  { code: 'kw', name: 'Kuwait' }, { code: 'la', name: 'Laos' }, { code: 'lb', name: 'Líbano' },
  { code: 'lr', name: 'Libéria' }, { code: 'ly', name: 'Líbia' }, { code: 'lc', name: 'Santa Lúcia' },
  { code: 'li', name: 'Liechtenstein' }, { code: 'lk', name: 'Sri Lanka' }, { code: 'ls', name: 'Lesoto' },
  { code: 'lt', name: 'Lituânia' }, { code: 'lu', name: 'Luxemburgo' }, { code: 'lv', name: 'Letónia' },
  { code: 'mo', name: 'Macau' }, { code: 'mf', name: 'São Martin (Território Francês)' }, { code: 'ma', name: 'Marrocos' },
  { code: 'mc', name: 'Mónaco' }, { code: 'md', name: 'Moldávia, República da' }, { code: 'mg', name: 'Madagáscar' },
  { code: 'mv', name: 'Maldivas' }, { code: 'mx', name: 'México' }, { code: 'mh', name: 'Ilhas Marshall' },
  { code: 'mk', name: 'Macedónia do Norte' }, { code: 'ml', name: 'Mali' }, { code: 'mt', name: 'Malta' },
  { code: 'mm', name: 'Birmânia' }, { code: 'me', name: 'Montenegro' }, { code: 'mn', name: 'Mongólia' },
  { code: 'mp', name: 'Ilhas Marianas do Norte' }, { code: 'mz', name: 'Moçambique' }, { code: 'mr', name: 'Mauritânia' },
  { code: 'ms', name: 'Monserrate' }, { code: 'mq', name: 'Martinica' }, { code: 'mu', name: 'Maurícia' },
  { code: 'mw', name: 'Malawi' }, { code: 'my', name: 'Malásia' }, { code: 'yt', name: 'Mayotte' },
  { code: 'na', name: 'Namíbia' }, { code: 'nc', name: 'Nova Caledónia' }, { code: 'ne', name: 'Níger' },
  { code: 'nf', name: 'Ilha Norfolk' }, { code: 'ng', name: 'Nigéria' }, { code: 'ni', name: 'Nicarágua' },
  { code: 'nu', name: 'Niue' }, { code: 'nl', name: 'Países Baixos' }, { code: 'no', name: 'Noruega' },
  { code: 'np', name: 'Nepal' }, { code: 'nr', name: 'Nauru' }, { code: 'nz', name: 'Nova Zelândia' },
  { code: 'om', name: 'Omã' }, { code: 'pk', name: 'Paquistão' }, { code: 'pa', name: 'Panamá' },
  { code: 'pn', name: 'Pitcairn' }, { code: 'pe', name: 'Peru' }, { code: 'ph', name: 'Filipinas' },
  { code: 'pw', name: 'Palau' }, { code: 'pg', name: 'Papua Nova Guiné' }, { code: 'pl', name: 'Polónia' },
  { code: 'pr', name: 'Porto Rico' }, { code: 'kp', name: 'Coreia do Norte' }, { code: 'pt', name: 'Portugal' },
  { code: 'py', name: 'Paraguai' }, { code: 'ps', name: 'Palestina, Estado da' }, { code: 'pf', name: 'Polinésia Francesa' },
  { code: 'qa', name: 'Catar' }, { code: 're', name: 'Ilha Reunião' }, { code: 'ro', name: 'Roménia' },
  { code: 'ru', name: 'Federação Russa' }, { code: 'rw', name: 'Ruanda' }, { code: 'sa', name: 'Arábia Saudita' },
  { code: 'sd', name: 'Sudão' }, { code: 'sn', name: 'Senegal' }, { code: 'sg', name: 'Singapura' },
  { code: 'gs', name: 'Ilhas Geórgia do Sul e Sandwich do Sul' }, { code: 'sh', name: 'Santa Helena' },
  { code: 'sj', name: 'Svalbard e Jan Mayen' }, { code: 'sb', name: 'Ilhas Salomão' }, { code: 'sl', name: 'Serra Leoa' },
  { code: 'sv', name: 'El Salvador' }, { code: 'sm', name: 'San Marino' }, { code: 'so', name: 'Somália' },
  { code: 'pm', name: 'Saint Pierre e Miquelon' }, { code: 'rs', name: 'Sérvia' }, { code: 'ss', name: 'Sudão do Sul' },
  { code: 'st', name: 'São Tomé e Príncipe' }, { code: 'sr', name: 'Suriname' }, { code: 'sk', name: 'Eslováquia' },
  { code: 'si', name: 'Eslovénia' }, { code: 'se', name: 'Suécia' }, { code: 'sz', name: 'Suazilândia' },
  { code: 'sx', name: 'São Martinho (Países Baixos)' }, { code: 'sc', name: 'Seychelles' }, { code: 'sy', name: 'Síria' },
  { code: 'tc', name: 'Ilhas Turcas e Caicos' }, { code: 'td', name: 'Chade' }, { code: 'tg', name: 'Togo' },
  { code: 'th', name: 'Tailândia' }, { code: 'tj', name: 'Tajiquistão' }, { code: 'tk', name: 'Tokelau' },
  { code: 'tm', name: 'Turquemenistão' }, { code: 'tl', name: 'Timor-Leste' }, { code: 'to', name: 'Tonga' },
  { code: 'tt', name: 'Trindade e Tobago' }, { code: 'tn', name: 'Tunísia' }, { code: 'tr', name: 'Turquia' },
  { code: 'tv', name: 'Tuvalu' }, { code: 'tw', name: 'Taiwan' }, { code: 'tz', name: 'Tanzânia' },
  { code: 'ug', name: 'Uganda' }, { code: 'ua', name: 'Ucrânia' }, { code: 'um', name: 'Ilhas Menores Distantes dos Estados Unidos' },
  { code: 'uy', name: 'Uruguai' }, { code: 'us', name: 'Estados Unidos' }, { code: 'uz', name: 'Uzbequistão' },
  { code: 'va', name: 'Vaticano' }, { code: 'vc', name: 'São Vicente e Granadinas' }, { code: 've', name: 'Venezuela' },
  { code: 'vg', name: 'Ilhas Virgens Britânicas' }, { code: 'vi', name: 'Ilhas Virgens dos Estados Unidos' },
  { code: 'vn', name: 'Vietname' }, { code: 'vu', name: 'Vanuatu' }, { code: 'wf', name: 'Wallis e Futuna' },
  { code: 'ws', name: 'Samoa' }, { code: 'ye', name: 'Iémen' }, { code: 'za', name: 'África do Sul' },
  { code: 'zm', name: 'Zâmbia' }, { code: 'zw', name: 'Zimbábue' }, { code: 'xk', name: 'Kosovo' }
];

export default function HotelSearch() {
  const { favorites, toggleFavorite } = useCartStore(); // <--- ADICIONE ESTA LINHA AQUI
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
  const [earlyCheckin, setEarlyCheckin] = useState('');
  const [lateCheckout, setLateCheckout] = useState('');
  const [freeCancellation, setFreeCancellation] = useState(false);

  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState('popularidade');
  const [filterHotelName, setFilterHotelName] = useState('');

  const [selectedOffer, setSelectedOffer] = useState(null);
  const [bookingStep, setBookingStep] = useState('idle'); 
  const [bookingError, setBookingError] = useState(null);
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [finalPartnerOrderId, setFinalPartnerOrderId] = useState('');

  const [supplier, setSupplier] = useState('RATEHAWK');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeGalleryHotel, setActiveGalleryHotel] = useState(null);
  const [mapCenterLatLon, setMapCenterLatLon] = useState(null);

  const dropdownRef = useRef(null);
  const guestDropdownRef = useRef(null);
  const checkInRef = useRef(null);
  const checkOutRef = useRef(null);

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
          navigate('/hotel-details', { 
            state: { hotel: hotelSelecionado, checkInDate, checkOutDate, rooms, residency } 
          });
        }
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
        const regions = data.regions || data.data?.regions || [];
        const hotels = data.hotels || data.data?.hotels || [];
        setRegionsResults(regions); setHotelsResults(hotels);
        setShowDropdown(regions.length > 0 || hotels.length > 0);
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
    } catch (err) {
      console.error("Erro ao buscar coordenadas da cidade", err);
    }
    
    setMapCenterLatLon(`${cityLat},${cityLng}`);

    try {
      if (supplier === 'RATEHAWK') {
        const hidsToSearch = (targetDest === 'US-LAX' || destinationQuery.toLowerCase().includes('los angeles') || destinationQuery.toLowerCase().includes('conrad')) 
          ? [10004834, 8819557] : [10004834, 8819557, 9015534, 8663536];

        const baseUrl = `https://palastore-flights-api.laeciossp.workers.dev/hotel-page`; 
        
        const guestsPayload = rooms.map(room => ({
          adults: room.adults,
          children: room.childrenAges
        }));

        const requests = hidsToSearch.map(hid => 
          fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hid: hid,
              checkin: checkInDate,
              checkout: checkOutDate,
              residency: residency,
              currency: "USD",
              guests: guestsPayload
            })
          })
        );

        const responses = await Promise.all(requests);
        const jsonResults = await Promise.all(responses.map(r => r.json()));

        const combinados = [];
        jsonResults.forEach(resData => {
          if (resData.data && resData.data.hotels) combinados.push(...resData.data.hotels);
        });

        if (combinados.length > 0) {
          const matchedIds = combinados.map(h => String(h.id));
          
          let dbHotels = [];
          if (matchedIds.length > 0) {
            const { data, error } = await supabase
              .from('Hotel')
              .select('id, images, amenities')
              .in('id', matchedIds);
              
            if (!error && data) {
              dbHotels = data;
            }
          }

          const hoteisMapeados = combinados.map((h) => {
            const latOffset = (Math.random() - 0.5) * 0.015;
            const lngOffset = (Math.random() - 0.5) * 0.015;
            const finalLat = h.latitude || (cityLat + latOffset);
            const finalLng = h.longitude || (cityLng + lngOffset);
            
            const dbInfo = dbHotels.find(dbH => dbH.id === String(h.id));
            let imagensOficiais = [];
            if (dbInfo && dbInfo.images && dbInfo.images.length > 0) {
              imagensOficiais = dbInfo.images;
            }

            return {
              hotelId: h.id, 
              nome: h.name || `Hotel RateHawk Teste (${h.id})`, 
              categoria: h.star_rating || 4, 
              endereco: h.address || 'Localização central',
              distancia: 'A partir do centro',
              latitude: finalLat,
              longitude: finalLng,
              imagensReais: imagensOficiais,
              ofertas: h.rates.map(r => ({
                tipoQuarto: r.room_name || 'Quarto Standard', 
                codigoRegime: r.meal === 'breakfast' ? 'BB' : r.meal === 'half-board' ? 'HB' : r.meal === 'all-inclusive' ? 'AI' : 'RO',
                nomeRegime: r.meal_data?.value || 'Sem refeições', 
                precoVenda: parseFloat(r.payment_options?.payment_types?.[0]?.amount || r.daily_prices?.[0] || 0) * 5.1,
                paymentTypeObj: r.payment_options?.payment_types?.[0],
                bookHash: r.book_hash,
                freeCancellation: r.payment_options?.payment_types?.[0]?.cancellation_penalties?.free_cancellation_before != null
              }))
            };
          });
          setResults(hoteisMapeados);
        } else {
          setError(`Nenhuma tarifa disponível para esta combinação no fornecedor.`);
        }
      } else {
        const functions = getFunctions(app);
        const searchRestelHotels = httpsCallable(functions, 'searchRestelHotels');
        const response = await searchRestelHotels({
  destinationCode: destinationQuery.split(',')[0], // Manda a string "Salvador" limpa
  checkInDate, checkOutDate,
          adults: rooms[0].adults, children: rooms[0].childrenAges.length, childrenAges: rooms[0].childrenAges.join(',')
        });
        if (response.data.status === 'success' && response.data.hoteis.length > 0) setResults(response.data.hoteis);
        else setError(`Nenhum hotel encontrado via Restel.`);
      }
    } catch (err) {
      setError(`Falha ao conectar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOffer = async (oferta, hotel) => {
    if (supplier !== 'RATEHAWK') return alert("O fluxo de reserva Restel será implementado posteriormente.");
    
    setSelectedOffer({ ...oferta, hotelNome: hotel.nome, hotelId: hotel.hotelId });
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

      setSelectedOffer({ 
        ...oferta, 
        bookHash: novoBookHashP, 
        paymentTypeObj: infoPagamentoAtualizada || oferta.paymentTypeObj,
        hotelNome: hotel.nome, 
        hotelId: hotel.hotelId 
      });

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
      const roomsFormatados = rooms.map(() => {
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
    if (sortBy === 'preco_crescente') {
      return a.ofertas[0].precoVenda - b.ofertas[0].precoVenda;
    }
    return 0;
  });

  const buildMapHtml = () => {
    const centerLat = mapCenterLatLon ? mapCenterLatLon.split(',')[0] : -23.5505;
    const centerLng = mapCenterLatLon ? mapCenterLatLon.split(',')[1] : -46.6333;
    
   const pinsData = filteredResults.filter(h => h.latitude && h.longitude).map(h => {
      // SEM DADOS FALSOS / SEM UNSPLASH: Usa a imagem oficial ou um fundo cinza vazio
      const img = h.imagensReais && h.imagensReais.length > 0 
        ? (typeof h.imagensReais[0] === 'string' ? h.imagensReais[0].replace('{size}', '240x240') : h.imagensReais[0]) 
        : 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=='; // Pixel cinza

      return {
        id: h.hotelId,
        lat: h.latitude,
        lng: h.longitude,
        nome: h.nome.replace(/'/g, "\\'").replace(/"/g, '&quot;'),
        preco: `BRL ${h.ofertas[0]?.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, // CORRIGIDO PARA BRL
        estrelas: '⭐'.repeat(h.categoria || 4),
        imagem: img
      };
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
       <style>
          body, html { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          #map { height: 100%; width: 100%; }

          .leaflet-popup-tip-container { display: none; }
          .leaflet-popup-content-wrapper { padding: 0; margin: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
          .leaflet-popup-content { margin: 0; width: 220px !important; }

          .map-card { display: flex; flex-direction: column; background: white; }
          .map-card-img { width: 100%; height: 130px; object-fit: cover; }
          .map-card-info { padding: 12px; }
          .map-card-stars { font-size: 10px; color: #fbbf24; margin-bottom: 4px; letter-spacing: 2px;}
          .map-card-title { font-size: 14px; font-weight: bold; color: #111; margin: 0 0 6px 0; line-height: 1.2; }
          .map-card-price { font-size: 16px; font-weight: 900; color: #00a698; margin: 0; }

          .map-card-btn {
            margin-top: 8px; width: 100%; background: #ffc107; color: #111; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s;
          }
          .map-card-btn:hover { background: #e0a800; }

          .price-pin {
            background-color: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 5px 10px;
            font-weight: 800;
            font-size: 11px; /* Fonte otimizada para caber valores longos em BRL */
            color: #111;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            text-align: center;
            white-space: nowrap;
            position: relative;
            transition: all 0.2s;
            cursor: pointer;
            display: inline-block;
          }
          .price-pin:hover { background-color: #00a698; color: white; border-color: #00a698; z-index: 9999 !important; }
          .price-pin::after { content: ''; position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); border-width: 5px 5px 0; border-style: solid; border-color: white transparent transparent transparent; }
          .price-pin:hover::after { border-color: #00a698 transparent transparent transparent; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const center = [${centerLat}, ${centerLng}];
          const hotels = ${JSON.stringify(pinsData)};

          const map = L.map('map').setView(center, 14);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Colaboradores &copy; OpenStreetMap'
          }).addTo(map);

          hotels.forEach(hotel => {
            const customIcon = L.divIcon({
              className: 'custom-pin',
              html: '<div class="price-pin">' + hotel.preco + '</div>',
              iconSize: [130, 36],   // Largura generosa de 130px para acomodar o texto completo
              iconAnchor: [65, 36],  // Metade da largura (65) para centralizar perfeitamente a ponta do balão
              popupAnchor: [0, -38] 
            });

            const popupContent = '<div class="map-card">' +
              '<img src="' + hotel.imagem + '" class="map-card-img" />' +
              '<div class="map-card-info">' +
                '<div class="map-card-stars">' + hotel.estrelas + '</div>' +
                '<h4 class="map-card-title">' + hotel.nome + '</h4>' +
                '<p class="map-card-price">' + hotel.preco + '</p>' +
                '<button class="map-card-btn" onclick="window.parent.postMessage({type: \\'SELECT_HOTEL\\', hotelId: \\'' + hotel.id + '\\'}, \\'*\\')">Detalhes do Hotel</button>' +
              '</div>' +
            '</div>';

            const marker = L.marker([hotel.lat, hotel.lng], { icon: customIcon }).addTo(map);
            marker.bindPopup(popupContent);

            marker.on('mouseover', function (e) {
              this.openPopup();
            });
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="w-full bg-gray-50 font-sans min-h-screen pb-10">
      
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
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4">
                
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
                    {destinationQuery && (
                      <button type="button" onClick={() => setDestinationQuery('')} className="text-gray-400 hover:text-gray-600 text-lg ml-2">×</button>
                    )}
                  </div>

                  {showDropdown && (regionsResults.length > 0 || hotelsResults.length > 0) && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-72 overflow-y-auto z-50">
                      {regionsResults.map((item, idx) => (
                        <div key={`reg-${idx}`} onClick={() => { setDestinationQuery(item.name || item.title); setRegionId(item.id); setShowDropdown(false); }} className="px-4 py-3 text-sm text-gray-800 hover:bg-orange-50 cursor-pointer border-b border-gray-100 flex justify-between items-center">
                          <span className="font-medium">{item.name || item.title}</span><span className="text-[10px] text-gray-500 uppercase">Região</span>
                        </div>
                      ))}
                      {hotelsResults.map((item, idx) => (
                        <div key={`hot-${idx}`} onClick={() => { setDestinationQuery(item.name || item.title); setRegionId(item.id); setShowDropdown(false); }} className="px-4 py-3 text-sm text-gray-800 hover:bg-orange-50 cursor-pointer border-b border-gray-100 flex justify-between items-center">
                          <span className="font-medium">{item.name || item.title}</span><span className="text-[10px] text-gray-500 uppercase">Hotel</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-span-1 lg:col-span-4 flex bg-white border border-gray-300 rounded-md hover:border-gray-400 transition relative overflow-hidden">
                  <div 
                    className="flex-1 px-3 flex flex-col justify-center relative cursor-pointer group hover:bg-gray-50 transition"
                    onClick={() => checkInRef.current && checkInRef.current.showPicker()}
                  >
                    <label className="block text-[10px] text-gray-400 uppercase pt-1 cursor-pointer">Check-in</label>
                    <div className="text-sm text-gray-900 font-bold pb-1 truncate cursor-pointer">
                      {checkInDate ? formatarDataExibicao(checkInDate) : <span className="text-gray-300 font-normal">Adicionar data</span>}
                    </div>
                    <input 
                      type="date" 
                      ref={checkInRef}
                      min={getTodayStr()} 
                      value={checkInDate} 
                      onChange={(e) => setCheckInDate(e.target.value)} 
                      className="absolute bottom-0 left-0 w-full h-0 opacity-0 pointer-events-none"
                    />
                  </div>

                  <div className="w-[1px] bg-gray-300 my-2"></div>

                  <div 
                    className="flex-1 px-3 flex flex-col justify-center relative cursor-pointer group hover:bg-gray-50 transition"
                    onClick={() => checkOutRef.current && checkOutRef.current.showPicker()}
                  >
                    <label className="block text-[10px] text-gray-400 uppercase pt-1 cursor-pointer">Check-out</label>
                    <div className="text-sm text-gray-900 font-bold pb-1 truncate cursor-pointer">
                      {checkOutDate ? formatarDataExibicao(checkOutDate) : <span className="text-gray-300 font-normal">Adicionar data</span>}
                    </div>
                    <input 
                      type="date" 
                      ref={checkOutRef}
                      min={checkInDate || getTomorrowStr()} 
                      value={checkOutDate} 
                      onChange={(e) => setCheckOutDate(e.target.value)} 
                      className="absolute bottom-0 left-0 w-full h-0 opacity-0 pointer-events-none"
                    />
                  </div>
                </div>

                <div className="col-span-1 lg:col-span-2 relative bg-white border border-gray-300 rounded-md px-3 py-1.5 cursor-pointer hover:border-gray-400 transition flex flex-col justify-center" ref={guestDropdownRef} onClick={() => setShowGuestDropdown(!showGuestDropdown)}>
                  <span className="block text-[10px] text-gray-400 uppercase">{rooms.length} quarto{rooms.length > 1 ? 's' : ''} para</span>
                  <div className="text-sm text-gray-900 font-medium flex justify-between items-center">
                    <span>{rooms.reduce((acc, r) => acc + r.adults + r.childrenAges.length, 0)} hóspedes</span>
                    <span className="text-gray-400 text-xs">▼</span>
                  </div>

                  {showGuestDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-[340px] md:w-[380px] bg-white border border-gray-200 rounded-lg shadow-2xl p-5 z-[100]" onClick={(e) => e.stopPropagation()}>
                      <div className="max-h-[360px] overflow-y-auto pr-2 scrollbar-thin">
                        {rooms.map((room, roomIndex) => (
                          <div key={roomIndex} className="mb-5 pb-5 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
                            
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-bold text-gray-900 text-base">Quarto {roomIndex + 1}</h4>
                              {roomIndex > 0 && (
                                <button type="button" onClick={() => removeRoom(roomIndex)} className="text-sm text-red-500 hover:underline">Remover</button>
                              )}
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
                                      <select 
                                        value={age} 
                                        onChange={(e) => updateChildAge(roomIndex, childIndex, e.target.value)} 
                                        className="pl-2 pr-1 h-full text-sm text-gray-800 outline-none bg-transparent cursor-pointer appearance-none"
                                      >
                                        {[...Array(18).keys()].map(n => (
                                          <option key={n} value={n}>{n === 0 ? '0 ano' : `${n} ano${n !== 1 ? 's' : ''}`}</option>
                                        ))}
                                      </select>
                                      <button type="button" onClick={() => removeChild(roomIndex, childIndex)} className="px-2 h-full flex items-center justify-center border-l border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-red-500 transition font-bold">✕</button>
                                    </div>
                                  ))}
                                  {room.childrenAges.length < 4 && (
                                    <button 
                                      type="button" 
                                      onClick={() => addChild(roomIndex)} 
                                      className={`border border-gray-300 rounded h-9 text-gray-700 hover:bg-gray-50 transition text-sm font-medium ${room.childrenAges.length === 0 ? 'px-4' : 'w-9 flex items-center justify-center'}`}
                                    >
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
                        {rooms.length < 9 && (
                          <button type="button" onClick={addRoom} className="text-sm text-blue-600 hover:text-blue-800 font-medium text-left">
                            Adicionar um quarto
                          </button>
                        )}
                        <button type="button" onClick={() => setShowGuestDropdown(false)} className="w-full bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-bold py-2.5 rounded shadow-sm transition text-sm">
                          Concluído
                        </button>
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

              <div className="mt-2">
                <span className="text-xs text-white font-medium mb-2 block">Parâmetros adicionais</span>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                  
                  <div className="col-span-1 lg:col-span-2 border border-gray-300 rounded-md bg-white px-2 flex flex-col justify-center h-[38px] hover:border-gray-400 transition">
                    <label className="block text-[8px] text-gray-400 uppercase font-bold">Nacionalidade</label>
                    <select value={residency} onChange={(e) => setResidency(e.target.value)} className="text-[11px] text-gray-900 font-bold outline-none bg-transparent w-full cursor-pointer">
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="col-span-1 lg:col-span-3 flex border border-gray-300 rounded-md divide-x divide-gray-300 overflow-hidden text-[11px] font-medium text-gray-700 bg-white h-[38px]">
                    <button type="button" onClick={() => toggleStar(0)} className={`flex-1 px-1 transition ${stars.length === 0 ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>Sem estrelas</button>
                    <button type="button" onClick={() => toggleStar(2)} className={`flex-1 px-1 transition ${stars.includes(2) ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>2⭐</button>
                    <button type="button" onClick={() => toggleStar(3)} className={`flex-1 px-1 transition ${stars.includes(3) ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>3⭐</button>
                    <button type="button" onClick={() => toggleStar(4)} className={`flex-1 px-1 transition ${stars.includes(4) ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>4⭐</button>
                    <button type="button" onClick={() => toggleStar(5)} className={`flex-1 px-1 transition ${stars.includes(5) ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>5⭐</button>
                  </div>

                  <div className="col-span-1 lg:col-span-2 flex border border-gray-300 rounded-md divide-x divide-gray-300 overflow-hidden text-[11px] font-medium text-gray-700 bg-white h-[38px]">
                    <button type="button" title="Somente quarto" onClick={() => toggleMeal('RO')} className={`flex-1 transition ${meals.includes('RO') ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>RO</button>
                    <button type="button" title="Café da manhã" onClick={() => toggleMeal('BB')} className={`flex-1 transition ${meals.includes('BB') ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>BB</button>
                    <button type="button" title="Meia pensão" onClick={() => toggleMeal('HB')} className={`flex-1 transition ${meals.includes('HB') ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>HB</button>
                    <button type="button" title="Pensão completa" onClick={() => toggleMeal('FB')} className={`flex-1 transition ${meals.includes('FB') ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>FB</button>
                    <button type="button" title="Tudo incluído" onClick={() => toggleMeal('AI')} className={`flex-1 transition ${meals.includes('AI') ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>AI</button>
                  </div>

                  <div className="col-span-1 lg:col-span-5 flex items-center gap-2">
                    
                    <div className="flex border border-gray-300 rounded-md px-2 hover:border-gray-400 transition-all bg-white h-[38px] flex-1 min-w-[110px]">
                      <div className="flex flex-col w-full justify-center">
                        <label className="text-[8px] text-gray-400 uppercase font-bold">Check-in antec.</label>
                        <select value={earlyCheckin} onChange={(e) => setEarlyCheckin(e.target.value)} className="text-[11px] font-medium text-gray-700 outline-none bg-transparent cursor-pointer w-full">
                          <option value="">Selecionar</option>
                          {['01:00','02:00','03:00','04:00','05:00','06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00'].map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex border border-gray-300 rounded-md px-2 hover:border-gray-400 transition-all bg-white h-[38px] flex-1 min-w-[110px]">
                      <div className="flex flex-col w-full justify-center">
                        <label className="text-[8px] text-gray-400 uppercase font-bold">Check-out tard.</label>
                        <select value={lateCheckout} onChange={(e) => setLateCheckout(e.target.value)} className="text-[11px] font-medium text-gray-700 outline-none bg-transparent cursor-pointer w-full">
                          <option value="">Selecionar</option>
                          {['13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'].map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer h-[38px] px-1 whitespace-nowrap">
                      <input type="checkbox" checked={freeCancellation} onChange={(e) => setFreeCancellation(e.target.checked)} className="w-3.5 h-3.5 accent-[#ffc107] cursor-pointer" />
                      <span className="text-[11px] font-medium text-white shadow-sm drop-shadow-md">Cancel. Grátis</span>
                    </label>
                  </div>

                </div>
              </div>

            </form>
          </div>
        </div>
      </div>

     <div className="max-w-[1400px] mx-auto px-3 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* COLUNA ESQUERDA: FILTROS REFINADOS E VISUAIS */}
          {/* ======================================================== */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-5 border border-gray-200 text-sm text-gray-800">
            
            {/* FAVORITOS */}
            <div className="flex justify-between items-center pb-5 mb-5 border-b border-gray-200">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                <span className="text-red-500 text-lg">♥</span> Favoritos
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            {/* ORDENAR POR */}
            <div className="pb-5 mb-5 border-b border-gray-200">
              <label className="block font-bold text-gray-900 mb-2">Ordenar por</label>
              <div className="relative">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 text-sm bg-white outline-none cursor-pointer font-medium appearance-none focus:border-orange-500 transition">
                  <option value="popularidade">Popularidade</option>
                  <option value="preco_crescente">Menor preço</option>
                  <option value="classificacao">Avaliações</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">▼</div>
              </div>
            </div>

            {/* NOME DO HOTEL */}
            <div className="pb-5 mb-5 border-b border-gray-200">
              <label className="block font-bold text-gray-900 mb-2">Nome do hotel</label>
              <input type="text" placeholder="Por exemplo, Hilton" value={filterHotelName} onChange={(e) => setFilterHotelName(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 text-sm outline-none focus:border-orange-500 transition"/>
            </div>

            {/* REFEIÇÕES */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900">Refeições</h4>
              <label className="flex justify-between items-start cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={meals.includes('RO')} onChange={()=>toggleMeal('RO')} className="accent-orange-500 w-4 h-4 shrink-0 mt-0.5"/> Sem refeições incluídas
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
              <label className="flex justify-between items-start cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={meals.includes('BB')} onChange={()=>toggleMeal('BB')} className="accent-orange-500 w-4 h-4 shrink-0 mt-0.5"/> Pequeno-almoço incluído
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
              <label className="flex justify-between items-start cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={meals.includes('HB')} onChange={()=>toggleMeal('HB')} className="accent-orange-500 w-4 h-4 shrink-0 mt-0.5"/> Pequeno-almoço + jantar ou almoço incluídos
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
              <label className="flex justify-between items-start cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={meals.includes('FB')} onChange={()=>toggleMeal('FB')} className="accent-orange-500 w-4 h-4 shrink-0 mt-0.5"/> Pequeno-almoço, almoço e jantar incluídos
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
              <label className="flex justify-between items-start cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={meals.includes('AI')} onChange={()=>toggleMeal('AI')} className="accent-orange-500 w-4 h-4 shrink-0 mt-0.5"/> Tudo incluído
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
            </div>

            {/* CLASSIFICAÇÃO POR ESTRELAS */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900">Classificação por estrelas</h4>
              <label className="flex justify-between items-center cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={stars.includes(2)} onChange={()=>toggleStar(2)} className="accent-orange-500 w-4 h-4 shrink-0"/> ⭐⭐
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
              <label className="flex justify-between items-center cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={stars.includes(3)} onChange={()=>toggleStar(3)} className="accent-orange-500 w-4 h-4 shrink-0"/> ⭐⭐⭐
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
              <label className="flex justify-between items-center cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={stars.includes(4)} onChange={()=>toggleStar(4)} className="accent-orange-500 w-4 h-4 shrink-0"/> ⭐⭐⭐⭐
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
              <label className="flex justify-between items-center cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={stars.includes(5)} onChange={()=>toggleStar(5)} className="accent-orange-500 w-4 h-4 shrink-0"/> ⭐⭐⭐⭐⭐
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
              <label className="flex justify-between items-center cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={stars.length===0} onChange={()=>toggleStar(0)} className="accent-orange-500 w-4 h-4 shrink-0"/> ou sem estrelas
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
            </div>

            {/* PAGAMENTO E RESERVA */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900">Pagamento e reserva</h4>
              <label className="flex justify-between items-center cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" checked={freeCancellation} onChange={(e) => setFreeCancellation(e.target.checked)} className="accent-orange-500 w-4 h-4 shrink-0"/> Cancelamento gratuito disponível
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
            </div>

            {/* LOCALIZAÇÃO */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900">Localização</h4>
              <label className="block text-gray-700 font-medium text-sm mb-1">do centro da cidade</label>
              <input type="range" className="w-full accent-orange-500" min="0" max="100" />
            </div>

            {/* CLASSIFICAÇÃO DE AVALIAÇÕES */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900">Classificação de avaliações</h4>
              {[
                { label: '9 e acima', count: 0 },
                { label: '8 e acima', count: 0 },
                { label: '7 e acima', count: 0 },
                { label: '6 e acima', count: 0 },
                { label: '5 e acima', count: 0 },
              ].map((item, i) => (
                <label key={i} className="flex justify-between items-center cursor-pointer group">
                  <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                    <input type="radio" name="rating_filter" className="accent-orange-500 w-4 h-4 shrink-0"/> {item.label}
                  </span>
                  <span className="text-gray-400 text-xs">{item.count}</span>
                </label>
              ))}
            </div>

            {/* PREÇO PARA & MOEDA */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-4">
              <h4 className="font-bold text-gray-900">Preço para</h4>
              <div className="flex bg-gray-100 p-1 rounded-md">
                <button className="flex-1 bg-white text-gray-900 font-bold py-1.5 rounded shadow-sm text-xs">uma diária</button>
                <button className="flex-1 text-gray-600 font-medium py-1.5 rounded text-xs hover:bg-gray-200 transition">10 diárias</button>
              </div>
              <div>
                <label className="block text-gray-700 font-bold text-xs mb-1">em</label>
                <select className="w-full border border-gray-300 rounded p-2 text-sm bg-white outline-none cursor-pointer focus:border-orange-500">
                  <option value="BRL">BRL Real</option>
                  <option value="USD">USD Dólar americano, $</option>
                  <option value="EUR">EUR Euro</option>
                </select>
              </div>
            </div>

            {/* COMODIDADES E SERVIÇOS */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-4">
              <h4 className="font-bold text-gray-900">Comodidades e Serviços</h4>
              
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-500 uppercase">No hotel</span>
                {[
                  { label: 'Internet gratuita', count: 0 }, { label: 'Traslado', count: 0 },
                  { label: 'Estacionamento', count: 0 }, { label: 'Piscina', count: 0 },
                  { label: 'Academia', count: 0 }, { label: 'Bar ou restaurante', count: 0 },
                  { label: 'Sala de conferência', count: 0 }, { label: 'Serviços de Spa', count: 0 },
                  { label: 'Pista de esqui nas proximidades', count: 0 }, { label: 'Praia próxima', count: 0 },
                  { label: 'Jacuzzi', count: 0 }, { label: 'Máquina de lavar roupa', count: 0 },
                  { label: 'Carregamento de carro elétrico', count: 0 }, { label: 'Traslado para teleférico de ski', count: 0 },
                  { label: 'Entrada e saída com ski', count: 0 }, { label: 'Aluguel de equipamento de esqui', count: 0 },
                  { label: 'Armazenamento de esquis', count: 0 }, { label: 'Sala de secagem para equipamentos de esqui', count: 0 },
                  { label: 'Escola de esqui', count: 0 }, { label: 'Esqui', count: 0 },
                  { label: 'Snowboard', count: 0 }, { label: 'Walk to ski lift', count: 0 }
                ].map((item, i) => (
                  <label key={`hotel-${i}`} className="flex justify-between items-start cursor-pointer group">
                    <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                      <input type="checkbox" className="accent-orange-500 w-4 h-4 shrink-0 mt-0.5"/> {item.label}
                    </span>
                    <span className="text-gray-400 text-xs">{item.count}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-gray-500 uppercase">No quarto</span>
                {[
                  { label: 'Ar-condionado', count: 0 }, { label: 'Banheiro privativo', count: 0 },
                  { label: 'Cozinha', count: 0 }, { label: 'Varanda', count: 0 }
                ].map((item, i) => (
                  <label key={`room-${i}`} className="flex justify-between items-center cursor-pointer group">
                    <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                      <input type="checkbox" className="accent-orange-500 w-4 h-4 shrink-0"/> {item.label}
                    </span>
                    <span className="text-gray-400 text-xs">{item.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* CARACTERÍSTICAS DA ACOMODAÇÃO */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900">Características da acomodação</h4>
              {[
                { label: 'Adequado para crianças', count: 0 }, { label: 'Para hóspedes com deficiência', count: 0 },
                { label: 'Permitidos animais de estimação', count: 0 }, { label: 'É permitido fumar', count: 0 }
              ].map((item, i) => (
                <label key={i} className="flex justify-between items-center cursor-pointer group">
                  <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                    <input type="checkbox" className="accent-orange-500 w-4 h-4 shrink-0"/> {item.label}
                  </span>
                  <span className="text-gray-400 text-xs">{item.count}</span>
                </label>
              ))}
            </div>

            {/* CERTIFICADOS */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900">Certificados</h4>
              <label className="flex justify-between items-center cursor-pointer group">
                <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                  <input type="checkbox" className="accent-orange-500 w-4 h-4 shrink-0"/> Certificação de sustentabilidade
                </span>
                <span className="text-gray-400 text-xs">0</span>
              </label>
            </div>

            {/* TIPO DE PROPRIEDADE */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900">Tipo de propriedade</h4>
              {[
                { label: 'Hotéis', count: 0 }, { label: 'Albergues', count: 0 },
                { label: 'Apartamentos', count: 0 }, { label: 'Apart-hotéis', count: 0 },
                { label: 'Pousadas', count: 0 }, { label: 'Chalés, villas, bangalôs', count: 0 },
                { label: 'Campings', count: 0 }, { label: 'Glampings', count: 0 },
                { label: 'Spas', count: 0 }, { label: 'Resorts', count: 0 },
                { label: 'Hotéis boutique', count: 0 }
              ].map((item, i) => (
                <label key={i} className="flex justify-between items-center cursor-pointer group">
                  <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                    <input type="checkbox" className="accent-orange-500 w-4 h-4 shrink-0"/> {item.label}
                  </span>
                  <span className="text-gray-400 text-xs">{item.count}</span>
                </label>
              ))}
            </div>

            {/* NÚMERO DE QUARTOS */}
            <div className="pb-5 mb-5 border-b border-gray-200 space-y-3">
              <h4 className="font-bold text-gray-900">Número de quartos</h4>
              {[
                { label: '1 quarto', count: 0 }, { label: '2 quartos', count: 0 },
                { label: '3 quartos', count: 0 }, { label: '4 quartos', count: 0 },
                { label: '5 quartos', count: 0 }, { label: '6 quartos', count: 0 }
              ].map((item, i) => (
                <label key={i} className="flex justify-between items-center cursor-pointer group">
                  <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                    <input type="checkbox" className="accent-orange-500 w-4 h-4 shrink-0"/> {item.label}
                  </span>
                  <span className="text-gray-400 text-xs">{item.count}</span>
                </label>
              ))}
            </div>

            {/* MARCAS */}
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900">Marcas</h4>
              {[
                { label: 'Accor Hotels', count: 0 }, { label: 'Choice Hotels', count: 0 },
                { label: 'Quality Inn', count: 0 }, { label: 'Intercity Hotels', count: 0 },
                { label: 'Nobile Hoteis', count: 0 }, { label: 'Nord Hotéis', count: 0 },
                { label: 'Slaviero Hoteis', count: 0 }, { label: 'Tropical Hotéis', count: 0 }
              ].map((item, i) => (
                <label key={i} className="flex justify-between items-center cursor-pointer group">
                  <span className="flex items-center gap-3 text-gray-700 font-medium group-hover:text-orange-600 transition">
                    <input type="checkbox" className="accent-orange-500 w-4 h-4 shrink-0"/> {item.label}
                  </span>
                  <span className="text-gray-400 text-xs">{item.count}</span>
                </label>
              ))}
            </div>

          </div>

          {/* ======================================================== */}
          {/* COLUNA DO CENTRO: LISTA DE RESULTADOS (100% SEM UNSPLASH) */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-black text-gray-900">{destinationQuery ? destinationQuery.split(',')[0] : 'Destino'}: {filteredResults.length} opções de acomodação disponíveis</h2>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-bold border-l-4 border-red-500 shadow-sm">{error}</div>}

            {filteredResults.map((hotel, index) => {
              
              const cardBg = hotel.imagensReais && hotel.imagensReais.length > 0 
                ? (typeof hotel.imagensReais[0] === 'string' ? hotel.imagensReais[0].replace('{size}', '800x600') : hotel.imagensReais[0]) 
                : null;

              // VERIFICA SE ESTE HOTEL JÁ ESTÁ NA GLOBAL STORE DE FAVORITOS
              const isFavorite = favorites.some(fav => fav._id === String(hotel.hotelId) && fav.type === 'hotel');

              const handleToggleFavorite = (e) => {
                e.stopPropagation(); // Evita que o clique abra a galeria da imagem
                e.preventDefault();
                
                toggleFavorite({
                    _id: String(hotel.hotelId),
                    type: 'hotel',
                    name: hotel.nome,
                    price: hotel.ofertas[0]?.precoVenda || 0,
                    image: cardBg,
                    originalHotelData: hotel,
                    checkInDate,
                    checkOutDate,
                    rooms,
                    residency
                });
              };

              return (
                <div 
                  key={index} 
                  onMouseEnter={() => {
                    if(hotel.latitude && hotel.longitude) {
                      setMapCenterLatLon(`${hotel.latitude},${hotel.longitude}`);
                    }
                  }}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-400 hover:shadow-md transition-all overflow-hidden flex flex-col xl:flex-row cursor-default"
                >
                  <div 
                    onClick={() => setActiveGalleryHotel(hotel)} 
                    className="w-full xl:w-[220px] h-48 xl:h-auto bg-gray-100 relative shrink-0 cursor-pointer group overflow-hidden border-r border-gray-200 flex items-center justify-center"
                  >
                    {/* BOTÃO DO CORAÇÃO FAVORITAR (GLOBAL STORE) */}
                    <button 
                      onClick={handleToggleFavorite}
                      className="absolute top-3 right-3 z-20 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
                      title="Salvar nos Favoritos"
                    >
                      <Heart size={18} className={isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"} />
                    </button>

                    {cardBg ? (
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                        style={{ backgroundImage: `url('${cardBg}')` }}
                      ></div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-2xl mb-1">🏨</span>
                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Sem Imagem<br/>no Sandbox</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                      <span className="text-white text-[10px] font-bold bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1.5 shadow-sm border border-white/20">📷 Ver {hotel.imagensReais?.length || 0} fotos</span>
                    </div>
                  </div>

                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-amber-400 text-[10px] mb-0.5">{'⭐'.repeat(hotel.categoria || 4)}</div>
                          <h3 className="font-bold text-gray-900 text-base leading-tight">{hotel.nome}</h3>
                          <p className="text-[11px] text-gray-500 font-medium mt-1">{hotel.endereco}</p>
                          <p className="text-[11px] text-gray-400">{hotel.distancia}</p>
                        </div>
                        <div className="bg-green-600 text-white font-black text-sm px-2.5 py-1 rounded shadow-sm">8,2</div>
                      </div>

                      <div className="pt-3 flex flex-col gap-2.5">
                        {hotel.ofertas?.filter(oferta => {
                          const mealMatch = meals.length === 0 || meals.includes(oferta.codigoRegime);
                          const cancelMatch = !freeCancellation || oferta.freeCancellation;
                          return mealMatch && cancelMatch;
                        }).map((oferta, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-2 rounded-lg border-t border-gray-100 transition">
                            <div className="mb-2 sm:mb-0">
                              <p className="font-medium text-gray-700 text-xs">{oferta.tipoQuarto}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">Para {rooms.reduce((acc, r) => acc + r.adults, 0)} adultos</p>
                            </div>
                            <div className="flex flex-col sm:items-center gap-1 sm:px-4">
                              <p className="text-[10px] text-green-700 font-medium flex items-center gap-1 uppercase"><span>🍽️</span> {oferta.nomeRegime}</p>
                              {oferta.freeCancellation && <p className="text-[10px] text-green-700 font-medium flex items-center gap-1"><span>↩️</span> Cancelamento gratuito</p>}
                            </div>
                            <div className="text-left sm:text-right flex flex-col sm:items-end w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0">
                              <span className="text-base font-medium text-gray-900">BRL {oferta.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                              
                              <button 
                                onClick={() => navigate('/hotel-details', { state: { hotel, checkInDate, checkOutDate, rooms, residency } })}
                                className="w-full sm:w-auto bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-bold text-[11px] px-4 py-1.5 rounded shadow-sm transition mt-1"
                              >Mostrar</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* COLUNA DIREITA: MAPA DO GOOGLE (SEM ALTERAÇÕES) */}
          {/* ======================================================== */}
          <div className="lg:col-span-4 sticky top-4 h-[calc(100vh-40px)] bg-gray-100 rounded-xl border border-gray-300 overflow-hidden shadow-inner hidden lg:flex flex-col">
            
            <div className="bg-white p-3 border-b border-gray-200 flex justify-between items-center z-10 shadow-sm relative">
              <button className="bg-white border border-gray-300 text-xs font-bold px-4 py-2 rounded shadow hover:bg-gray-50 transition flex items-center gap-1 text-gray-700">
                <span>‹</span> Ampliar o mapa
              </button>
              <div className="relative flex-1 ml-3">
                <input type="text" placeholder="Pesquisar movendo o mapa" readOnly className="w-full text-xs border border-gray-300 rounded px-3 py-2 outline-none bg-gray-50 font-medium text-gray-600"/>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">📍</span>
              </div>
            </div>

            <div className="flex-1 w-full relative">
              {filteredResults.length > 0 ? (
                <iframe 
                  title="Mapa de Localização com Preços"
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  srcDoc={buildMapHtml()}
                ></iframe>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm font-medium">
                  Faça uma busca para ver os hotéis no mapa
                </div>
              )}
            </div>
            
          </div>

        </div>
      </div>

      {activeGalleryHotel && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl p-6 rounded-2xl relative shadow-2xl">
            <button onClick={() => setActiveGalleryHotel(null)} className="absolute top-4 right-4 text-xl font-bold text-gray-500 hover:text-black">✕</button>
            <h3 className="font-black text-lg mb-4 text-gray-900">Galeria Oficial: {activeGalleryHotel.nome}</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto pr-1">
              {activeGalleryHotel.imagensReais && activeGalleryHotel.imagensReais.length > 0 ? (
                activeGalleryHotel.imagensReais.map((imgUrl, i) => (
                  <img 
                    key={i} 
                    src={typeof imgUrl === 'string' ? imgUrl.replace('{size}', '500x500') : imgUrl} 
                    className="rounded-lg h-40 w-full object-cover shadow-sm border border-gray-100" 
                    alt={`Hotel API ${i}`} 
                  />
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
                    <p className="text-xl font-black text-green-700 mt-2"> {selectedOffer.precoVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
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