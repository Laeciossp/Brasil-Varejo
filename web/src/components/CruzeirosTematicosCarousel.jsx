import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Ship, MessageCircle, PartyPopper, X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { createClient } from "@sanity/client";

const sanityClient = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

export default function CruzeirosTematicosCarousel() {
  const [ofertas, setOfertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [ofertaAtiva, setOfertaAtiva] = useState(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    let montado = true;
    const buscarOfertas = async () => {
      try {
        const query = `*[_type == "ofertaMarketing"]{ 
          _id, 
          titulo, 
          "capaUrl": coalesce(capa.asset->url, imagem.asset->url),
          "stories": stories[]{ 
              tipo, 
              videoUrl, 
              "imagemUrl": imagem.asset->url 
          } 
        }`;
        const dados = await sanityClient.fetch(query);
        if (montado) {
          setOfertas(dados);
          setCarregando(false);
        }
      } catch (error) {
        console.error("Erro ao buscar carrossel de cruzeiros temáticos:", error);
        if (montado) setCarregando(false);
      }
    };
    buscarOfertas();
    return () => { montado = false; };
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const offset = direction === 'left' ? -clientWidth / 2 : clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' });
    }
  };

  const abrirWhatsApp = (titulo, origem) => {
    const telefone = "5571983810420";
    const textoOrigem = origem === 'modal' ? 'o story sobre a oferta' : 'a oferta';
    const mensagem = encodeURIComponent(`Olá! Vi ${textoOrigem}: *${titulo}* e quero mais detalhes!`);
    window.open(`https://wa.me/${telefone}?text=${mensagem}`, '_blank');
  };

  const abrirStory = (oferta) => {
    setOfertaAtiva(oferta);
    setStoryIndex(0);
    document.body.style.overflow = 'hidden';
  };

  const fecharStory = () => {
    setOfertaAtiva(null);
    setStoryIndex(0);
    document.body.style.overflow = 'auto';
  };

  const prevStory = (e) => { e.stopPropagation(); if (storyIndex > 0) setStoryIndex(storyIndex - 1); };
  const nextStory = (e, total) => { e.stopPropagation(); if (storyIndex < total - 1) setStoryIndex(storyIndex + 1); };

  const storiesAtivos = ofertaAtiva?.stories?.length > 0 
    ? ofertaAtiva.stories 
    : ofertaAtiva ? [{ tipo: 'imagem', imagemUrl: ofertaAtiva.capaUrl }] : [];

  if (carregando || ofertas.length === 0) return null;

  return (
    <div className="w-full my-12 bg-gradient-to-br from-slate-900 via-[#1e293b] to-slate-900 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden border border-slate-800">
      
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none">
        <Ship size={350} className="text-white" />
      </div>

      {/* Cabeçalho do Carrossel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-amber-400 mb-1 font-bold text-xs uppercase tracking-widest">
            <PartyPopper size={16} /> Festas & Festivais em Alto-Mar
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight italic">
            Cruzeiros Temáticos Exclusivos
          </h2>
        </div>

        {/* Setas de Navegação */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => scroll('left')}
            className="bg-white/10 hover:bg-orange-500 text-white p-3 rounded-full transition-all backdrop-blur-md border border-white/10 shadow-lg active:scale-95"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="bg-white/10 hover:bg-orange-500 text-white p-3 rounded-full transition-all backdrop-blur-md border border-white/10 shadow-lg active:scale-95"
            aria-label="Rolar para direita"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Lista Horizontal (Carrossel) */}
      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 pt-2 snap-x snap-mandatory scroll-smooth relative z-10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {ofertas.map((oferta) => (
          <div
            key={oferta._id}
            onClick={() => abrirStory(oferta)}
            className="min-w-[260px] sm:min-w-[280px] md:min-w-[300px] bg-white rounded-2xl overflow-hidden shadow-xl flex-shrink-0 flex flex-col snap-start transform hover:-translate-y-2 transition-all duration-300 group cursor-pointer border border-slate-100"
          >
            {/* Foto da Capa */}
            <div className="relative w-full h-72 bg-slate-100 overflow-hidden">
              {oferta.capaUrl ? (
                <img 
                  src={oferta.capaUrl} 
                  alt={oferta.titulo} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Ship size={40} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              
              {/* Badge Stories */}
              <span className="absolute top-3 left-3 bg-orange-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider shadow-md">
                Ver Stories
              </span>
            </div>

            {/* Rodapé do Card com Título e Botão */}
            <div className="p-4 flex flex-col flex-1 justify-between bg-white">
              <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-2 mb-4 leading-snug min-h-[35px]">
                {oferta.titulo}
              </h3>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  abrirWhatsApp(oferta.titulo, 'card');
                }}
                className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-xs py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <MessageCircle size={16} /> Cotar Agora
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE STORIES VIA PORTAL (SOBREPÕE TUDO) */}
      {ofertaAtiva && createPortal(
        <div 
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 backdrop-blur-md w-screen h-screen"
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', margin: 0, padding: 0 }}
          onClick={fecharStory}
        >
          {/* Topo do Modal */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-[1000000]" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={fecharStory}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-colors shadow-2xl cursor-pointer"
            >
              <ArrowLeft size={18} /> Voltar
            </button>

            <div className="bg-black/70 text-white px-3.5 py-1.5 rounded-lg font-bold text-sm tracking-widest border border-white/20">
              {storyIndex + 1} / {storiesAtivos.length}
            </div>

            <button 
              onClick={fecharStory}
              className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full transition-colors shadow-2xl cursor-pointer flex items-center justify-center"
            >
              <X size={22} />
            </button>
          </div>

          <div className="relative w-full max-w-md h-[78vh] sm:h-[85vh] flex items-center justify-center my-auto" onClick={(e) => e.stopPropagation()}>
            {storyIndex > 0 && (
              <button 
                onClick={(e) => prevStory(e)}
                className="absolute -left-4 sm:-left-12 z-[1000000] bg-white/20 text-white p-3 rounded-full hover:bg-white/40 transition-colors shadow-2xl cursor-pointer"
              >
                <ChevronLeft size={32} />
              </button>
            )}

            <div className="w-full h-full rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-2xl border border-white/10">
              {storiesAtivos[storyIndex].tipo === 'video' ? (
                <video 
                  key={storiesAtivos[storyIndex].videoUrl}
                  src={storiesAtivos[storyIndex].videoUrl}
                  autoPlay 
                  playsInline 
                  loop 
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img 
                  src={storiesAtivos[storyIndex].imagemUrl} 
                  alt={ofertaAtiva.titulo}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {storyIndex < storiesAtivos.length - 1 && (
              <button 
                onClick={(e) => nextStory(e, storiesAtivos.length)}
                className="absolute -right-4 sm:-right-12 z-[1000000] bg-white/20 text-white p-3 rounded-full hover:bg-white/40 transition-colors shadow-2xl cursor-pointer"
              >
                <ChevronRight size={32} />
              </button>
            )}
          </div>

          <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center z-[1000000]" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => abrirWhatsApp(ofertaAtiva.titulo, 'modal')}
              className="w-full max-w-sm bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-base py-4 rounded-full shadow-2xl transition-transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              <MessageCircle size={20} /> Cotar Esta Oferta
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}