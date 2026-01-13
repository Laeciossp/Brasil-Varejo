import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { createClient } from "@sanity/client";
import { Loader, Package, Search } from 'lucide-react';

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

const formatPrice = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const queryTerm = searchParams.get('q');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSearch = async () => {
      if (!queryTerm) return;
      setLoading(true);
      try {
        const groq = `*[_type == "product" && (title match $term + "*" || description match $term + "*")]{
            _id, title, price, slug,
            "imageUrl": images[0].asset->url,
            variants[0] { price }
        }`;
        const result = await client.fetch(groq, { term: queryTerm });
        setProducts(result);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchSearch();
  }, [queryTerm]);

  if (loading) return <div className="p-20 flex justify-center"><Loader className="animate-spin text-purple-600"/></div>;

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
       <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Search size={24}/> Resultados para "{queryTerm}"
       </h1>

       {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
             <Package size={48} className="mx-auto text-gray-300 mb-4"/>
             <p className="text-gray-500">Nenhum produto encontrado.</p>
          </div>
       ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {products.map(product => {
                const price = product.variants?.price || product.price || 0;
                return (
                   <Link key={product._id} to={`/product/${product.slug.current}`} className="bg-white border p-4 rounded-xl hover:shadow-lg transition-all flex flex-col">
                      <img src={`${product.imageUrl}?w=300`} className="h-40 object-contain mb-4 mix-blend-multiply" alt={product.title}/>
                      <h3 className="text-sm font-medium line-clamp-2 h-10 mb-2">{product.title}</h3>
                      <div className="mt-auto">
                         <p className="text-lg font-black text-green-700">{formatPrice(price)}</p>
                         <p className="text-xs text-gray-400">à vista</p>
                      </div>
                   </Link>
                )
             })}
          </div>
       )}
    </div>
  );
}