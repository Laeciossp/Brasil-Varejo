import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from "@sanity/client";
import imageUrlBuilder from '@sanity/image-url';
import { Package, ChevronLeft, ChevronRight, ArrowRight, Play, Pause, ShoppingBag, Plus } from 'lucide-react'; 
import useCartStore from '../store/useCartStore'; 

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

const formatCurrency = (value) => {
  return value ? `R$ ${value.toFixed(2).replace('.', ',')}` : 'R$ 0,00';
};

// ==========================================
// 1. COMPONENTES VISUAIS (BLOCOS)
// ==========================================

// --- Bloco A: Hero (MANTIDO COMPLETO) ---
const HeroBlock = ({ data }) => {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); 
  const slides = data.slides || [];

  useEffect(() => {
    if (slides.length <= 1 || !isPlaying) return;
    const timer = setInterval(() => {
      setCurrent(c => (c === slides.length - 1 ? 0 : c + 1));
    }, 6000);
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
    <div className="relative w-full h-[350px] md:h-[650px] overflow-hidden group mb-8 bg-gray-100">
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
                <video src={slide.videoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              ) : (
                <img 
                  src={urlFor(slide.image)} 
                  alt={slide.headline} 
                  className="w-full h-full object-cover object-top" 
                />
              )}
              {slide.layoutStyle === 'overlay' && slide.textColor === 'white' && (
                <div className="absolute inset-0 bg-black/20"></div>
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
        aria-label="Slide Anterior"
      >
        <ChevronLeft size={28} />
      </button>
      
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/90 backdrop-blur-md text-white hover:text-purple-900 shadow-lg transition-all opacity-0 group-hover:opacity-100 z-50 cursor-pointer"
        aria-label="Próximo Slide"
      >
        <ChevronRight size={28} />
      </button>

      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 pointer-events-none z-50">
        <button 
          onClick={togglePlay}
          className="pointer-events-auto p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all shadow-sm cursor-pointer"
          title={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>

        <div className="flex gap-2 pointer-events-auto bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
          {slides.map((_, idx) => (
            <button 
              key={idx} 
              onClick={() => { setCurrent(idx); setIsPlaying(false); }}
              className={`h-2 rounded-full transition-all duration-300 shadow-sm cursor-pointer ${current === idx ? 'bg-white w-8' : 'bg-white/50 w-2 hover:bg-white'}`} 
              aria-label={`Ir para slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Bloco B: Departamentos (MANTIDO COMPLETO) ---
const DepartmentsBlock = ({ data }) => {
  if (!data.items || data.items.length === 0) return null;
  return (
    <div className="max-w-[1440px] mx-auto my-10 px-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-purple-600 pl-2">{data.title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {data.items?.map((dept, idx) => (
          <a key={idx} href={dept.link} className="group flex flex-col items-center hover:-translate-y-1 transition-transform">
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-md border-2 border-white group-hover:border-purple-400 transition-colors bg-white p-2">
              <img src={urlFor(dept.image)} alt={dept.name} className="w-full h-full object-contain" />
            </div>
            <span className="mt-3 text-sm font-medium text-gray-700 group-hover:text-purple-600 text-center">{dept.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

// --- Bloco C: Banners de Destaque (MANTIDO COMPLETO) ---
const FeaturedBannersBlock = ({ data }) => {
  return (
    <div className="max-w-[1440px] mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
        {data.banners?.map((banner, idx) => (
          <a key={idx} href={banner.link} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative block border border-gray-100">
            <div className="aspect-[3/4] w-full overflow-hidden">
              <img src={urlFor(banner.image)} alt={banner.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent">
               <span className="text-white font-bold text-xl">{banner.title}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// --- Bloco D: Carrossel de Produtos (ATUALIZADO) ---
const ProductCarouselBlock = ({ data }) => {
  const rawProducts = data.products || [];
  const products = rawProducts.filter(prod => prod && prod.isActive !== false);
  const carouselRef = useRef(null);
  
  const { addItem } = useCartStore();
  const navigate = useNavigate();

  if (!products.length) return null;

  const seeAllLink = data.listingType === 'category' && data.categorySlug 
    ? `/category/${data.categorySlug}` 
    : '/products';

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleQuickAdd = (e, prod) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (prod.variants && prod.variants.length > 0) {
        navigate(`/product/${prod.slug}`);
    } else {
        addItem({
            _id: prod._id,
            title: prod.title,
            slug: { current: prod.slug }, 
            price: prod.price,
            image: prod.imageUrl,
            sku: prod._id,
            variantName: null
        });
        alert("Adicionado ao carrinho!"); 
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto my-10 px-4">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">{data.title}</h2>
        <div className="flex items-center gap-4">
          <Link to={seeAllLink} className="text-purple-600 text-sm hover:underline font-semibold">Ver todos</Link>
          <div className="hidden md:flex gap-2">
             <button onClick={() => scrollCarousel('left')} className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"><ChevronLeft size={20}/></button>
             <button onClick={() => scrollCarousel('right')} className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"><ChevronRight size={20}/></button>
          </div>
        </div>
      </div>
      
      <div ref={carouselRef} className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide scroll-smooth px-1 snap-x snap-mandatory">
        {products.map((prod) => (
          <Link to={`/product/${prod.slug}`} key={prod._id} className="min-w-[145px] md:min-w-[180px] w-[145px] md:w-[180px] snap-start bg-white p-3 rounded-lg border border-gray-100 hover:shadow-xl hover:border-gray-300 transition-all group flex flex-col relative">
            
            <div className="h-32 w-full mb-3 flex items-center justify-center bg-white p-2 rounded relative">
               {prod.imageUrl ? (
                  <img src={prod.imageUrl} alt={prod.title} className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300" />
               ) : (
                  <span className="text-gray-200"><Package /></span>
               )}
            </div>

            <h4 className="font-medium text-gray-600 mb-2 text-xs leading-4 line-clamp-3 h-[3rem] overflow-hidden group-hover:text-blue-600" title={prod.title}>{prod.title}</h4>
            
            {/* AQUI ESTÁ A CORREÇÃO DO CARD */}
            <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-end">
               <div className="flex flex-col">
                  {prod.oldPrice > prod.price && <span className="text-[10px] text-gray-400 line-through block mb-0.5">de {formatCurrency(prod.oldPrice)}</span>}
                  <span className="text-base font-black text-green-700 block tracking-tight leading-none">{prod.price ? formatCurrency(prod.price) : 'Sob Consulta'}</span>
                  <div className="mt-1 flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded w-fit">-10% à vista</span>
                      {/* --- RECUPERADO: EM ATÉ 12X --- */}
                      <span className="text-[10px] text-gray-400 font-medium">Em até 12x</span>
                  </div>
               </div>

               {/* --- BOTÃO QUICK ADD (No Rodapé) --- */}
               <button 
                  onClick={(e) => handleQuickAdd(e, prod)}
                  className="mb-1 bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-orange-700 transition-colors flex-shrink-0 ml-2"
                  title="Adicionar ao Carrinho"
               >
                  <div className="relative">
                      <ShoppingBag size={14} />
                      <Plus size={8} strokeWidth={4} className="absolute -top-1 -right-1 bg-white text-orange-600 rounded-full" />
                  </div>
               </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const COMPONENTS_MAP = {
  hero: HeroBlock,
  featuredBanners: FeaturedBannersBlock,
  departmentsSection: DepartmentsBlock,
  productCarousel: ProductCarouselBlock,
};

// ==========================================
// 3. PÁGINA PRINCIPAL
// ==========================================
export default function Home() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query completa incluindo 'variants'
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
        },
        _type == "departmentsSection" => { title, items[]{ name, image, link } },
        _type == "featuredBanners" => { banners[]{ title, image, link } },
        _type == "productCarousel" => { 
          title,
          listingType,
          "categorySlug": selectedCategory->slug.current,
          "products": select(
            listingType == 'category' => *[_type == "product" && references(^.selectedCategory._ref) && isActive == true][0..11] {
              _id, title, "slug": slug.current, "price": price, "oldPrice": oldPrice, "imageUrl": images[0].asset->url, isActive, variants
            },
            listingType == 'manual' => manualProducts[]-> { 
              _id, title, "slug": slug.current, "price": price, "oldPrice": oldPrice, "imageUrl": images[0].asset->url, isActive, variants
            }
          )
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
      <h2 className="text-xl font-bold text-gray-700 mb-2">Ops! A Home está vazia.</h2>
      <p className="text-gray-500">Vá no painel Sanity Studio e configure a "Página Inicial".</p>
    </div>
  );

  return (
    <div className="w-full bg-gray-50 min-h-screen pb-20">
      {pageData.pageBuilder.map((section) => {
        const Component = COMPONENTS_MAP[section._type];
        if (!Component) return null;
        return <Component key={section._key} data={section} />;
      })}
    </div>
  );
}