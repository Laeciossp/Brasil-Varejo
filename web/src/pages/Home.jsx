import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom'; 
import { createClient } from "@sanity/client";
import imageUrlBuilder from '@sanity/image-url';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react'; // Ícones para navegação

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

// Helper rápido para formatar moeda
const formatCurrency = (value) => {
  return value ? `R$ ${value.toFixed(2).replace('.', ',')}` : 'R$ 0,00';
};

// ==========================================
// 1. COMPONENTES VISUAIS (BLOCOS)
// ==========================================

// --- Bloco A: Hero ---
const HeroBlock = ({ data }) => {
  const [current, setCurrent] = useState(0);
  const slides = data.slides || [];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(c => (c === slides.length - 1 ? 0 : c + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <div className="relative w-full h-[350px] md:h-[650px] overflow-hidden group mb-8 bg-gray-100">
      <div className="flex transition-transform duration-700 ease-out h-full" style={{ transform: `translateX(-${current * 100}%)` }}>
        {slides.map((slide, idx) => {
          const MediaContent = (
            <>
              {slide.mediaType === 'video' && slide.videoUrl ? (
                <video src={slide.videoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              ) : (
                <img 
                  src={urlFor(slide.image)} 
                  alt={slide.title} 
                  className="w-full h-full object-cover object-top" 
                />
              )}
            </>
          );

          return (
            <div key={idx} className="min-w-full h-full relative">
              {slide.link ? (
                <a href={slide.link} className="block w-full h-full cursor-pointer">
                  {MediaContent}
                </a>
              ) : (
                <div className="w-full h-full">
                  {MediaContent}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 pointer-events-none">
        {slides.map((_, idx) => (
          <div key={idx} className={`w-2 h-2 rounded-full transition-all ${current === idx ? 'bg-purple-600 w-4' : 'bg-gray-400'}`} />
        ))}
      </div>
    </div>
  );
};

// --- Bloco B: Departamentos ---
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

// --- Bloco C: Banners de Destaque ---
const FeaturedBannersBlock = ({ data }) => {
  return (
    <div className="max-w-[1440px] mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
        {data.banners?.map((banner, idx) => (
          <a 
            key={idx} 
            href={banner.link} 
            className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative block border border-gray-100"
          >
            <div className="aspect-[3/4] w-full overflow-hidden">
              <img 
                src={urlFor(banner.image)} 
                alt={banner.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
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

// --- Bloco D: Carrossel de Produtos (ATUALIZADO: HÍBRIDO E RESPONSIVO) ---
const ProductCarouselBlock = ({ data }) => {
  const rawProducts = data.products || [];
  const products = rawProducts.filter(prod => prod && prod.isActive !== false);
  
  // Ref para controlar o scroll
  const carouselRef = useRef(null);

  if (!products.length) return null;

  // Função para rolar com os botões
  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 300; // Quantidade de scroll em pixels
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto my-10 px-4">
      {/* Cabeçalho com Título e Navegação */}
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">{data.title}</h2>
        
        <div className="flex items-center gap-4">
          <Link to="/products" className="text-purple-600 text-sm hover:underline font-semibold">
            Ver todos
          </Link>
          
          {/* Botões de seta (Só aparecem em telas médias/grandes) */}
          <div className="hidden md:flex gap-2">
            <button 
              onClick={() => scrollCarousel('left')} 
              className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft size={20}/>
            </button>
            <button 
              onClick={() => scrollCarousel('right')} 
              className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Próximo"
            >
              <ChevronRight size={20}/>
            </button>
          </div>
        </div>
      </div>
      
      {/* Container dos Produtos (snap-x para travar a rolagem) */}
      <div 
        ref={carouselRef}
        className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide scroll-smooth px-1 snap-x snap-mandatory"
      >
        {products.map((prod) => (
          <Link 
            to={`/product/${prod.slug}`} 
            key={prod._id} 
            className="min-w-[145px] md:min-w-[180px] w-[145px] md:w-[180px] snap-start bg-white p-3 rounded-lg border border-gray-100 hover:shadow-xl hover:border-gray-300 transition-all group flex flex-col"
          >
            {/* IMAGEM */}
            <div className="h-32 w-full mb-3 flex items-center justify-center bg-white p-2 rounded relative">
               {prod.imageUrl ? (
                 <img src={prod.imageUrl} alt={prod.title} className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300" />
               ) : (
                 <span className="text-gray-200"><Package /></span>
               )}
            </div>
            
            {/* TÍTULO */}
            <h4 className="font-medium text-gray-600 mb-2 text-xs leading-4 line-clamp-3 h-[3rem] overflow-hidden group-hover:text-blue-600" title={prod.title}>
               {prod.title}
            </h4>
            
            {/* PREÇO E CONDIÇÕES */}
            <div className="mt-auto pt-2 border-t border-gray-50">
               {/* Preço Antigo */}
               {prod.oldPrice > prod.price && (
                  <span className="text-[10px] text-gray-400 line-through block mb-0.5">
                    de {formatCurrency(prod.oldPrice)}
                  </span>
               )}

               {/* Preço Atual */}
               <span className="text-base font-black text-green-700 block tracking-tight leading-none">
                 {prod.price ? formatCurrency(prod.price) : 'Sob Consulta'}
               </span>

               {/* Etiquetas de Parcelamento e Desconto */}
               <div className="mt-1 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded w-fit">-10% à vista</span>
                  <span className="text-[10px] text-gray-400 font-medium">Em até 12x</span>
               </div>
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
    const query = `*[_type == "homePage"][0]{
      pageBuilder[]{
        _type, _key,
        _type == "hero" => { slides[]{ title, mediaType, image, "videoUrl": videoFile.asset->url, link } },
        _type == "departmentsSection" => { title, items[]{ name, image, link } },
        _type == "featuredBanners" => { banners[]{ title, image, link } },
        _type == "productCarousel" => { 
          title,
          listingType,
          "products": select(
            listingType == 'category' => *[_type == "product" && references(^.selectedCategory._ref) && isActive == true][0..11] {
              _id, title, "slug": slug.current, "price": price, "oldPrice": oldPrice, "imageUrl": images[0].asset->url, isActive
            },
            listingType == 'manual' => manualProducts[]-> { 
              _id, title, "slug": slug.current, "price": price, "oldPrice": oldPrice, "imageUrl": images[0].asset->url, isActive
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