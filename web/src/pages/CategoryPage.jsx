import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from "@sanity/client";
import { Loader, Frown, Filter, X, Package } from 'lucide-react';

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

const formatPrice = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function CategoryPage() {
  const { slug } = useParams();
  
  const [data, setData] = useState({ category: null, products: [] });
  const [loading, setLoading] = useState(true);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // --- QUERY BLINDADA (SPLIT QUERY) ---
        // 1. Pega a categoria atual
        // 2. Busca produtos que referenciam ELA ou qualquer filha DELA (baseado no slug)
        // Isso resolve o problema de "0 produtos encontrados"
        const query = `{
          "category": *[_type == "category" && slug.current == $slug][0] {
            _id, title, description
          },
          "products": *[_type == "product" && references(*[_type == "category" && (slug.current == $slug || parent->slug.current == $slug)]._id)] {
            _id,
            title, 
            price,
            oldPrice,
            "imageUrl": images[0].asset->url,
            slug,
            "brandName": brand,
            variants[0] { price, oldPrice }
          }
        }`;

        const result = await client.fetch(query, { slug });
        
        // O Sanity retorna um objeto { category: ..., products: ... }
        if (result && result.category) {
            setData({ category: result.category, products: result.products || [] });
        } else {
            setData({ category: null, products: [] });
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug]);

  const filteredProducts = useMemo(() => {
    return data.products.filter(product => {
      const finalPrice = product.variants?.price || product.price || 0;
      const matchesBrand = selectedBrands.length === 0 || (product.brandName && selectedBrands.includes(product.brandName));
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      return matchesBrand && finalPrice >= min && finalPrice <= max;
    });
  }, [data.products, selectedBrands, priceRange]);

  const availableBrands = useMemo(() => {
    const brands = data.products.map(p => p.brandName).filter(Boolean);
    return [...new Set(brands)];
  }, [data.products]);

  const toggleBrand = (brand) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setPriceRange(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="min-h-[50vh] flex justify-center items-center"><Loader className="animate-spin text-orange-600" size={40} /></div>;

  if (!data.category) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-gray-500">
        <Frown size={60} className="text-gray-300"/>
        <h2 className="text-2xl font-bold text-gray-700">Categoria não encontrada</h2>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 pb-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{data.category.title}</h1>
              <p className="text-gray-500 mt-1 text-sm font-medium">{filteredProducts.length} produtos encontrados</p>
          </div>
          <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 shadow-sm">
              <Filter size={16} /> Filtros
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className={`lg:w-64 flex-shrink-0 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm sticky top-24">
                  <div className="flex justify-between items-center mb-6 lg:hidden">
                      <h3 className="font-bold text-gray-900">Filtrar</h3>
                      <button onClick={() => setShowMobileFilters(false)}><X size={20}/></button>
                  </div>
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
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                              {availableBrands.map(brand => (
                                  <label key={brand} className="flex items-center gap-3 cursor-pointer group select-none">
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedBrands.includes(brand) ? 'bg-orange-600 border-orange-600' : 'border-gray-300 bg-white group-hover:border-orange-400'}`}>
                                          {selectedBrands.includes(brand) && <span className="text-white text-[10px] font-bold">✓</span>}
                                      </div>
                                      <input type="checkbox" className="hidden" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)}/>
                                      <span className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">{brand}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  )}
                  {(selectedBrands.length > 0 || priceRange.min || priceRange.max) && (
                      <button onClick={() => {setSelectedBrands([]); setPriceRange({min:'', max:''})}} className="w-full mt-4 text-xs font-bold text-red-500 hover:bg-red-50 py-3 rounded-lg border border-transparent hover:border-red-100 transition-all uppercase">
                          Limpar Filtros
                      </button>
                  )}
              </div>
          </aside>

          <div className="flex-1">
              {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => {
                      const productLink = product.slug?.current ? `/product/${product.slug.current}` : '#';
                      const price = product.variants?.price || product.price || 0;
                      const oldPrice = product.variants?.oldPrice || product.oldPrice || 0;

                      return (
                          <Link 
                              key={product._id} 
                              to={productLink} 
                              className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-xl hover:border-orange-200 transition-all duration-300 group flex flex-col h-full"
                          >
                              {oldPrice > price && <span className="self-start bg-green-600 text-white text-[10px] font-black px-2 py-0.5 rounded mb-2 uppercase tracking-wide">Oferta</span>}
                              <div className="h-40 w-full bg-white rounded-lg mb-4 flex items-center justify-center overflow-hidden relative p-2">
                                  {product.imageUrl ? <img src={`${product.imageUrl}?w=300`} alt={product.title} className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" /> : <Package size={32} className="text-gray-200"/>}
                              </div>
                              <div className="mt-auto">
                                  <h3 className="font-medium text-gray-600 text-xs leading-4 line-clamp-3 h-[3rem] mb-2 group-hover:text-blue-600 transition-colors" title={product.title}>{product.title}</h3>
                                  <div className="border-t border-gray-50 pt-2">
                                      {oldPrice > price && <p className="text-[10px] text-gray-400 line-through">{formatPrice(oldPrice)}</p>}
                                      <p className="text-lg font-black text-green-700 tracking-tight leading-none">{price ? formatPrice(price) : 'Consulte'}</p>
                                      {price > 0 && <p className="text-[10px] text-gray-400 mt-1 font-medium">Em até 12x</p>}
                                  </div>
                              </div>
                          </Link>
                      );
                  })}
                  </div>
              ) : (
                  <div className="py-20 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                      <Package size={48} className="mx-auto text-gray-200 mb-4"/>
                      <p className="text-gray-500 font-medium">Nenhum produto encontrado nesta categoria.</p>
                      <button onClick={() => {setSelectedBrands([]); setPriceRange({min:'', max:''})}} className="text-orange-600 font-bold mt-4 text-sm hover:underline">
                          Limpar filtros
                      </button>
                  </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}