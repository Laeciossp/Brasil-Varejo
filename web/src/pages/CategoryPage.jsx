import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from "@sanity/client";
import { Loader, Frown, Filter, X } from 'lucide-react';

// --- CONFIGURAÇÃO DO SANITY ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

// --- FORMATADOR DE PREÇO (R$ 1.000,00) ---
const formatPrice = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function CategoryPage() {
  const { slug } = useParams();
  
  // Estados de Dados
  const [data, setData] = useState({ category: null, products: [] });
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Busca dados no Sanity
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("Buscando categoria:", slug);

        const query = `
          *[_type == "category" && slug.current == $slug][0] {
            title,
            description,
            "products": *[_type == "product" && (
              references(^._id) || 
              references(*[_type == "category" && parent._ref == ^._id]._id)
            )] {
              _id,
              title, 
              price,
              "imageUrl": images[0].asset->url,
              slug,
              "brandName": brand->title 
            }
          }
        `;

        const result = await client.fetch(query, { slug });
        
        if (result) {
            setData({ category: result, products: result.products || [] });
        } else {
            setData({ category: null, products: [] });
        }

      } catch (error) {
        console.error("Erro ao buscar categoria:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug]);

  // --- LÓGICA DE FILTROS ---
  const availableBrands = useMemo(() => {
    const brands = data.products
      .map(p => p.brandName)
      .filter(Boolean);
    return [...new Set(brands)];
  }, [data.products]);

  const filteredProducts = useMemo(() => {
    return data.products.filter(product => {
      const matchesBrand = selectedBrands.length === 0 || (product.brandName && selectedBrands.includes(product.brandName));
      const price = product.price || 0;
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      return matchesBrand && price >= min && price <= max;
    });
  }, [data.products, selectedBrands, priceRange]);

  const toggleBrand = (brand) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setPriceRange(prev => ({ ...prev, [name]: value }));
  };

  // --- RENDERIZAÇÃO ---
  if (loading) return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-gray-500">
        <Loader className="animate-spin text-crocus-deep" size={40} />
        <p>Carregando produtos...</p>
    </div>
  );

  if (!data.category) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-gray-500">
        <Frown size={60} className="text-gray-300"/>
        <h2 className="text-2xl font-bold text-gray-700">Categoria não encontrada</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      
      {/* Cabeçalho */}
      <div className="mb-8 border-b border-gray-100 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 uppercase italic tracking-tight">
                {data.category.title}
            </h1>
            {data.category.description && (
            <p className="text-gray-500 mt-2 max-w-2xl text-lg">{data.category.description}</p>
            )}
        </div>
        
        <button 
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-200"
        >
            <Filter size={16} /> Filtros
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Filtros (Sidebar) */}
        <aside className={`lg:w-64 flex-shrink-0 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm sticky top-4">
                <div className="flex justify-between items-center mb-4 lg:hidden">
                    <h3 className="font-bold">Filtros</h3>
                    <button onClick={() => setShowMobileFilters(false)}><X size={20}/></button>
                </div>
                {/* Preço */}
                <div className="mb-6">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-crocus-deep rounded-full"></span> Preço
                    </h3>
                    <div className="flex gap-2 items-center">
                        <input type="number" name="min" placeholder="Mín" value={priceRange.min} onChange={handlePriceChange} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-crocus-deep"/>
                        <span className="text-gray-400">-</span>
                        <input type="number" name="max" placeholder="Máx" value={priceRange.max} onChange={handlePriceChange} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-crocus-deep"/>
                    </div>
                </div>
                {/* Marcas */}
                {availableBrands.length > 0 && (
                    <div>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-crocus-deep rounded-full"></span> Marcas
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {availableBrands.map(brand => (
                                <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedBrands.includes(brand) ? 'bg-crocus-deep border-crocus-deep' : 'border-gray-300 group-hover:border-crocus-deep'}`}>
                                        {selectedBrands.includes(brand) && <span className="text-white text-xs">✓</span>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)}/>
                                    <span className="text-sm text-gray-600 group-hover:text-crocus-deep transition-colors">{brand}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                {/* Limpar */}
                {(selectedBrands.length > 0 || priceRange.min || priceRange.max) && (
                    <button onClick={() => {setSelectedBrands([]); setPriceRange({min:'', max:''})}} className="w-full mt-6 text-xs text-red-500 hover:text-red-700 font-bold uppercase tracking-wider py-2 border border-red-100 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        Limpar Filtros
                    </button>
                )}
            </div>
        </aside>

        {/* Listagem de Produtos */}
        <div className="flex-1">
            {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                    const productLink = product.slug?.current 
                        ? `/product/${product.slug.current}` 
                        : '#';
                    const oldPrice = product.price ? product.price * 1.2 : 0;

                    return (
                        <Link 
                            key={product._id} 
                            to={productLink} 
                            className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-xl hover:-translate-y-1 transition-all group duration-300 flex flex-col justify-between"
                        >
                            <div className="h-48 w-full bg-gray-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
                                {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.title} className="h-full w-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                <span className="text-gray-300 text-xs font-bold uppercase">Sem imagem</span>
                                )}
                                {product.brandName && (
                                    <span className="absolute top-2 right-2 text-[10px] font-bold bg-white/90 px-2 py-1 rounded-md text-gray-500 shadow-sm">
                                        {product.brandName}
                                    </span>
                                )}
                            </div>
                            
                            <div className="space-y-1">
                                <h3 className="font-medium text-gray-600 text-sm line-clamp-2 h-10 leading-tight">
                                {product.title}
                                </h3>
                                <div className="pt-2">
                                    <p className="text-xs text-gray-400 line-through">
                                        {product.price ? formatPrice(oldPrice) : ''}
                                    </p>
                                    <p className="text-xl font-black text-crocus-deep">
                                        {product.price ? formatPrice(product.price) : 'Sob Consulta'}
                                    </p>
                                    
                                    {/* --- PARCELAMENTO NEUTRO (SEM JUROS) --- */}
                                    {product.price && (
                                        <p className="text-[10px] text-gray-500 font-bold bg-gray-100 inline-block px-2 py-0.5 rounded-full mt-1">
                                            Em até 12x
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })}
                </div>
            ) : (
                <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 text-lg font-medium">Nenhum produto encontrado.</p>
                    <button onClick={() => {setSelectedBrands([]); setPriceRange({min:'', max:''})}} className="text-crocus-deep font-bold mt-2 hover:underline">
                        Limpar busca
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}