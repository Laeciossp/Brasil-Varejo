import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createClient } from "@sanity/client";
import { Frown, Filter, X, Package, Truck, ChevronRight, ShoppingBag, Plus } from 'lucide-react';
import CategoryHero from '../components/CategoryHero'; 
import useCartStore from '../store/useCartStore'; 

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

const formatPrice = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const ProductSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col h-[350px] animate-pulse">
    <div className="h-48 w-full bg-gray-200 rounded-lg mb-4"></div>
    <div className="mt-auto space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="h-8 bg-gray-200 rounded w-1/3 mt-2"></div>
    </div>
  </div>
);

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
   
  const { addItem } = useCartStore();

  const productsTopRef = useRef(null);
  const isFirstRender = useRef(true);
    
  const [data, setData] = useState({ category: null, subcategories: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // --- LER DADOS DA URL ---
  const selectedSubcategory = searchParams.get('sub');
   
  const selectedBrands = useMemo(() => {
    const brandsParam = searchParams.get('marcas');
    return brandsParam ? brandsParam.split(',') : [];
  }, [searchParams]);

  const priceRange = useMemo(() => ({
    min: searchParams.get('min') || '',
    max: searchParams.get('max') || ''
  }), [searchParams]);

  // --- 1. SCROLL INTELIGENTE ---
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (productsTopRef.current) {
       setTimeout(() => {
         productsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
       }, 100);
    }
  }, [selectedSubcategory, selectedBrands, priceRange]); 

  // --- 2. BUSCA DE DADOS ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = `{
          "category": *[_type == "category" && slug.current == $slug][0] {
            _id, title, description,
            heroBanner {
              mediaType, heading, subheading, link,
              desktopImage { asset->{ _id, url }, hotspot, crop, alt },
              videoFile { asset->{ url } }
            }
          },
          "subcategories": *[_type == "category" && parent->slug.current == $slug] | order(title asc) {
            _id, title, slug
          },
          "products": *[_type == "product" && references(*[_type == "category" && (slug.current == $slug || parent->slug.current == $slug)]._id) && isActive == true] {
            _id, title, price, oldPrice,
            "imageUrl": images[0].asset->url,
            slug,
            "brandName": brand,
            categories[]->{ slug },
            variants,
            freeShipping
          }
        }`;

        const result = await client.fetch(query, { slug });
        
        if (result && result.category) {
            // --- MODIFICAÇÃO AQUI: FILTRO PARA REMOVER "CALÇADOS" ---
            const filteredSubcategories = (result.subcategories || []).filter(sub => 
                sub.title !== 'Calçados' && sub.slug.current !== 'calcados'
            );

            setData({ 
              category: result.category, 
              subcategories: filteredSubcategories, 
              products: result.products || [] 
            });
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug]);

  // --- MANIPULADORES ---
  const handleSubcategoryChange = (subSlug) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (subSlug === null) newParams.delete('sub');
      else newParams.set('sub', subSlug);
      return newParams;
    });
  };

  const toggleBrand = (brand) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      const current = newParams.get('marcas') ? newParams.get('marcas').split(',') : [];
      let updated = current.includes(brand) ? current.filter(b => b !== brand) : [...current, brand];
      if (updated.length > 0) newParams.set('marcas', updated.join(','));
      else newParams.delete('marcas');
      return newParams;
    });
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value) newParams.set(name, value);
      else newParams.delete(name);
      return newParams;
    });
  };

  const clearFilters = () => setSearchParams({});

  // --- FUNÇÃO "QUICK ADD" ---
  const handleQuickAdd = (e, product) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (product.variants && product.variants.length > 0) {
        navigate(`/product/${product.slug.current}`);
    } else {
        addItem({
            _id: product._id,
            title: product.title,
            slug: product.slug,
            price: product.price,
            image: product.imageUrl,
            sku: product._id,
            variantName: null
        });
        alert("Produto adicionado ao carrinho!"); 
    }
  };

  // --- FILTRAGEM ---
  const filteredProducts = useMemo(() => {
    if (!data.products) return [];
    return data.products.filter(product => {
      // CORREÇÃO: Busca profunda do preço para o filtro também funcionar
      const finalPrice = product.variants?.[0]?.sizes?.[0]?.price || product.variants?.[0]?.price || product.price || 0;
      const matchesBrand = selectedBrands.length === 0 || (product.brandName && selectedBrands.includes(product.brandName));
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      const matchesPrice = finalPrice >= min && finalPrice <= max;
      const matchesSubcategory = !selectedSubcategory || (product.categories && product.categories.some(cat => cat.slug.current === selectedSubcategory));
      return matchesBrand && matchesPrice && matchesSubcategory;
    });
  }, [data.products, selectedBrands, priceRange, selectedSubcategory]);

  const availableBrands = useMemo(() => {
    const sourceProducts = selectedSubcategory ? filteredProducts : (data.products || []);
    const brands = sourceProducts.map(p => p.brandName).filter(Boolean);
    return [...new Set(brands)];
  }, [data.products, filteredProducts, selectedSubcategory]);

  // --- RENDER ---
  const categoryTitle = data.category?.title || "Carregando...";
  const subCategoryTitle = data.subcategories.find(s => s.slug.current === selectedSubcategory)?.title;

  if (!loading && !data.category) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500"><Frown size={60}/><h2 className="text-2xl font-bold">Categoria não encontrada</h2></div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
       
      {data.category?.heroBanner ? <CategoryHero heroBanner={data.category.heroBanner} /> : <div className="w-full h-[300px] bg-gray-200 animate-pulse"></div>}
       
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 pb-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <span>{categoryTitle}</span>
                {selectedSubcategory && <><ChevronRight size={14} /><span className="font-bold text-orange-600">{subCategoryTitle}</span></>}
              </div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{selectedSubcategory ? subCategoryTitle : categoryTitle}</h1>
              <p className="text-gray-500 mt-1 text-sm font-medium">{loading ? 'Carregando...' : `${filteredProducts.length} produtos encontrados`}</p>
          </div>
          <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 shadow-sm"><Filter size={16} /> Filtros</button>
        </div>

        {/* CONTAINER PRINCIPAL */}
        <div className="flex flex-col lg:flex-row gap-8 items-start relative">
           
          {/* ASIDE STICKY */}
          <aside className={`lg:w-64 flex-shrink-0 bg-white p-6 rounded-xl border border-gray-100 shadow-sm ${showMobileFilters ? 'fixed inset-0 z-50 overflow-y-auto m-0 rounded-none' : 'hidden lg:block sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent'}`}>
              <div className="flex justify-between items-center mb-6 lg:hidden"><h3 className="font-bold text-gray-900">Filtrar</h3><button onClick={() => setShowMobileFilters(false)}><X size={20}/></button></div>

              {loading && data.subcategories.length === 0 ? (
                 <div className="space-y-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2"></div><div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-200 rounded"></div>)}</div></div>
              ) : (
                <>
                  {data.subcategories.length > 0 && (
                    <div className="mb-8">
                      <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Categorias</h3>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleSubcategoryChange(null)} className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedSubcategory ? 'bg-orange-50 text-orange-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>Ver tudo</button>
                        {data.subcategories.map(sub => (
                          <button key={sub._id} onClick={() => handleSubcategoryChange(sub.slug.current)} className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${selectedSubcategory === sub.slug.current ? 'bg-orange-600 text-white font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>{sub.title}{selectedSubcategory === sub.slug.current && <span className="text-xs">✓</span>}</button>
                        ))}
                      </div>
                      <div className="border-b border-gray-100 my-6"></div>
                    </div>
                  )}

                  <div className="mb-8">
                      <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Preço</h3>
                      <div className="flex gap-2 items-center">
                          <input type="number" name="min" placeholder="Min" value={priceRange.min} onChange={handlePriceChange} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-orange-500 outline-none"/>
                          <span className="text-gray-300">-</span>
                          <input type="number" name="max" placeholder="Max" value={priceRange.max} onChange={handlePriceChange} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm focus:border-orange-500 outline-none"/>
                      </div>
                  </div>
                   
                  {availableBrands.length > 0 && (
                      <div className="mb-6">
                          <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Marcas</h3>
                          <div className="space-y-2 pr-2">
                              {availableBrands.map(brand => (
                                  <label key={brand} className="flex items-center gap-3 cursor-pointer group select-none hover:bg-gray-50 p-1 rounded transition-colors">
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedBrands.includes(brand) ? 'bg-orange-600 border-orange-600' : 'border-gray-300 bg-white group-hover:border-orange-400'}`}>{selectedBrands.includes(brand) && <span className="text-white text-[10px] font-bold">✓</span>}</div>
                                      <input type="checkbox" className="hidden" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)}/>
                                      <span className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">{brand}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  )}

                  {(selectedBrands.length > 0 || priceRange.min || priceRange.max || selectedSubcategory) && (
                      <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-100 mt-auto">
                        <button onClick={clearFilters} className="w-full text-xs font-bold text-red-500 hover:bg-red-50 py-3 rounded-lg border border-transparent hover:border-red-100 transition-all uppercase">Limpar Filtros</button>
                      </div>
                  )}
                </>
              )}
          </aside>

          {/* AREA DE PRODUTOS */}
          <div className="flex-1 min-h-[600px]" ref={productsTopRef}>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {[...Array(24)].map((_, i) => <ProductSkeleton key={i} />)}
                </div>
              ) : (
                filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => {
                      const productLink = product.slug?.current ? `/product/${product.slug.current}` : '#';
                      
                      // CORREÇÃO: Busca profunda do preço para exibir no Card corretamente
                      const price = product.variants?.[0]?.sizes?.[0]?.price || product.variants?.[0]?.price || product.price || 0;
                      const oldPrice = product.variants?.[0]?.sizes?.[0]?.oldPrice || product.variants?.[0]?.oldPrice || product.oldPrice || 0;

                      return (
                          <Link key={product._id} to={productLink} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-xl hover:border-orange-200 transition-all duration-300 group flex flex-col h-full relative">
                              {product.freeShipping && <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md z-10"><Truck size={10} /> <span>Frete Grátis</span></div>}
                               
                              <div className="h-40 w-full bg-white rounded-lg mb-4 flex items-center justify-center overflow-hidden relative p-2">
                                  {product.imageUrl ? <img src={`${product.imageUrl}?w=300`} alt={product.title} className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" /> : <Package size={32} className="text-gray-200"/>}
                              </div>

                              <div className="mt-auto">
                                  <h3 className="font-medium text-gray-600 text-xs leading-4 line-clamp-3 h-[3rem] mb-2 group-hover:text-blue-600 transition-colors" title={product.title}>{product.title}</h3>
                                   
                                  <div className="border-t border-gray-50 pt-2 flex justify-between items-end">
                                      <div className="flex flex-col">
                                          {oldPrice > price && <p className="text-[10px] text-gray-400 line-through block mb-0.5">de {formatPrice(oldPrice)}</p>}
                                          <p className="text-lg font-black text-green-700 block tracking-tight leading-none">{price ? formatPrice(price) : 'Consulte'}</p>
                                          {price > 0 && (
                                            <div className="mt-1 flex flex-col gap-0.5">
                                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded w-fit">-10% à vista</span>
                                                <span className="text-[10px] text-gray-400 font-medium">Em até 12x</span>
                                            </div>
                                          )}
                                      </div>

                                      <button 
                                        onClick={(e) => handleQuickAdd(e, product)}
                                        className="mb-1 bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-orange-700 transition-colors flex-shrink-0 ml-2"
                                        title="Adicionar ao Carrinho"
                                      >
                                        <div className="relative">
                                            <ShoppingBag size={14} />
                                            <Plus size={8} strokeWidth={4} className="absolute -top-1 -right-1 bg-white text-orange-600 rounded-full" />
                                        </div>
                                      </button>
                                  </div>
                              </div>
                          </Link>
                      );
                  })}
                  </div>
                ) : (
                  <div className="py-20 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                      <Package size={48} className="mx-auto text-gray-200 mb-4"/>
                      <p className="text-gray-500 font-medium">Nenhum produto encontrado com os filtros atuais.</p>
                      <button onClick={clearFilters} className="text-orange-600 font-bold mt-4 text-sm hover:underline">Limpar filtros</button>
                  </div>
                )
              )}
          </div>
        </div>
      </div>
    </div>
  );
}