import React, { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase'; 

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

  const dropdownRef = useRef(null);
  const guestDropdownRef = useRef(null);

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

  const getTotalGuestsText = () => {
    const totalAdults = rooms.reduce((acc, r) => acc + r.adults, 0);
    const totalChildren = rooms.reduce((acc, r) => acc + r.childrenAges.length, 0);
    return `${totalAdults + totalChildren} hóspede${totalAdults + totalChildren > 1 ? 's' : ''}`;
  };

  const toggleStar = (star) => {
    if (star === 0) setStars([]);
    else setStars(prev => prev.includes(star) ? prev.filter(s => s !== star) : [...prev, star]);
  };
  const toggleMeal = (meal) => {
    setMeals(prev => prev.includes(meal) ? prev.filter(m => m !== meal) : [...prev, meal]);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const targetDest = regionId || destinationQuery;
    if (!targetDest) return setError("Informe ou selecione um destino válido.");
    if (!checkInDate || !checkOutDate) return setError("Preencha as datas de check-in e check-out.");

    setLoading(true); setError(null); setResults([]);

    try {
      if (supplier === 'RATEHAWK') {
        const hidsToSearch = (targetDest === 'US-LAX' || destinationQuery.toLowerCase().includes('los angeles')) 
          ? [10004834, 8819557] : [10004834];

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
          const hoteisMapeados = combinados.map(h => ({
            hotelId: h.id, nome: `Hotel RateHawk Teste (${h.id})`, categoria: 4, 
            ofertas: h.rates.map(r => ({
              tipoQuarto: r.room_name || 'Standard', 
              codigoRegime: r.meal || 'Sem Refeição', 
              precoVenda: parseFloat(r.payment_options?.payment_types?.[0]?.amount || r.daily_prices?.[0] || 0),
              bookHash: r.book_hash
            }))
          }));
          setResults(hoteisMapeados);
        } else {
          setError(`Nenhum inventário retornado.`);
        }
      } else {
        const functions = getFunctions(app);
        const searchRestelHotels = httpsCallable(functions, 'searchRestelHotels');
        const response = await searchRestelHotels({
          destinationCode: targetDest, checkInDate, checkOutDate,
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
      setBookingStep('details');
    } catch (err) {
      setBookingStep('error');
      setBookingError("Erro ao validar tarifa no fornecedor.");
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
      // OPÇÃO 1 DA ETG: Apenas 1 adulto real por quarto, sem dados falsos para crianças ou outros adultos.
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
        book_hash: selectedOffer.bookHash,
        language: "pt",
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

      const finishRes = await fetch('https://palastore-flights-api.laeciossp.workers.dev/hotel-booking-finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...orderPayload, payment_type: { type: "deposit" } })
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

        if (attempts >= 15) {
          clearInterval(interval);
          setBookingStep('error');
          setBookingError("Tempo limite excedido aguardando o fornecedor.");
        }
      } catch (err) {
        console.error("Erro no polling:", err);
      }
    }, 3000);
  };

  return (
    <div className="w-full bg-orange-500 p-4 md:p-6 font-sans min-h-screen">
      <div className="max-w-[1200px] mx-auto space-y-3">
        
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          
          <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-200 scrollbar-hide">
            <button className="flex items-center gap-2 px-6 py-4 bg-[#333333] text-white text-sm font-bold whitespace-nowrap">
              <span>🏨</span> Hotéis e apartamentos
            </button>
          </div>

          <div className="p-5 md:p-6 bg-white">
            <form onSubmit={handleSearch}>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
                <div className="col-span-1 md:col-span-4 relative border border-gray-300 rounded-md bg-white hover:border-gray-400 transition" ref={dropdownRef}>
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

                <div className="col-span-1 md:col-span-4 flex">
                  <div className="flex-1 border border-gray-300 rounded-l-md bg-white px-3 hover:border-gray-400 transition flex flex-col justify-center">
                    <label className="block text-[10px] text-gray-400 uppercase pt-1">Check-in</label>
                    <input type="date" min={getTodayStr()} value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="text-sm text-gray-900 font-medium outline-none bg-transparent pb-1 cursor-pointer"/>
                  </div>
                  <div className="flex-1 border-y border-r border-gray-300 rounded-r-md bg-white px-3 hover:border-gray-400 transition flex flex-col justify-center -ml-[1px]">
                    <label className="block text-[10px] text-gray-400 uppercase pt-1">Check-out</label>
                    <input type="date" min={checkInDate || getTomorrowStr()} value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="text-sm text-gray-900 font-medium outline-none bg-transparent pb-1 cursor-pointer"/>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 relative" ref={guestDropdownRef}>
                  <div onClick={() => setShowGuestDropdown(!showGuestDropdown)} className="border border-gray-300 rounded-md bg-white px-3 py-1.5 h-full cursor-pointer hover:border-gray-400 transition flex flex-col justify-center">
                    <span className="block text-[10px] text-gray-400 uppercase">{rooms.length} quarto{rooms.length > 1 ? 's' : ''} para</span>
                    <div className="text-sm text-gray-900 font-medium flex justify-between items-center">
                      <span>{getTotalGuestsText()}</span>
                      <span className="text-gray-400 text-xs">▼</span>
                    </div>
                  </div>

                  {showGuestDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-2xl p-5 z-50">
                      <div className="max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                        {rooms.map((room, roomIndex) => (
                          <div key={roomIndex} className="mb-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-bold text-gray-800">Quarto {roomIndex + 1}</h4>
                              {rooms.length > 1 && <button type="button" onClick={() => removeRoom(roomIndex)} className="text-xs text-gray-400 hover:text-red-500 font-bold">✕</button>}
                            </div>
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm text-gray-600">Adultos</span>
                              <div className="flex items-center gap-3 border border-gray-300 rounded px-2 py-1">
                                <button type="button" onClick={() => updateAdults(roomIndex, -1)} disabled={room.adults <= 1} className="w-5 h-5 flex items-center justify-center text-gray-500 disabled:opacity-30 hover:bg-gray-100">−</button>
                                <span className="text-sm font-medium w-4 text-center">{room.adults}</span>
                                <button type="button" onClick={() => updateAdults(roomIndex, 1)} disabled={room.adults >= 6} className="w-5 h-5 flex items-center justify-center text-gray-500 disabled:opacity-30 hover:bg-gray-100">+</button>
                              </div>
                            </div>
                            {room.childrenAges.map((age, childIndex) => (
                              <div key={childIndex} className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Criança {childIndex + 1}</span>
                                <div className="flex items-center gap-2">
                                  <select value={age} onChange={(e) => updateChildAge(roomIndex, childIndex, e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1 outline-none bg-white">
                                    {[...Array(18).keys()].map(n => <option key={n} value={n}>{n} ano{n !== 1 ? 's' : ''}</option>)}
                                  </select>
                                  <button type="button" onClick={() => removeChild(roomIndex, childIndex)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                                </div>
                              </div>
                            ))}
                            {room.childrenAges.length < 4 && (
                              <button type="button" onClick={() => addChild(roomIndex)} className="text-sm text-blue-600 hover:text-blue-800 font-medium py-1">+ Adicionar uma criança</button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-gray-200 mt-2">
                        {rooms.length < 9 && (
                          <button type="button" onClick={addRoom} className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-4 block">+ Adicionar um quarto</button>
                        )}
                        <button type="button" onClick={() => setShowGuestDropdown(false)} className="w-full bg-[#ffc107] hover:bg-yellow-500 text-gray-900 font-medium py-2 rounded transition">
                          Concluído
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <button type="submit" disabled={loading} className="w-full h-full bg-[#00a698] hover:bg-[#008f82] text-white font-bold rounded-md shadow-sm text-sm transition">
                    {loading ? '...' : 'Buscar'}
                  </button>
                </div>
              </div>

              <div className="mt-6 mb-2">
                <span className="text-sm text-gray-500 font-medium">Parâmetros adicionais</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                <div className="col-span-1 md:col-span-3 border border-gray-300 rounded-md bg-white px-3 flex flex-col justify-center h-11 relative">
                  <label className="block text-[9px] text-gray-400 uppercase pt-1">Nacionalidade dos hóspedes</label>
                  <div className="flex items-center justify-between pb-1">
                    <select 
                      value={residency} 
                      onChange={(e) => setResidency(e.target.value)} 
                      className="text-sm text-gray-900 font-medium outline-none bg-transparent w-full cursor-pointer"
                    >
                      {COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-9 flex border border-gray-300 rounded-md divide-x divide-gray-300 overflow-hidden text-sm text-gray-700 bg-white h-11">
                  <button type="button" onClick={() => toggleStar(0)} className={`flex-1 px-2 py-1 transition ${stars.length === 0 ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>Sem estrelas</button>
                  <button type="button" onClick={() => toggleStar(2)} className={`flex-1 px-2 py-1 transition ${stars.includes(2) ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>2 estrelas</button>
                  <button type="button" onClick={() => toggleStar(3)} className={`flex-1 px-2 py-1 transition ${stars.includes(3) ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>3 estrelas</button>
                  <button type="button" onClick={() => toggleStar(4)} className={`flex-1 px-2 py-1 transition ${stars.includes(4) ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>4 estrelas</button>
                  <button type="button" onClick={() => toggleStar(5)} className={`flex-1 px-2 py-1 transition ${stars.includes(5) ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>5 estrelas</button>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center">
                <div className="flex border border-gray-300 rounded-md divide-x divide-gray-300 overflow-hidden text-sm font-medium text-gray-700 bg-white h-11">
                  <button type="button" title="Somente quarto" onClick={() => toggleMeal('RO')} className={`px-5 relative group transition ${meals.includes('RO') ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>
                    RO
                    <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity">Somente quarto</span>
                  </button>
                  <button type="button" title="Café da manhã" onClick={() => toggleMeal('BB')} className={`px-5 relative group transition ${meals.includes('BB') ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>
                    BB
                    <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity">Café da manhã</span>
                  </button>
                  <button type="button" title="Meia pensão" onClick={() => toggleMeal('HB')} className={`px-5 relative group transition ${meals.includes('HB') ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>
                    HB
                    <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity">Meia pensão</span>
                  </button>
                  <button type="button" title="Pensão completa" onClick={() => toggleMeal('FB')} className={`px-5 relative group transition ${meals.includes('FB') ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>
                    FB
                    <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity">Pensão completa</span>
                  </button>
                  <button type="button" title="Tudo incluído" onClick={() => toggleMeal('AI')} className={`px-5 relative group transition ${meals.includes('AI') ? 'bg-orange-50 font-bold text-orange-600' : 'hover:bg-gray-50'}`}>
                    AI
                    <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity">Tudo incluído</span>
                  </button>
                </div>

                <div className="flex border border-gray-300 rounded-md px-3 min-w-[200px] cursor-pointer hover:border-gray-400 transition-all items-center justify-between bg-white h-11">
                  <div className="flex flex-col w-full">
                    <label className="text-[9px] text-gray-400 uppercase pt-1">Check-in antecipado</label>
                    <select value={earlyCheckin} onChange={(e) => setEarlyCheckin(e.target.value)} className="text-sm text-gray-500 outline-none bg-transparent cursor-pointer pb-1 w-full">
                      <option value="">Selecionar horário</option>
                      <option value="01:00">01:00</option>
                      <option value="02:00">02:00</option>
                      <option value="03:00">03:00</option>
                      <option value="04:00">04:00</option>
                      <option value="05:00">05:00</option>
                      <option value="06:00">06:00</option>
                      <option value="07:00">07:00</option>
                      <option value="08:00">08:00</option>
                      <option value="09:00">09:00</option>
                      <option value="10:00">10:00</option>
                      <option value="11:00">11:00</option>
                      <option value="12:00">12:00</option>
                      <option value="13:00">13:00</option>
                    </select>
                  </div>
                </div>

                <div className="flex border border-gray-300 rounded-md px-3 min-w-[200px] cursor-pointer hover:border-gray-400 transition-all items-center justify-between bg-white h-11">
                  <div className="flex flex-col w-full">
                    <label className="text-[9px] text-gray-400 uppercase pt-1">Check-out tardio</label>
                    <select value={lateCheckout} onChange={(e) => setLateCheckout(e.target.value)} className="text-sm text-gray-500 outline-none bg-transparent cursor-pointer pb-1 w-full">
                      <option value="">Selecionar horário</option>
                      <option value="13:00">13:00</option>
                      <option value="14:00">14:00</option>
                      <option value="15:00">15:00</option>
                      <option value="16:00">16:00</option>
                      <option value="17:00">17:00</option>
                      <option value="18:00">18:00</option>
                      <option value="19:00">19:00</option>
                      <option value="20:00">20:00</option>
                      <option value="21:00">21:00</option>
                      <option value="22:00">22:00</option>
                      <option value="23:00">23:00</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer ml-1 xl:ml-4 group h-11">
                  <input 
                    type="checkbox" 
                    checked={freeCancellation} 
                    onChange={(e) => setFreeCancellation(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 cursor-pointer" 
                  />
                  <span className="text-sm font-medium text-gray-700">Cancelamento gratuito</span>
                </label>

              </div>
            </form>
          </div>
        </div>

        {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mt-6 font-medium text-sm">{error}</div>}

        {results.length > 0 && (
          <div className="mt-8 space-y-6">
            {results.map((hotel, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col md:flex-row">
                <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-gray-100">
                  <h3 className="font-black text-gray-900 text-xl">{hotel.nome}</h3>
                  <p className="text-xs font-bold text-gray-500 mt-1">ID Hotel: {hotel.hotelId}</p>
                </div>
                <div className="w-full md:w-[450px] bg-gray-50 p-5 flex flex-col gap-3">
                  {hotel.ofertas?.map((oferta, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{oferta.tipoQuarto}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{oferta.codigoRegime}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-green-700">R$ {oferta.precoVenda.toFixed(2)}</span>
                        <button onClick={() => handleSelectOffer(oferta, hotel)} className="mt-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold uppercase px-4 py-2 rounded transition">
                          Selecionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {bookingStep !== 'idle' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            
            <div className="bg-gray-900 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold">Finalizar Reserva</h3>
              {bookingStep !== 'booking' && (
                <button onClick={() => setBookingStep('idle')} className="text-gray-400 hover:text-white text-xl">✕</button>
              )}
            </div>

            <div className="p-6">
              {bookingStep === 'prebooking' && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-700 font-bold">Validando disponibilidade e tarifas...</p>
                  <p className="text-xs text-gray-500 mt-1">Conectando com a RateHawk (Prebook)</p>
                </div>
              )}

              {bookingStep === 'details' && selectedOffer && (
                <form onSubmit={handleConfirmBooking}>
                  <div className="mb-4 bg-orange-50 p-4 rounded-lg border border-orange-100">
                    <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Hotel</p>
                    <p className="font-black text-gray-900">{selectedOffer.hotelNome}</p>
                    <p className="text-sm text-gray-700 mt-1">{selectedOffer.tipoQuarto} - {selectedOffer.codigoRegime}</p>
                    <p className="text-xl font-black text-green-700 mt-2">R$ {selectedOffer.precoVenda.toFixed(2)}</p>
                  </div>

                  <p className="text-sm font-bold text-gray-800 mb-3">Dados do Hóspede Principal</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input type="text" placeholder="Nome" required value={guestFirstName} onChange={e => setGuestFirstName(e.target.value)} className="border border-gray-300 rounded p-2 text-sm outline-none focus:border-orange-500" />
                    <input type="text" placeholder="Sobrenome" required value={guestLastName} onChange={e => setGuestLastName(e.target.value)} className="border border-gray-300 rounded p-2 text-sm outline-none focus:border-orange-500" />
                  </div>
                  <input type="email" placeholder="E-mail" required value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm mb-3 outline-none focus:border-orange-500" />
                  <input type="text" placeholder="Telefone" required value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm mb-6 outline-none focus:border-orange-500" />

                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition uppercase text-sm">
                    Confirmar Reserva B2B
                  </button>
                </form>
              )}

              {bookingStep === 'booking' && (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-700 font-bold">Processando sua reserva...</p>
                  <p className="text-xs text-gray-500 mt-1">Aguardando confirmação do fornecedor</p>
                </div>
              )}

              {bookingStep === 'success' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
                  <h4 className="text-xl font-black text-gray-900 mb-1">Reserva Confirmada!</h4>
                  <p className="text-sm text-gray-600 mb-4">ID do Pedido: <span className="font-bold">{finalPartnerOrderId}</span></p>
                  <button onClick={() => setBookingStep('idle')} className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition">Fechar</button>
                </div>
              )}

              {bookingStep === 'error' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✕</div>
                  <h4 className="text-xl font-black text-gray-900 mb-1">Ops! Ocorreu um problema.</h4>
                  <p className="text-sm text-red-600 mb-4">{bookingError}</p>
                  <button onClick={() => setBookingStep('idle')} className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition">Tentar Novamente</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}