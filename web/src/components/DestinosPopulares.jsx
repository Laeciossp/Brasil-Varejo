import React, { useState, useEffect } from 'react';
import { MapPin, Globe, Award, TrendingUp, ArrowRight, RefreshCw, Calendar } from 'lucide-react';

const WORKER_URL = "https://palastore-flights-api.laeciossp.workers.dev";

// Mapeamento Inteligente: Nome Turístico -> Código IATA do Aeroporto mais próximo
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
  "Paris": "PAR", "Roma": "ROM", "Londres": "LON", "Nova York": "NYC", "Tóquio": "TYO",
  "Barcelona": "BCN", "Amsterdã": "AMS", "Lisboa": "LIS", "Florença": "FLR", "Veneza": "VCE",
  "Quioto": "UKY", "Cairo": "CAI", "Atenas": "ATH", "Machu Picchu": "CUZ", "Istambul": "IST",
  "Sidney": "SYD", "Dubai": "DXB", "Bangkok": "BKK", "Singapura": "SIN", "Bali": "DPS",
  "Praga": "PRG", "Cidade do Cabo": "CPT", "Buenos Aires": "BUE", "Milão": "MIL", "Sevilha": "SVQ",
  "Reykjavík": "REK", "Viena": "VIE", "Munique": "MUC", "Marrakech": "RAK", "Palma de Maiorca": "PMI",
  "Kuala Lumpur": "KUL", "Seul": "SEL", "Meca": "JED", "Phuket": "HKT", "Xangai": "SHA",
  "Hong Kong": "HKG", "Antália": "AYT", "Osaka": "OSA", "Cancún": "CUN", "Las Vegas": "LAS",
  "Miami": "MIA", "Los Angeles": "LAX", "Berlim": "BER", "Pattaya": "UTP", "Tokyo": "TYO", "Amsterdam": "AMS", "Florence": "FLR", "Kyoto": "UKY", "Istanbul": "IST", "Sydney": "SYD", "Singapore": "SIN", "Cape Town": "CPT", "Milan": "MIL", "Seville": "SVQ", "Reykjavik": "REK", "Munich": "MUC", "Palma de Mallorca": "PMI", "Seoul": "SEL", "Mecca": "JED", "Shanghai": "SHA", "Antalya": "AYT", "Cancun": "CUN", "Berlin": "BER"
};

