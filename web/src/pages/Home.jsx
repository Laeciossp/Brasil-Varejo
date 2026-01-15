import React, { useEffect, useState } from 'react';
import { createClient } from "@sanity/client";
import imageUrlBuilder from '@sanity/image-url';

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
// 1. COMPONENTES VISUAIS (BLOCOS)
// ==========================================

// --- Bloco A: Hero (COM LINKS FUNCIONANDO) ---
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
          
          // 1. Preparamos o conteúdo (Imagem ou Vídeo)
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
              {/* 2. Lógica Inteligente: Se tiver link, embrulha no <a>. Se não, mostra só a foto. */}
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
      
      {/* Bolinhas de navegação */}
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
  // 🛡️ PROTEÇÃO: Se a lista de departamentos estiver vazia ou nula, o bloco SOME.
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
// --- Bloco C: Banners de Destaque (COM CONTAINER) ---
const FeaturedBannersBlock = ({ data }) => {
  return (
    // Adicionei max-w-[1440px] mx-auto AQUI DENTRO
    <div className="max-w-[1440px] mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
        {data.banners?.map((banner, idx) => (
          <a key={idx} href={banner.link} className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
            <img src={urlFor(banner.image)} alt={banner.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" />
          </a>
        ))}
      </div>
    </div>
  );
};

// --- Bloco D: Carrossel de Produtos (COM CONTAINER) ---
const ProductCarouselBlock = ({ data }) => {
  const rawProducts = data.products || [];
  const products = rawProducts.filter(prod => prod && prod.isActive !== false);

  if (!products.length) return null;

  return (
    // Adicionei max-w-[1440px] mx-auto AQUI DENTRO
    <div className="max-w-[1440px] mx-auto my-10 px-4">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">{data.title}</h2>
        <a href="#" className="text-purple-600 text-sm hover:underline font-semibold">Ver todos</a>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-purple-200">
        {products.map((prod) => (
          <div key={prod._id} className="min-w-[180px] md:min-w-[220px] bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col">
            <div className="h-44 w-full mb-4 p-2 bg-white rounded flex items-center justify-center relative">
               {prod.imageUrl ? (
                 <img src={prod.imageUrl} alt={prod.title} className="h-full max-w-full object-contain" />
               ) : (
                 <span className="text-gray-400 text-xs">Sem Imagem</span>
               )}
            </div>
            
            <div className="flex flex-col flex-grow">
               <h3 className="text-sm text-gray-600 line-clamp-2 mb-2 h-10 leading-5">{prod.title}</h3>
               <div className="mt-auto">
                 {prod.oldPrice > prod.price && (
                    <span className="text-xs text-gray-400 line-through block">R$ {prod.oldPrice.toFixed(2).replace('.', ',')}</span>
                 )}
                 <p className="text-xl font-bold text-purple-700">
                   {prod.price ? `R$ ${prod.price.toFixed(2).replace('.', ',')}` : 'Sob Consulta'}
                 </p>
                 <span className="text-xs text-gray-500 block mb-3">à vista no Pix</span>

                 <button className="w-full bg-purple-600 text-white py-2 rounded-full text-sm font-bold hover:bg-purple-700 transition-colors shadow-purple-200 shadow-lg">
                   Comprar
                 </button>
               </div>
            </div>
          </div>
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
              _id, title, "price": price, "oldPrice": oldPrice, "imageUrl": images[0].asset->url, isActive
            },
            listingType == 'manual' => manualProducts[]-> { 
              _id, title, "price": price, "oldPrice": oldPrice, "imageUrl": images[0].asset->url, isActive
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
    // ATENÇÃO AQUI:
    // Troquei "max-w-[1440px] mx-auto" por "w-full"
    // Isso libera o site para usar 100% da tela.
    <div className="w-full bg-gray-50 min-h-screen pb-20">
      {pageData.pageBuilder.map((section) => {
        const Component = COMPONENTS_MAP[section._type];
        if (!Component) return null;
        return <Component key={section._key} data={section} />;
      })}
    </div>
  );
}