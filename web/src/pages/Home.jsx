import React, { useEffect, useState } from 'react';
import { createClient } from "@sanity/client";
import imageUrlBuilder from '@sanity/image-url';

// --- CONFIGURAÇÃO DO SANITY ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false, // Mantém false para garantir dados frescos
  apiVersion: '2024-01-01',
});

const builder = imageUrlBuilder(client);
function urlFor(source) {
  return source ? builder.image(source).url() : '';
}

// ==========================================
// 1. COMPONENTES VISUAIS (BLOCOS)
// ==========================================

// --- Bloco A: Hero (Banner Principal) ---
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
    <div className="relative w-full h-[300px] md:h-[500px] overflow-hidden group rounded-xl shadow-lg mb-8">
      <div className="flex transition-transform duration-700 ease-out h-full" style={{ transform: `translateX(-${current * 100}%)` }}>
        {slides.map((slide, idx) => (
          <div key={idx} className="min-w-full h-full relative">
            {slide.mediaType === 'video' && slide.videoUrl ? (
              <video src={slide.videoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            ) : (
              <img src={urlFor(slide.image)} alt={slide.title} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Bloco B: Departamentos ---
const DepartmentsBlock = ({ data }) => {
  return (
    <div className="my-10 px-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-yellow-500 pl-2">{data.title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {data.items?.map((dept, idx) => (
          <a key={idx} href={dept.link} className="group flex flex-col items-center hover:-translate-y-1 transition-transform">
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-md border-2 border-white group-hover:border-yellow-400 transition-colors">
              <img src={urlFor(dept.image)} alt={dept.name} className="w-full h-full object-cover" />
            </div>
            <span className="mt-3 text-sm font-medium text-gray-700 group-hover:text-yellow-600 text-center">{dept.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

// --- Bloco C: Banners de Destaque ---
const FeaturedBannersBlock = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8 px-4">
      {data.banners?.map((banner, idx) => (
        <a key={idx} href={banner.link} className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <img src={urlFor(banner.image)} alt={banner.title} className="w-full h-auto object-cover" />
        </a>
      ))}
    </div>
  );
};

// --- Bloco D: Carrossel de Produtos (MODIFICADO) ---
const ProductCarouselBlock = ({ data }) => {
  const rawProducts = data.manualProducts || [];

  // 👇 FILTRAGEM VIA JAVASCRIPT (INFALÍVEL)
  // Se isActive for explicitamente false, o produto é removido da lista aqui.
  const products = rawProducts.filter(prod => {
     if (!prod) return false; // Remove nulos
     if (prod.isActive === false) return false; // Remove desativados
     return true; // Mantém o resto (ativos ou antigos sem o campo)
  });

  if (!products.length) return null;

  return (
    <div className="my-10 px-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">{data.title}</h2>
        <a href="#" className="text-blue-600 text-sm hover:underline">Ver todos</a>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {products.map((prod) => (
          <div key={prod._id} className="min-w-[180px] md:min-w-[220px] bg-white rounded-lg shadow border p-4 hover:shadow-lg transition-all flex flex-col">
            <div className="h-40 w-full mb-3 bg-gray-100 rounded flex items-center justify-center overflow-hidden relative">
               {prod.imageUrl ? (
                 <img src={prod.imageUrl} alt={prod.title} className="h-full object-contain mix-blend-multiply" />
               ) : (
                 <span className="text-gray-400 text-xs">Sem Imagem</span>
               )}
            </div>
            <h3 className="text-sm font-medium text-gray-700 line-clamp-2 mb-2 flex-grow">{prod.title}</h3>
            
            <div className="mt-auto">
              <p className="text-lg font-bold text-gray-900">
                {prod.price ? `R$ ${prod.price.toFixed(2).replace('.', ',')}` : 'Sob Consulta'}
              </p>
              <button className="w-full mt-3 bg-blue-600 text-white py-2 rounded text-sm font-semibold hover:bg-blue-700 transition-colors">
                Comprar
              </button>
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
    // Busca APENAS UMA VEZ ao montar o componente
    const query = `*[_type == "homePage"][0]{
      pageBuilder[]{
        _type, _key,
        _type == "hero" => { slides[]{ title, mediaType, image, "videoUrl": videoFile.asset->url, link } },
        _type == "departmentsSection" => { title, items[]{ name, image, link } },
        _type == "featuredBanners" => { banners[]{ title, image, link } },
        _type == "productCarousel" => { 
          title, 
          // 👇 Removemos o filtro complexo daqui e trazemos o campo isActive para filtrar no JS
          manualProducts[]->{ 
            _id, 
            title,
            isActive, 
            "price": price, 
            "imageUrl": images[0].asset->url 
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

  if (loading) return <div className="p-10 text-center flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
   
  if (!pageData?.pageBuilder) return (
    <div className="p-10 text-center max-w-lg mx-auto mt-10 border-2 border-dashed border-gray-300 rounded-xl">
      <h2 className="text-xl font-bold text-gray-700 mb-2">Ops! A Home está vazia.</h2>
      <p className="text-gray-500">Vá no painel Sanity Studio, publique a "Configuração da Home" para ver o conteúdo aqui.</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto bg-gray-50 min-h-screen pb-20">
      {pageData.pageBuilder.map((section) => {
        const Component = COMPONENTS_MAP[section._type];
        if (!Component) return null;
        return <Component key={section._key} data={section} />;
      })}
    </div>
  );
}