export default function DestinosPopulares({ onSelectDestination }) {
  const [tipoDestino, setTipoDestino] = useState('nacional'); 
  const [criterio, setCriterio] = useState('relevancia'); 
  const [cachePrecos, setCachePrecos] = useState({}); // Armazena os preços dinâmicos

  // DADOS EXTRAÍDOS DO PDF OFICIAL COM TODOS OS 120 DESTINOS (Limpos sem a sigla do estado para facilitar as imagens)
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
        "Paris", "Roma", "Londres", "Nova York", "Tokyo", "Barcelona", "Amsterdam", "Lisboa", "Florence", "Veneza", "Kyoto", "Cairo", "Atenas", "Machu Picchu", "Istanbul", "Sydney", "Dubai", "Bangkok", "Singapore", "Bali", "Praga", "Cape Town", "Rio de Janeiro", "Buenos Aires", "Milan", "Seville", "Reykjavik", "Viena", "Munich", "Marrakech"
      ],
      fluxo: [
        "Bangkok", "Paris", "Londres", "Dubai", "Singapore", "Palma de Mallorca", "Kuala Lumpur", "Istanbul", "Tokyo", "Antalya", "Seoul", "Mecca", "Phuket", "Roma", "Barcelona", "Pattaya", "Shanghai", "Hong Kong", "Milan", "Nova York", "Amsterdam", "Antalya", "Viena", "Osaka", "Cancun", "Las Vegas", "Miami", "Los Angeles", "Lisboa", "Berlin"
      ]
    }
  };

  const listaAtual = dadosDestinos[tipoDestino][criterio];
  const categoriaPasta = tipoDestino === 'nacional' ? 'nacionais' : 'internacionais';

  const slugify = (text) => text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  // MOTOR DINÂMICO DE PREÇOS (IGUAL A KIWI)
  useEffect(() => {
    let isMounted = true;

    const fetchTarifasAoVivo = async () => {
      const hojeStr = new Date().toISOString().split('T')[0];
      const daquiUmAnoDate = new Date();
      daquiUmAnoDate.setFullYear(daquiUmAnoDate.getFullYear() + 1);
      const daquiUmAnoStr = daquiUmAnoDate.toISOString().split('T')[0];

      // Percorre os 30 destinos da lista atual
      for (const destino of listaAtual) {
        if (!isMounted) break;
        
        // Se já carregou ou está carregando, pula (Cache para não sobrecarregar API)
        if (cachePrecos[destino]) continue;

        const iata = IATA_MAP[destino];
        if (!iata) {
           setCachePrecos(prev => ({...prev, [destino]: { erro: true }}));
           continue;
        }

        // Marca como carregando
        setCachePrecos(prev => ({...prev, [destino]: { loading: true }}));

        try {
          // Busca o trecho mais barato (Só Ida para facilitar a oferta promocional base) num raio de 1 ano
          const url = `${WORKER_URL}/search-flights?origin=SAO&destination=${iata}&dateFrom=${hojeStr}&dateToRange=${daquiUmAnoStr}&adults=1&sort=price&max_stopovers=1`;
          const res = await fetch(url);
          const data = await res.json();

          if (data.status === 'success' && data.voos?.length > 0) {
             const melhorVoo = data.voos[0];
             const dataSaidaFormatada = new Date(melhorVoo.ida.partida).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
             
             if (isMounted) {
                setCachePrecos(prev => ({...prev, [destino]: { preco: melhorVoo.precoFinal, data: dataSaidaFormatada, loading: false }}));
             }
          } else {
             if (isMounted) setCachePrecos(prev => ({...prev, [destino]: { erro: true, loading: false }}));
          }
        } catch (e) {
          if (isMounted) setCachePrecos(prev => ({...prev, [destino]: { erro: true, loading: false }}));
        }

        // Pausa de 800ms entre as chamadas para respeitar o Rate Limit da API da Kiwi/Tequila
        await new Promise(r => setTimeout(r, 800));
      }
    };

    fetchTarifasAoVivo();

    return () => { isMounted = false; };
  }, [tipoDestino, criterio, listaAtual]);

  return (
    <div className="w-full py-6 animate-in fade-in duration-500">
      
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight italic">
          Descubra o Mundo
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Ranking oficial baseado em relevância turística e fluxo de visitantes
        </p>
      </div>

      <div className="flex justify-center gap-3 mb-6">
        <button 
          onClick={() => setTipoDestino('nacional')}
          className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${tipoDestino === 'nacional' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <MapPin size={16} /> Dentro do Brasil
        </button>
        <button 
          onClick={() => setTipoDestino('internacional')}
          className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${tipoDestino === 'internacional' ? 'bg-purple-700 text-white shadow-lg shadow-purple-700/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Globe size={16} /> Mundo Afora
        </button>
      </div>

      <div className="flex justify-center gap-4 mb-10 text-xs font-bold flex-wrap">
        <button 
          onClick={() => setCriterio('relevancia')}
          className={`pb-1 border-b-2 transition-all flex items-center gap-1 ${criterio === 'relevancia' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <Award size={14} /> Atração Turística / Relevância
        </button>
        <button 
          onClick={() => setCriterio('fluxo')}
          className={`pb-1 border-b-2 transition-all flex items-center gap-1 ${criterio === 'fluxo' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <TrendingUp size={14} /> Volume de Visitantes / Fluxo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[220px]">
        {listaAtual.map((destino, index) => {
          const slug = slugify(destino);
          const imgUrl = `/images/destinos/${categoriaPasta}/${slug}.jpg`;
          
          // Dados de cache (Preços Dinâmicos)
          const info = cachePrecos[destino];
          const isLoading = !info || info.loading;
          const hasError = info && info.erro;

          // Padrão visual do Bento Grid
          let spanClass = "col-span-1";
          if (index === 0 || index === 7 || index === 14) spanClass = "col-span-1 md:col-span-2 lg:col-span-2 row-span-2"; 
          if (index === 3 || index === 11 || index === 21) spanClass = "col-span-1 md:col-span-2"; 

          return (
            <div 
              key={index}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if(onSelectDestination) onSelectDestination(IATA_MAP[destino] || destino);
              }}
              className={`${spanClass} relative rounded-3xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-2xl hover:border-orange-400 border border-transparent transition-all duration-500`}
            >
              <img 
                src={imgUrl} 
                alt={destino} 
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&auto=format&fit=crop' }} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-90 group-hover:brightness-100"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-colors"></div>

              <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                 {isLoading && (
                    <span className="bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 border border-white/10 shadow-sm">
                      <RefreshCw size={10} className="animate-spin"/> Buscando tarifas...
                    </span>
                 )}
                 {!isLoading && !hasError && info.data && (
                    <span className="bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 border border-orange-400 shadow-sm">
                      <Calendar size={10}/> Partida: {info.data}
                    </span>
                 )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-5 flex justify-between items-end text-white">
                 <div>
                    <h3 className="text-xl md:text-2xl font-black tracking-tight drop-shadow-md leading-none">{destino}</h3>
                    <div className="mt-1 min-h-[20px]">
                        {!isLoading && !hasError && info.preco && (
                          <p className="text-[11px] font-bold text-gray-200 drop-shadow">
                            Voo a partir de <span className="text-green-400 text-base md:text-lg font-black tracking-tight">R$ {info.preco}</span>
                          </p>
                        )}
                        {!isLoading && hasError && (
                          <p className="text-[11px] font-bold text-orange-200 drop-shadow">
                            Toque para pesquisar opções
                          </p>
                        )}
                    </div>
                 </div>
                 
                 <div className="w-10 h-10 bg-white/20 hover:bg-orange-600 backdrop-blur-md rounded-full flex items-center justify-center transition-colors">
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