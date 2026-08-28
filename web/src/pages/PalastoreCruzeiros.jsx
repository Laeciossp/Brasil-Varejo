import React, { useState, useEffect } from 'react';
import { Ship, Search, Calendar, MessageCircle, CheckCircle, X, Maximize2 } from 'lucide-react';
import { createClient } from "@sanity/client";

// ==============================================================
// 1. CONEXÃO COM O SANITY
// ==============================================================
const sanityClient = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

const normalize = (s) => s ? String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim() : "";

// ==============================================================
// 🪄 RASTREADOR DE NAVIO (CHAVE MESTRA)
// ==============================================================
const getSanityShip = (cruzeiro, sanityNavios) => {
  if (!cruzeiro.navioId) return null;
  return sanityNavios.find(s => 
    s.codigoOperadora && 
    String(s.codigoOperadora).trim().toUpperCase() === String(cruzeiro.navioId).trim().toUpperCase()
  );
};

const hoje = new Date();
const daqui60dias = new Date(); daqui60dias.setDate(hoje.getDate() + 60);
const daqui1Ano = new Date(); daqui1Ano.setFullYear(hoje.getFullYear() + 1);
const formataData = (d) => d.toISOString().split('T')[0];

export default function PalastoreCruzeiros() {
  const [sanityNavios, setSanityNavios] = useState([]); 
  const [todosCruzeiros, setTodosCruzeiros] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [filtros, setFiltros] = useState({
    companhia: '', navio: '', destino: '', portoEmbarque: '', duracao: '',
    dataInicio: formataData(hoje), dataFim: formataData(daqui60dias), 
    adultos: 2, criancas: 0, qualquerData: false
  });

  const [etapa, setEtapa] = useState(1); 
  const [cruzeiroAtivo, setCruzeiroAtivo] = useState(null);
  const [imagemModal, setImagemModal] = useState(null);

  useEffect(() => {
    let montado = true;
    const inicializarCatalogo = async () => {
      try {
        const query = `*[_type == "navio"] {
          nome, companhia, codigoOperadora, "imagemPrincipal": imagemPrincipal.asset->url,
          categoriasCabine[] { nomeAmigavel, descricaoLimpa, "imagemHD": imagemHD.asset->url, variacoes[] { codigo } }
        }`;
        const naviosDoBanco = await sanityClient.fetch(query);
        if (montado) setSanityNavios(naviosDoBanco);

        const payload = { 
          dataInicio: formataData(hoje), dataFim: formataData(daqui60dias), 
          adultos: "2", idadeCriancas: null 
        };

        const response = await fetch('https://southamerica-east1-palastore-turismo.cloudfunctions.net/buscarCruzeiros', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if (montado) {
          if (data.sucesso) setTodosCruzeiros(data.cruzeiros);
          else setTodosCruzeiros([]);
          setCarregando(false);
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
        if (montado) setCarregando(false);
      }
    };
    inicializarCatalogo();
    return () => { montado = false };
  }, []);

  const realizarBuscaManual = async () => {
    setCarregando(true);
    try {
      const dInicio = filtros.qualquerData ? formataData(hoje) : filtros.dataInicio;
      const dFim = filtros.qualquerData ? formataData(daqui1Ano) : filtros.dataFim;

      const payload = { 
        dataInicio: dInicio, dataFim: dFim, 
        adultos: filtros.adultos.toString(), idadeCriancas: filtros.criancas > 0 ? "5" : null 
      };

      const response = await fetch('https://southamerica-east1-palastore-turismo.cloudfunctions.net/buscarCruzeiros', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.sucesso) setTodosCruzeiros(data.cruzeiros);
      else setTodosCruzeiros([]);
    } catch (error) {
      console.error("Erro na API:", error);
      setTodosCruzeiros([]);
    } finally {
      setCarregando(false);
    }
  };

  // ==============================================================
  // 🌍 DICIONÁRIOS GIGANTES HARDCODED (À PROVA DE FALHAS)
  // ==============================================================
  const DICIONARIO_DESTINOS = {
    'CARIBE': 'Caribe', 'CARIBE ORIENTAL': 'Caribe Oriental', 'CARIBE OCIDENTAL': 'Caribe Ocidental',
    'CARIBE DO SUL': 'Caribe do Sul', 'BAHAMAS': 'Bahamas', 'AMERICA DO SUL': 'América do Sul',
    'MEDITERRANEO': 'Mediterrâneo', 'NORTE DA EUROPA': 'Norte da Europa', 'ALASCA': 'Alasca',
    'ASIA': 'Ásia', 'AUSTRALIA E NOVA ZELANDIA': 'Austrália e N. Zelândia', 'BERMUDAS': 'Bermudas',
    'CANADA E NOVA INGLATERRA': 'Canadá / N. Inglaterra', 'HAVAI': 'Havaí', 'CANAL DO PANAMA': 'Canal do Panamá',
    'TRANSATLANTICO': 'Travessia Transatlântica', 'ORIENTE MEDIO': 'Oriente Médio'
  };

  const DICIONARIO_PORTOS = {
    'SSZ': 'Santos', 'SANTOS': 'Santos',
    'GIG': 'Rio de Janeiro', 'RIO DE JANEIRO': 'Rio de Janeiro', 'RIO': 'Rio de Janeiro',
    'SSA': 'Salvador', 'SALVADOR': 'Salvador',
    'ITJ': 'Itajaí', 'ITAJAI': 'Itajaí',
    'MCZ': 'Maceió', 'MACEIO': 'Maceió',
    'REC': 'Recife', 'RECIFE': 'Recife',
    'BUE': 'Buenos Aires', 'BUENOS AIRES': 'Buenos Aires',
    'MVD': 'Montevidéu', 'MONTEVIDEO': 'Montevidéu',
    'MIA': 'Miami', 'MIAMI': 'Miami',
    'FLL': 'Fort Lauderdale', 'FORT LAUDERDALE': 'Fort Lauderdale',
    'PCN': 'Port Canaveral', 'PORT CANAVERAL': 'Port Canaveral',
    'ROM': 'Roma (Civitavecchia)', 'CIVITAVECCHIA': 'Roma (Civitavecchia)',
    'BCN': 'Barcelona', 'BARCELONA': 'Barcelona',
    'LAX': 'Los Angeles', 'LOS ANGELES': 'Los Angeles',
    'GAL': 'Galveston', 'GALVESTON': 'Galveston',
    'KEL': 'Kiel', 'KIEL': 'Kiel',
    'GEN': 'Gênova', 'GENOA': 'Gênova', 'GENOVA': 'Gênova',
    'VEN': 'Veneza', 'VENICE': 'Veneza',
    'NAP': 'Nápoles', 'NAPLES': 'Nápoles',
    'MRS': 'Marselha', 'MARSEILLE': 'Marselha',
    'DXB': 'Dubai', 'DUBAI': 'Dubai'
  };

  const traduzirPorto = (codigoBruto) => {
    if (!codigoBruto) return 'Porto Indefinido';
    const limpo = String(codigoBruto).trim().toUpperCase();
    return DICIONARIO_PORTOS[limpo] || codigoBruto; 
  };

  const companhiasUnicas = [...new Set(sanityNavios.map(n => n.companhia))].filter(Boolean).sort();
  const naviosUnicos = [...new Set(sanityNavios.map(n => n.nome))].filter(Boolean).sort();
  
  // A LISTA DE PORTOS DO MENU AGORA É FIXA (Garante que nunca fique vazia)
  const listaDePortosFixa = [...new Set(Object.values(DICIONARIO_PORTOS))].sort();

  // ==============================================================
  // 🔍 FILTRO COMPLETO 
  // ==============================================================
  const cruzeirosFiltrados = todosCruzeiros.filter(c => {
    const navioSanity = getSanityShip(c, sanityNavios);
    const compAPI = normalize(navioSanity ? navioSanity.companhia : (c.companhiaNome || c.companhia));
    const navAPI = normalize(navioSanity ? navioSanity.nome : (c.navioNome || c.navio));
    
    // A mágica acontece aqui: A comparação é feita com o porto já traduzido
    const portoCruzeiro = traduzirPorto(c.portoEmbarque);
    
    const textoPesquisaDestino = normalize((c.destino || '') + ' ' + (c.regiao || '') + ' ' + (c.nomeRoteiro || ''));

    const filtroNav = normalize(filtros.navio);
    const filtroComp = normalize(filtros.companhia);
    const filtroDuracao = filtros.duracao;
    const filtroDest = normalize(filtros.destino);

    if (filtroComp && !compAPI.includes(filtroComp)) return false;
    if (filtroNav && navAPI !== filtroNav && !navAPI.includes(filtroNav)) return false;
    
    if (filtros.portoEmbarque && portoCruzeiro !== filtros.portoEmbarque) return false;
    if (filtroDest && !textoPesquisaDestino.includes(filtroDest)) return false;
    
    if (filtroDuracao) {
      const noites = parseInt(c.noites, 10);
      if (filtroDuracao === '1-3' && (noites < 1 || noites > 3)) return false;
      if (filtroDuracao === '4-6' && (noites < 4 || noites > 6)) return false;
      if (filtroDuracao === '7-9' && (noites < 7 || noites > 9)) return false;
      if (filtroDuracao === '10+' && noites < 10) return false;
    }
    
    return true;
  });

  const selecionarCruzeiro = (cruzeiro) => { setCruzeiroAtivo(cruzeiro); setEtapa(2); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // ==============================================================
  // 🧩 RENDERIZAÇÃO DA MATRIZ E BOTÕES DO WHATSAPP
  // ==============================================================
  const renderizarTabelaMatriz = () => {
    if (!cruzeiroAtivo) return null;
    const navioSanity = getSanityShip(cruzeiroAtivo, sanityNavios);

    if (!navioSanity || !navioSanity.categoriasCabine) {
      return (
        <div className="w-full bg-white border border-gray-200 mt-6 shadow-sm p-8 text-center rounded-lg">
          <Ship className="mx-auto text-gray-300 mb-3" size={40}/>
          <p className="text-gray-500 font-bold uppercase tracking-wider text-sm">O visual das cabines deste navio ainda não foi sincronizado.</p>
        </div>
      );
    }

    const tiposTarifa = [...new Set(cruzeiroAtivo.cabinesDisponiveis.map(c => c.nomeTarifa))];

    return (
      <div className="w-full bg-white border border-gray-200 mt-6 shadow-sm text-sm rounded-b-lg">
        <div className="flex bg-[#2c3e50] text-white font-bold uppercase text-[10px] tracking-wider rounded-t-lg">
          <div className="w-2/5 p-4 border-r border-gray-600">Acomodações do Catálogo</div>
          {tiposTarifa.map(tarifa => (<div key={tarifa} className="flex-1 p-4 text-center border-r border-gray-600 truncate">{tarifa}</div>))}
        </div>

        {navioSanity.categoriasCabine.map((catSanity, idx) => {
          
          const ofertasDestaCabine = cruzeiroAtivo.cabinesDisponiveis.filter(apiCab => {
            const sName = normalize(catSanity.nomeAmigavel);
            const aName = normalize(apiCab.nomeCategoria);
            const aType = normalize(apiCab.tipoCabine || "");

            const temCodigoValido = catSanity.variacoes?.some(v => v.codigo && normalize(v.codigo) !== 'standard' && normalize(v.codigo) === normalize(apiCab.codigoCategoria));
            if (temCodigoValido) return true;

            if (aName === sName || aName.includes(sName) || sName.includes(aName)) return true;

            const isInterna = sName.includes('interna');
            const isVaranda = sName.includes('varanda') || sName.includes('balcony');
            const isExterna = sName.includes('externa') || sName.includes('vista') || sName.includes('mar');
            const isSuite = sName.includes('suite');

            const apiIsInterna = aName.includes('interna') || aType.includes('interna');
            const apiIsVaranda = aName.includes('varanda') || aType.includes('varanda') || aName.includes('balcony');
            const apiIsExterna = aName.includes('externa') || aType.includes('externa') || aName.includes('ocean');
            const apiIsSuite = aName.includes('suite') || aType.includes('suite');

            if (isInterna && apiIsInterna) return true;
            if (isVaranda && apiIsVaranda) return true; 
            if (isExterna && !isVaranda && apiIsExterna) return true;
            if (isSuite && apiIsSuite) return true;

            return false;
          });

          return (
            <div key={idx} className="flex border-b border-gray-200 hover:bg-gray-50 transition items-stretch">
              
              <div className="w-2/5 p-5 border-r border-gray-200 flex gap-5 items-start">
                {catSanity.imagemHD ? (
                  <div className="relative group cursor-pointer" onClick={() => setImagemModal(catSanity.imagemHD)}>
                    <img src={catSanity.imagemHD} alt={catSanity.nomeAmigavel} className="w-32 h-24 object-cover border border-gray-300 shadow-sm rounded-md flex-shrink-0 group-hover:opacity-80 transition" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <div className="bg-black/50 p-1.5 rounded-full"><Maximize2 className="text-white" size={16}/></div>
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-24 bg-gray-100 flex items-center justify-center border border-gray-300 rounded-md flex-shrink-0"><Ship className="text-gray-300"/></div>
                )}
                <div>
                  <p className="font-black text-[#2c3e50] text-[14px] uppercase">{catSanity.nomeAmigavel}</p>
                  <p className="text-[12px] text-gray-500 mt-1.5 leading-relaxed text-justify line-clamp-4">{catSanity.descricaoLimpa}</p>
                </div>
              </div>
              
              {tiposTarifa.map(tarifa => {
                const temDisponibilidade = ofertasDestaCabine.some(c => c.nomeTarifa === tarifa);
                
                const wpText = encodeURIComponent(`Olá! Tenho interesse na cabine *${catSanity.nomeAmigavel}* (Tarifa: ${tarifa}) no navio *${navioSanity.nome}* para a saída de *${cruzeiroAtivo.dataEmbarque}*. Pode me passar a cotação e opções de decks?`);
                const wpLink = `https://wa.me/5571983810420?text=${wpText}`;

                return (
                  <div key={tarifa} className="flex-1 p-5 border-r border-gray-200 flex items-center justify-center relative group">
                    <div className="w-full flex flex-col items-center justify-center">
                      <a href={wpLink} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-[11px] py-3 px-4 rounded-lg w-full text-center shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-tighter">
                        <MessageCircle size={16}/> {temDisponibilidade ? "Cotar Agora" : "Verificar Disp."}
                      </a>
                      
                      {temDisponibilidade && (
                        <p className="text-[9px] text-emerald-600 mt-2 flex items-center gap-1 font-bold uppercase tracking-wider">
                          <CheckCircle size={10}/> Disponível na Palastore
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] font-sans pb-16 flex justify-center relative">
      
      {/* 🖼️ MODAL DE FOTO AMPLIADA (LIGHTBOX) */}
      {imagemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setImagemModal(null)}>
          <div className="relative max-w-5xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setImagemModal(null)} className="absolute -top-12 right-0 md:-right-12 text-white hover:text-gray-300 transition-transform active:scale-90 bg-black/50 p-2 rounded-full">
              <X size={28} />
            </button>
            <img src={imagemModal} alt="Foto Ampliada" className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-6 mt-8 px-4 items-start relative">
        
        {/* SIDEBAR COM OS FILTROS */}
        {etapa === 1 && (
          <div className="w-full lg:w-[320px] flex-shrink-0 bg-white shadow-lg border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-[#2c3e50] text-white font-black py-4 px-5 uppercase text-sm tracking-widest flex items-center gap-2">
              <Search size={18}/> Buscar Cruzeiros
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-4 mb-5">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Companhia</label>
                  <select className="w-full border-2 border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-700 bg-gray-50 outline-none focus:border-blue-500" value={filtros.companhia} onChange={(e) => setFiltros({...filtros, companhia: e.target.value})}>
                    <option value="">Todas as Companhias</option>
                    {companhiasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Navio Oficial</label>
                  <select className="w-full border-2 border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-700 bg-gray-50 outline-none focus:border-blue-500" value={filtros.navio} onChange={(e) => setFiltros({...filtros, navio: e.target.value})}>
                    <option value="">Todos os Navios</option>
                    {naviosUnicos.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Destino da Viagem</label>
                  <select className="w-full border-2 border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-700 bg-gray-50 outline-none focus:border-blue-500" value={filtros.destino} onChange={(e) => setFiltros({...filtros, destino: e.target.value})}>
                    <option value="">Qualquer Destino</option>
                    {Object.entries(DICIONARIO_DESTINOS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Porto de Embarque</label>
                  <select className="w-full border-2 border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-700 bg-gray-50 outline-none focus:border-blue-500" value={filtros.portoEmbarque} onChange={(e) => setFiltros({...filtros, portoEmbarque: e.target.value})}>
                    <option value="">Qualquer Porto</option>
                    {/* A LISTA DE PORTOS AGORA É FIXA (NUNCA VAI ESTAR VAZIA) */}
                    {listaDePortosFixa.map(porto => <option key={porto} value={porto}>{porto}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Duração (Noites)</label>
                  <select className="w-full border-2 border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-700 bg-gray-50 outline-none focus:border-blue-500" value={filtros.duracao} onChange={(e) => setFiltros({...filtros, duracao: e.target.value})}>
                    <option value="">Qualquer Duração</option>
                    <option value="1-3">1 a 3 noites</option>
                    <option value="4-6">4 a 6 noites</option>
                    <option value="7-9">7 a 9 noites</option>
                    <option value="10+">10 ou mais noites</option>
                  </select>
                </div>
              </div>

              <div className="mb-5 bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1"><Calendar size={14}/> Datas</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600" checked={filtros.qualquerData} onChange={(e) => setFiltros({...filtros, qualquerData: e.target.checked})} />
                    <span className="text-[10px] font-bold text-blue-700 uppercase">Qualquer momento</span>
                  </label>
                </div>
                {!filtros.qualquerData ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-blue-700 font-bold block mb-1">A PARTIR DE</label>
                      <input type="date" className="w-full border border-blue-200 rounded-lg p-1.5 text-xs font-bold text-blue-800 bg-white outline-none" value={filtros.dataInicio} onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[9px] text-blue-700 font-bold block mb-1">ATÉ</label>
                      <input type="date" className="w-full border border-blue-200 rounded-lg p-1.5 text-xs font-bold text-blue-800 bg-white outline-none" value={filtros.dataFim} onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})} />
                    </div>
                  </div>
                ) : (
                  <div className="w-full text-center py-2 bg-blue-100/50 rounded-lg border border-blue-200">
                    <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Buscando na agenda completa</p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="text-[11px] font-bold text-gray-600 uppercase mb-2 block">Hóspedes na Cabine</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg">
                    <label className="text-[10px] text-gray-500 font-semibold block text-center mb-1">Adultos</label>
                    <input type="number" min="1" max="4" className="w-full bg-transparent text-center font-bold text-gray-700 outline-none" value={filtros.adultos} onChange={(e) => setFiltros({...filtros, adultos: e.target.value})} />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg">
                    <label className="text-[10px] text-gray-500 font-semibold block text-center mb-1">Crianças</label>
                    <input type="number" min="0" max="3" className="w-full bg-transparent text-center font-bold text-gray-700 outline-none" value={filtros.criancas} onChange={(e) => setFiltros({...filtros, criancas: e.target.value})} />
                  </div>
                </div>
              </div>

              <button onClick={() => realizarBuscaManual()} disabled={carregando} className="w-full bg-[#f39c12] hover:bg-[#e67e22] text-white font-black py-3 rounded-lg text-sm uppercase flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-70">
                {carregando ? <span className="animate-pulse">Consultando...</span> : <><Search size={16}/> Pesquisar</>}
              </button>
            </div>
          </div>
        )}

        {/* ÁREA DIREITA */}
        <div className="flex-1 w-full">
          {etapa === 1 && (
            <div className="space-y-5">
              {carregando ? (
                <div className="flex flex-col items-center justify-center py-40 bg-white shadow-sm border border-gray-200 rounded-xl">
                  <Ship size={54} className="text-gray-300 animate-bounce mb-5"/>
                  <p className="text-gray-500 font-black uppercase tracking-widest text-sm">Atualizando catálogo em tempo real...</p>
                </div>
              ) : cruzeirosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 bg-white shadow-sm border border-gray-200 rounded-xl">
                  <Ship size={64} className="text-gray-200 mb-5"/>
                  <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Prateleira Vazia</h3>
                  <p className="text-gray-500 font-medium text-sm max-w-md text-center">Nenhum cruzeiro atende aos seus filtros neste período.</p>
                </div>
              ) : (
                cruzeirosFiltrados.map((cruzeiro, idx) => {
                  const navioSanity = getSanityShip(cruzeiro, sanityNavios);
                  const nomeNavioOficial = navioSanity ? navioSanity.nome : cruzeiro.navioNome || "Navio Especial";
                  const fotoListagem = navioSanity ? navioSanity.imagemPrincipal : null;
                  
                  // Usa a função de tradução no display do card
                  const portoDeEmbarqueDisplay = traduzirPorto(cruzeiro.portoEmbarque);

                  return (
                    <div key={idx} className="bg-white shadow-md border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition group">
                      <div className="flex flex-col md:flex-row p-5 items-center justify-between border-b border-gray-100 gap-4">
                        <div className="flex items-center gap-5 w-full md:w-auto">
                          
                          {/* 🖼️ FOTO DO NAVIO CLICÁVEL COM EFEITO DE LUPA */}
                          {fotoListagem ? (
                            <div className="relative group/img cursor-pointer" onClick={() => setImagemModal(fotoListagem)}>
                              <img src={fotoListagem} alt="Navio" className="w-32 h-20 object-cover border border-gray-200 rounded-lg shadow-sm group-hover/img:opacity-80 transition" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition">
                                <div className="bg-black/50 p-1 rounded-full"><Maximize2 className="text-white" size={14}/></div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-32 h-20 bg-gray-100 flex items-center justify-center border rounded-lg"><Ship className="text-gray-400"/></div>
                          )}
                          
                          <div>
                            <h3 className="text-[14px] text-gray-800 font-black uppercase tracking-wide leading-tight">{cruzeiro.nomeRoteiro}</h3>
                            <p className="text-[12px] text-gray-500 mt-1">Partindo de: <strong className="text-gray-700">{portoDeEmbarqueDisplay}</strong></p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Navio: <span className="text-blue-700 font-bold">{nomeNavioOficial}</span></p>
                          </div>
                        </div>
                        <div className="text-center px-8 border-l border-gray-200 hidden md:block">
                          <span className="text-5xl text-[#f39c12] font-light">{cruzeiro.noites}</span>
                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Noites</p>
                        </div>
                      </div>
                      <table className="w-full text-center">
                        <thead>
                          <tr className="text-[10px] text-gray-500 uppercase bg-gray-50 border-b border-gray-200 font-black tracking-wider">
                            <th className="py-3 px-5 text-left">Data de Saída</th>
                            <th className="py-3 px-2">Disponibilidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-blue-50 transition cursor-pointer" onClick={() => selecionarCruzeiro(cruzeiro)}>
                            <td className="py-4 px-5 text-sm text-[#2c3e50] font-black flex items-center gap-2 text-left">
                              <Calendar size={16} className="text-blue-500"/> {cruzeiro.dataEmbarque}
                            </td>
                            <td className="py-4"><span className="text-blue-600 text-[12px] font-black uppercase tracking-wider underline underline-offset-4">Ver Acomodações</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* RENDERIZAÇÃO DA MATRIZ DE CABINES */}
          {etapa === 2 && cruzeiroAtivo && (
            <div className="w-full relative animate-in fade-in duration-300">
              <button onClick={() => setEtapa(1)} className="text-xs text-blue-600 mb-4 hover:underline font-bold uppercase flex items-center gap-1 bg-white px-3 py-1.5 rounded shadow-sm border border-blue-100 w-fit transition active:scale-95">← Voltar</button>
              {renderizarTabelaMatriz()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}