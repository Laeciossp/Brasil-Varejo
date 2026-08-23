import React, { useEffect, useState } from 'react';
import { createClient } from "@sanity/client";
import imageUrlBuilder from '@sanity/image-url';
import { ChevronLeft, ChevronRight, ArrowRight, Play, Pause } from 'lucide-react'; 
import ViagensPage from './ViagensPage'; // A injeção da sua central de viagens!

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false, 
  apiVersion: '2024-01-01',
});

const builder = imageUrlBuilder(client);
function urlFor(source) {
  return source ? builder.image(source).url() : '';
}

// ==========================================
// COMPONENTE: HERO BANNER (TOPO)
// ==========================================
const HeroBlock = ({ data }) => {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); 
  const slides = data.slides || [];

  useEffect(() => {
    if (slides.length <= 1 || !isPlaying) return;
    const timer = setInterval(() => {
      setCurrent(c => (c === slides.length - 1 ? 0 : c + 1));
    }, 6000); // Passa o slide a cada 6 segundos
    return () => clearInterval(timer);
  }, [slides.length, isPlaying]);

  const nextSlide = () => {
    setCurrent(c => (c === slides.length - 1 ? 0 : c + 1));
    setIsPlaying(false); 
  };

  const prevSlide = () => {
    setCurrent(c => (c === 0 ? slides.length - 1 : c - 1));
    setIsPlaying(false); 
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  if (!slides.length) return null;

  return (
    <div className="relative w-full h-[350px] md:h-[650px] overflow-hidden group bg-gray-100">
      <div 
        className="flex transition-transform duration-700 ease-out h-full" 
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, idx) => {
          let positionClasses = "items-center justify-center text-center"; 
          if (slide.textPosition === 'left') positionClasses = "items-center justify-start text-left pl-10 md:pl-20";
          if (slide.textPosition === 'right') positionClasses = "items-center justify-end text-right pr-10 md:pr-20";
          if (slide.textPosition === 'bottom') positionClasses = "items-end justify-center text-center pb-10 md:pb-20";
          if (slide.textPosition === 'top') positionClasses = "items-start justify-center text-center pt-10 md:pt-20";

          const textColorClass = slide.textColor === 'black' ? 'text-gray-900' : 'text-white';
          const btnColorClass = slide.textColor === 'black' 
            ? 'bg-gray-900 text-white hover:bg-gray-700' 
            : 'bg-white text-gray-900 hover:bg-gray-100';

          const MediaContent = (
            <>
              {slide.mediaType === 'video' && slide.videoUrl ? (
                /* ESTRUTURA BLINDADA PARA VÍDEO EM LOOP PERFEITO */
                <video 
                  key={slide.videoUrl}
                  className="w-full h-full object-cover pointer-events-none" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  defaultMuted
                >
                  <source src={slide.videoUrl} type="video/mp4" />
                </video>
              ) : (
                <img 
                  src={urlFor(slide.image)} 
                  alt={slide.headline} 
                  className="w-full h-full object-cover object-top" 
                />
              )}
              {slide.layoutStyle === 'overlay' && slide.textColor === 'white' && (
                <div className="absolute inset-0 bg-black/30"></div>
              )}
            </>
          );

          const Media = slide.link ? (
            <a href={slide.link} className="block w-full h-full cursor-pointer">
              {MediaContent}
            </a>
          ) : (
            <div className="w-full h-full">
              {MediaContent}
            </div>
          );

          if (slide.layoutStyle === 'split-left' || slide.layoutStyle === 'split-right') {
            const isTextLeft = slide.layoutStyle === 'split-left';
            return (
              <div key={idx} className="min-w-full h-full flex flex-col md:flex-row bg-white">
                <div className={`w-full md:w-1/2 p-10 flex flex-col justify-center items-start ${isTextLeft ? 'order-1' : 'order-2'}`}>
                   <h2 className="text-3xl md:text-5xl font-black mb-4 text-gray-900 leading-tight">
                     {slide.headline}
                   </h2>
                   {slide.subheadline && <p className="text-lg text-gray-600 mb-8 max-w-md">{slide.subheadline}</p>}
                   {slide.buttonText && (
                     <a href={slide.link || '#'} className="px-8 py-3 bg-purple-600 text-white font-bold rounded-full hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg">
                       {slide.buttonText} <ArrowRight size={20}/>
                     </a>
                   )}
                </div>
                <div className={`w-full md:w-1/2 h-full relative ${isTextLeft ? 'order-2' : 'order-1'}`}>
                   {Media}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="min-w-full h-full relative">
              <div className="absolute inset-0 w-full h-full">{Media}</div>
              {(slide.headline || slide.buttonText) && (
                <div className={`absolute inset-0 flex p-6 ${positionClasses} pointer-events-none`}>
                  <div className={`max-w-3xl ${textColorClass} animate-in fade-in slide-in-from-bottom-4 duration-700 pointer-events-auto`}>
                    {slide.headline && <h2 className="text-3xl md:text-5xl font-black mb-4 drop-shadow-md leading-tight">{slide.headline}</h2>}
                    {slide.subheadline && <p className="text-lg md:text-xl font-medium mb-6 opacity-90 drop-shadow-sm">{slide.subheadline}</p>}
                    {slide.buttonText && (
                      <a href={slide.link || '#'} className={`inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105 ${btnColorClass}`}>
                        {slide.buttonText}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/90 backdrop-blur-md text-white hover:text-purple-900 shadow-lg transition-all opacity-0 group-hover:opacity-100 z-50 cursor-pointer"
      >
        <ChevronLeft size={28} />
      </button>
      
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/90 backdrop-blur-md text-white hover:text-purple-900 shadow-lg transition-all opacity-0 group-hover:opacity-100 z-50 cursor-pointer"
      >
        <ChevronRight size={28} />
      </button>

      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 pointer-events-none z-50">
        <button 
          onClick={togglePlay}
          className="pointer-events-auto p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all shadow-sm cursor-pointer"
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>

        <div className="flex gap-2 pointer-events-auto bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
          {slides.map((_, idx) => (
            <button 
              key={idx} 
              onClick={() => { setCurrent(idx); setIsPlaying(false); }}
              className={`h-2 rounded-full transition-all duration-300 shadow-sm cursor-pointer ${current === idx ? 'bg-white w-8' : 'bg-white/50 w-2 hover:bg-white'}`} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// HOME: AGÊNCIA PURA DE VIAGENS
// ==========================================
export default function Home() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscamos apenas o Hero do Sanity, ignorando as antigas sessões de varejo
    const query = `*[_type == "homePage"][0]{
      pageBuilder[]{
        _type, _key,
        _type == "hero" => { 
          slides[]{ 
            title, mediaType, image, 
            "videoUrl": videoFile.asset->url, 
            link,
            headline, subheadline, buttonText, layoutStyle, textPosition, textColor
          } 
        }
      }
    }`;

    client.fetch(query)
      .then((data) => {
        setPageData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro Sanity:", err);
        setLoading(false);
      });
  }, []); 

  if (loading) return <div className="p-10 text-center flex justify-center h-screen items-center"><div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>;
   
  if (!pageData?.pageBuilder) return (
    <div className="p-10 text-center max-w-lg mx-auto mt-10 border-2 border-dashed border-gray-300 rounded-xl">
      <h2 className="text-xl font-bold text-gray-700 mb-2">Aguardando Configuração</h2>
      <p className="text-gray-500">Configure o Banner Principal no painel do Sanity.</p>
    </div>
  );

  return (
    <div className="w-full bg-gray-50 min-h-screen pb-20">
      
      {/* 1. RENDERIZA APENAS O SLIDER/BANNER DO TOPO */}
      {pageData.pageBuilder
        .filter((section) => section._type === 'hero')
        .map((section) => (
          <HeroBlock key={section._key} data={section} />
      ))}

      {/* 2. INJETA A PÁGINA DE VIAGENS IMEDIATAMENTE ABAIXO DO BANNER */}
      <div className="-mt-8 relative z-10">
         <ViagensPage />
      </div>

    </div>
  );
}