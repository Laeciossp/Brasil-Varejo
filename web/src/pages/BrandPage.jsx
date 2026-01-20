import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from "@sanity/client";
import { Loader, Package, Truck, ArrowLeft } from 'lucide-react';

// Configuração do Sanity (Idealmente estaria num arquivo separado importado)
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: true, // Pode ser true para leitura mais rápida
  apiVersion: '2023-05-03',
});

const formatPrice = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function BrandPage() {
  const { brandName } = useParams(); // Pega o nome da URL
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Decodifica o nome (ex: "Solar%20Edge" vira "Solar Edge")
  const decodedBrand = decodeURIComponent(brandName);

  useEffect(() => {
    const fetchBrandProducts = async () => {
      setLoading(true);
      try {
        // Busca produtos onde o campo 'brand' é igual ao da URL
        const query = `*[_type == "product" && brand == $brand] {
          _id,
          title,
          price,
          oldPrice,
          "imageUrl": images[0].asset->url,
          slug,
          brand,
          freeShipping,
          variants[0] { price, oldPrice }
        }`;

        const result = await client.fetch(query, { brand: decodedBrand });
        setProducts(result);
      } catch (error) {
        console.error("Erro ao buscar marca:", error);
      } finally {
        setLoading(false);
      }
    };

    if (decodedBrand) fetchBrandProducts();
  }, [decodedBrand]);

  if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin text-orange-600" /></div>;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Cabeçalho da Marca */}
        <div className="mb-8 flex flex-col md:flex-row items-center gap-4 border-b border-gray-200 pb-6">
            <Link to="/" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition">
                <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
                <span className="text-sm font-bold text-orange-600 uppercase tracking-wider">Loja Oficial</span>
                <h1 className="text-4xl font-black text-gray-900">{decodedBrand}</h1>
                <p className="text-gray-500">{products.length} produtos encontrados</p>
            </div>
        </div>

        {/* Lista de Produtos (Grid Reutilizado) */}
        {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map((product) => {
                    const price = product.variants?.price || product.price || 0;
                    const oldPrice = product.variants?.oldPrice || product.oldPrice || 0;

                    return (
                        <Link key={product._id} to={`/product/${product.slug.current}`} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-xl transition-all group relative">
                             {product.freeShipping && (
                                <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md z-10">
                                   <Truck size={10} /> <span>Frete Grátis</span>
                                </div>
                              )}
                            <div className="h-40 w-full mb-4 flex items-center justify-center p-2">
                                {product.imageUrl ? 
                                    <img src={product.imageUrl} alt={product.title} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" /> 
                                    : <Package className="text-gray-200"/>
                                }
                            </div>
                            <h3 className="font-medium text-gray-600 text-xs line-clamp-2 h-[2.5rem] mb-2">{product.title}</h3>
                            <div className="border-t border-gray-50 pt-2">
                                {oldPrice > price && <p className="text-[10px] text-gray-400 line-through">de {formatPrice(oldPrice)}</p>}
                                <p className="text-lg font-black text-green-700">{price ? formatPrice(price) : 'Consulte'}</p>
                            </div>
                        </Link>
                    )
                })}
            </div>
        ) : (
            <div className="text-center py-20 bg-white rounded-xl">
                <Package size={48} className="mx-auto text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-600">Nenhum produto encontrado</h2>
                <p className="text-gray-400">Não encontramos itens cadastrados com a marca "{decodedBrand}".</p>
            </div>
        )}
      </div>
    </div>
  );
}