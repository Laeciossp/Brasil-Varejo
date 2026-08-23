import React, { useState, useEffect } from 'react';
import { MapPin, Globe, Award, TrendingUp, ArrowRight, Calendar, PlaneTakeoff } from 'lucide-react';

// Mapeamento Inteligente: Nome Turístico -> Código IATA
const IATA_MAP = {
  "Rio de Janeiro": "RIO", "Fernando de Noronha": "FEN", "Foz do Iguaçu": "IGU", "Salvador": "SSA",
  "Lençóis Maranhenses": "SLZ", "Gramado": "POA", "Bonito": "BYO", "Porto de Galinhas": "REC",
  "Paraty": "RIO", "Chapada dos Veadeiros": "BSB", "Jericoacoara": "JJD", "Ouro Preto": "CNF",
  "Búzios": "BZC", "Florianópolis": "FLN", "Maragogi": "MCZ", "Jalapão": "PMW",
  "Campos do Jordão": "GRU", "Praia da Pipa": "NAT", "Pantanal": "CGB", "Manaus": "MAO",
  "Morro de São Paulo": "SSA", "Chapada Diamantina": "LEC", "Ilhabela": "SJK", "Petrópolis": "RIO",
  "Canela": "POA", "João Pessoa": "JPA", "Angra dos Reis": "RIO", "Arraial do Cabo": "CFB",
  "Maceió": "MCZ", "Curitiba": "CWB", "São Paulo": "SAO", "Brasilia": "BSB", "Fortaleza": "FOR",
  "Belo Horizonte": "BHZ", "Recife": "REC", "Porto Alegre": "POA", "Goiânia": "GYN",
  "Belém": "BEL", "São Luís": "SLZ", "Natal": "NAT", "Teresina": "THE", "Aracaju": "AJU",
  "Cuiabá": "CGB", "Campo Grande": "CGR", "Vitória": "VIX", "Campinas": "VCP", "Santos": "SAO",
  "Caldas Novas": "CLV", "Balneário Camboriú": "NVT", "Cabo Frio": "CFB",
  "Paris": "PAR", "Roma": "ROM", "Londres": "LON", "Nova York": "NYC", "Tokyo": "TYO",
  "Barcelona": "BCN", "Amsterdam": "AMS", "Lisboa": "LIS", "Florence": "FLR", "Veneza": "VCE",
  "Kyoto": "UKY", "Cairo": "CAI", "Atenas": "ATH", "Machu Picchu": "CUZ", "Istanbul": "IST",
  "Sydney": "SYD", "Dubai": "DXB", "Bangkok": "BKK", "Singapore": "SIN", "Bali": "DPS",
  "Praga": "PRG", "Cape Town": "CPT", "Buenos Aires": "BUE", "Milan": "MIL", "Seville": "SVQ",
  "Reykjavik": "REK", "Viena": "VIE", "Munich": "MUC", "Marrakech": "RAK", "Palma de Mallorca": "PMI",
  "Kuala Lumpur": "KUL", "Seoul": "SEL", "Mecca": "JED", "Phuket": "HKT", "Shanghai": "SHA",
  "Hong Kong": "HKG", "Antalya": "AYT", "Osaka": "OSA", "Cancun": "CUN", "Las Vegas": "LAS",
  "Miami": "MIA", "Los Angeles": "LAX", "Berlin": "BER", "Pattaya": "UTP"
};

