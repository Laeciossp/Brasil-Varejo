import React, { useState, useEffect } from 'react';
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

export default function CruzeirosTematicos() {
  const [ofertas, setOfertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [ofertaAtiva, setOfertaAtiva] = useState(null);
  const [storyIndex, setStoryIndex] = useState(0);

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
        console.error("Erro ao buscar cruzeiros temáticos:", error);
        if (montado) setCarregando(false);
      }
    };

    buscarOfertas();

    return () => {
      montado = false;
    };
  }, []);

  const abrirWhatsApp = (titulo, origem) => {
    const telefone = "5571983810420";
    const textoOrigem = origem === 'modal' ? 'o story sobre a oferta' : 'a oferta';
    const mensagem = encodeURIComponent(`Olá! Vi ${textoOrigem}: *${titulo}* e quero mais detalhes!`);
    const link = `https://wa.me/${telefone}?text=${mensagem}`;
    window.open(link, '_blank');
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

  const prevStory = (e) => {
    e.stopPropagation();
    if (storyIndex > 0) setStoryIndex(storyIndex - 1);
  };

  const nextStory = (e, totalStories) => {
    e.stopPropagation();
    if (storyIndex < totalStories - 1) setStoryIndex(storyIndex + 1);
  };

  const storiesAtivos = ofertaAtiva?.stories?.length > 0 
    ? ofertaAtiva.stories 
    : ofertaAtiva ? [{ tipo: 'imagem', imagemUrl: ofertaAtiva.capaUrl }] : [];

  return (
    <div className="w-full flex flex-col pb-16">
      
      {/* Cabeçalho */}
      <div className="w-full bg-[#2c3e50] text-white py-12 px-4 rounded-3xl shadow-md text-center relative overflow-hidden mb-10">
        <div className="absolute inset-0 opacity-10 flex justify-center items-center">
            <Ship size={250} />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center">
            <PartyPopper size={48} className="text-[#f39c12] mb-3 animate-bounce" />
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-wider mb-2">Cruzeiros Temáticos</h1>
            <p className="text-sm md:text-lg text-gray-300 font-medium max-w-2xl">
              As melhores festas, festivais e encontros em alto-mar. Garanta sua cabine antes que esgote!
            </p>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="w-full max-w-7xl mx-auto px-2">
        
        {carregando ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Ship size={54} className="text-gray-300 animate-pulse mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Carregando as melhores festas...</p>
          </div>
        ) : ofertas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-xl shadow-sm border border-gray-200">
            <Ship size={64} className="text-gray-200 mb-4" />
            <h3 className="text-xl font-black text-gray-800 uppercase">Nenhuma festa no radar</h3>
            <p className="text-gray-500 font-medium">As ofertas temáticas ainda não foram carregadas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {ofertas.map((oferta) => (
              <div 
                key={oferta._id} 
                className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => abrirStory(oferta)}
              >
                {/* Imagem do Card */}
                <div className="relative w-full h-80 bg-gray-100">
                  {oferta.capaUrl ? (
                    <img 
                      src={oferta.capaUrl} 
                      alt={oferta.titulo} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Ship className="text-gray-300" size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>

                {/* Área de Texto e Botão */}
                <div className="p-5 flex flex-col flex-1 bg-white z-10 -mt-2 rounded-t-2xl relative">
                  <h3 className="text-[15px] font-black text-[#2c3e50] uppercase tracking-tight leading-snug mb-4 flex-1 text-center min-h-[45px] flex items-center justify-center">
                    {oferta.titulo}
                  </h3>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirWhatsApp(oferta.titulo, 'card');
                    }}
                    className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-sm py-3.5 px-4 rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    <MessageCircle size={18} /> Cotar Agora
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RENDERIZAÇÃO DO MODAL VIA PORTAL DIRETAMENTE NO BODY (SOBREPÕE TUDO) */}
      {ofertaAtiva && createPortal(
        <div 
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 backdrop-blur-md w-screen h-screen"
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', margin: 0, padding: 0 }}
          onClick={fecharStory}
        >
          
          {/* Controles Superiores */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-[1000000]" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={fecharStory}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-colors shadow-2xl cursor-pointer"
            >
              <ArrowLeft size={18} /> Voltar às Ofertas
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

          {/* Container de Mídia Centralizado */}
          <div className="relative w-full max-w-md h-[78vh] sm:h-[85vh] flex items-center justify-center my-auto" onClick={(e) => e.stopPropagation()}>
            
            {/* Navegação Esquerda */}
            {storyIndex > 0 && (
              <button 
                onClick={(e) => prevStory(e)}
                className="absolute -left-4 sm:-left-12 z-[1000000] bg-white/20 text-white p-3 rounded-full hover:bg-white/40 transition-colors shadow-2xl cursor-pointer"
              >
                <ChevronLeft size={32} />
              </button>
            )}

            {/* Mídia (Foto ou Vídeo) */}
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

            {/* Navegação Direita */}
            {storyIndex < storiesAtivos.length - 1 && (
              <button 
                onClick={(e) => nextStory(e, storiesAtivos.length)}
                className="absolute -right-4 sm:-right-12 z-[1000000] bg-white/20 text-white p-3 rounded-full hover:bg-white/40 transition-colors shadow-2xl cursor-pointer"
              >
                <ChevronRight size={32} />
              </button>
            )}

          </div>

          {/* Botão Cotar Agora no Story */}
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