export default function DestinosPopulares({ onSelectDestination }) {
  const [tipoDestino, setTipoDestino] = useState('nacional'); 
  const [criterio, setCriterio] = useState('relevancia'); 
  const [ofertasAoVivo, setOfertasAoVivo] = useState({});
  const [carregando, setCarregando] = useState(true);

  // Listas Oficiais
  const dadosDestinos = {
    nacional: {
      relevancia: [
        "Rio de Janeiro", "Fernando de Noronha", "Foz do Iguaçu", "Salvador", "Lençóis Maranhenses", "Gramado", "Bonito", "Porto de Galinhas", "Paraty", "Chapada dos Veadeiros", "Jericoacoara", "Ouro Preto", "Búzios", "Florianópolis", "Maragogi", "Jalapão", "Campos do Jordão", "Praia da Pipa", "Pantanal", "Manaus", "Morro de São Paulo", "Chapada Diamantina", "Ilhabela", "Petrópolis", "Canela", "João Pessoa", "Angra dos Reis", "Arraial do Cabo", "Maceió", "Curitiba"
      ],
      fluxo: [
        "São Paulo", "Rio de Janeiro", "Salvador", "Brasilia", "Fortaleza", "Belo Horizonte", "Curitiba", "Manaus", "Recife", "Porto Alegre", "Goiânia", "Belém", "São Luís", "Maceió", "Natal", "Teresina", "João Pessoa", "Aracaju", "Cuiabá", "Campo Grande", "Florianópolis", "Vitória", "Campinas", "Santos", "Gramado", "Porto de Galinhas", "Caldas Novas", "Foz do Iguaçu", "Balneário Camboriú", "Cabo Frio"
      ]
    },
    internacional: {
      relevancia: [
        "Paris", "Roma", "Londres", "Nova York", "Tokyo", "Barcelona", "Amsterdam", "Lisboa", "Florence", "Veneza", "Kyoto", "Cairo", "Atenas", "Machu Picchu", "Istanbul", "Sydney", "Dubai", "Bangkok", "Singapore", "Bali", "Praga", "Cape Town", "Buenos Aires", "Milan", "Seville", "Reykjavik", "Viena", "Munich", "Marrakech", "Madrid"
      ],
      fluxo: [
        "Bangkok", "Paris", "Londres", "Dubai", "Singapore", "Palma de Mallorca", "Kuala Lumpur", "Istanbul", "Tokyo", "Antalya", "Seoul", "Mecca", "Phuket", "Roma", "Barcelona", "Pattaya", "Shanghai", "Hong Kong", "Milan", "Nova York", "Amsterdam", "Antalya", "Viena", "Osaka", "Cancun", "Las Vegas", "Miami", "Los Angeles", "Lisboa", "Berlin"
      ]
    }
  };

  const listaAtual = dadosDestinos[tipoDestino][criterio];
  const categoriaPasta = tipoDestino === 'nacional' ? 'nacionais' : 'internacionais';

  const slugify = (text) => text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  // FORMATADOR DE DATA PARA O CARD
  const formatarData = (dataString) => {
    if (!dataString) return '';
    const date = new Date(dataString);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };

  // FETCH DIRETO NA SUA URL OFICIAL (Limpamos o fallback)
  useEffect(() => {
    setCarregando(true);
    fetch('https://ratehawkapi-pamd2cm4wa-uc.a.run.app/ofertas/vitrine')
      .then(res => {
          if (!res.ok) throw new Error("Erro na rede ao buscar ofertas");
          return res.json();
      })
      .then(data => {
          setOfertasAoVivo(data || {});
          setCarregando(false);
      })
      .catch(err => {
          console.error("Erro ao buscar ofertas:", err);
          setCarregando(false);
      });
  }, []);

  return (
    <div className="w-full py-6 animate-in fade-in duration-500">
      
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight italic">
          Ofertas em Alta
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          As melhores tarifas para os próximos 12 meses, saindo de São Paulo (GRU/CGH)
        </p>
      </div>

      {/* BOTÕES DE FILTRO */}
      <div className="flex justify-center gap-3 mb-6">
        <button 
          onClick={() => setTipoDestino('nacional')}
          className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${tipoDestino === 'nacional' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <MapPin size={16} /> Brasil (Ida e Volta)
        </button>
        <button 
          onClick={() => setTipoDestino('internacional')}
          className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${tipoDestino === 'internacional' ? 'bg-purple-700 text-white shadow-lg shadow-purple-700/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Globe size={16} /> Mundo Afora
        </button>
      </div>

      <div className="flex justify-center gap-4 mb-10 text-xs font-bold flex-wrap">
        <button onClick={() => setCriterio('relevancia')} className={`pb-1 border-b-2 transition-all flex items-center gap-1 ${criterio === 'relevancia' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <Award size={14} /> Atração Turística / Relevância
        </button>
        <button onClick={() => setCriterio('fluxo')} className={`pb-1 border-b-2 transition-all flex items-center gap-1 ${criterio === 'fluxo' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <TrendingUp size={14} /> Volume de Visitantes / Fluxo
        </button>
      </div>

      {/* GRID DOS DESTINOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[220px]">
        {listaAtual.map((destino, index) => {
          if(IATA_MAP[destino] === "SAO" || IATA_MAP[destino] === "GRU") return null;

          const slug = slugify(destino);
          const imgUrl = `/images/destinos/${categoriaPasta}/${slug}.jpg`;
          
          const oferta = ofertasAoVivo[destino];

          let spanClass = "col-span-1";
          if (index === 0 || index === 7 || index === 14) spanClass = "col-span-1 md:col-span-2 lg:col-span-2 row-span-2"; 
          if (index === 3 || index === 11 || index === 21) spanClass = "col-span-1 md:col-span-2"; 

          return (
            <div 
              key={index}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                const codigoIata = IATA_MAP[destino] || 'RIO';
                
                if(onSelectDestination) {
                   onSelectDestination({
                      iata: codigoIata,
                      nome: destino,
                      ida: oferta?.dataIda || '',
                      volta: oferta?.dataVolta || ''
                   });
                }
              }}
              className={`${spanClass} relative rounded-3xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-2xl hover:border-orange-400 border border-transparent transition-all duration-500 bg-gray-200`}
            >
              <img 
                src={imgUrl} 
                alt={destino} 
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&auto=format&fit=crop' }} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-90 group-hover:brightness-100"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-colors"></div>

              {/* DADOS DA OFERTA (TOPO DO CARD) */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                 {carregando ? (
                    <span className="bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 border border-white/10">
                      Buscando no sistema...
                    </span>
                 ) : oferta ? (
                    <span className="bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-orange-400 shadow-sm uppercase tracking-wide">
                      <Calendar size={10}/> 
                      {formatarData(oferta.dataIda)} 
                      {oferta.dataVolta ? ` - ${formatarData(oferta.dataVolta)}` : ' (Só Ida)'}
                    </span>
                 ) : (
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                      <PlaneTakeoff size={10}/> Partida de São Paulo
                    </span>
                 )}
              </div>

              {/* INFORMAÇÕES DE DESTINO E PREÇO (RODAPÉ DO CARD) */}
              <div className="absolute bottom-0 left-0 right-0 p-5 flex justify-between items-end text-white">
                 <div>
                    <h3 className="text-xl md:text-2xl font-black tracking-tight drop-shadow-md leading-none mb-1">{destino}</h3>
                    
                    <div className="mt-1 min-h-[20px]">
                        {!carregando && oferta ? (
                            <p className="text-[12px] font-bold text-gray-200 drop-shadow mt-1">
                              {oferta.noites} noites a partir de <span className="text-white text-base md:text-lg font-black tracking-tight ml-1">R$ {oferta.preco.toLocaleString('pt-BR')}</span>
                            </p>
                        ) : !carregando && !oferta ? (
                            <p className="text-[11px] font-bold text-gray-300 drop-shadow mt-1">
                              Toque para consultar datas ativas
                            </p>
                        ) : null}
                    </div>
                 </div>
                 
                 <div className="w-10 h-10 bg-white/20 hover:bg-orange-600 backdrop-blur-md rounded-full flex items-center justify-center transition-colors shadow-lg border border-white/20 flex-shrink-0">
                    <ArrowRight size={18} className="text-white -rotate-45 group-hover:rotate-0 transition-transform duration-300"/>
                 </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}