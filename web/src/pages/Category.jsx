import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { client, urlFor } from '../lib/sanity';
import { formatCurrency } from '../lib/utils';
import useCartStore from '../store/useCartStore';

const Category = () => {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    setLoading(true);
    // Busca produtos que pertencem à categoria do Slug
    const query = `*[_type == "category" && slug.current == $slug][0]{
      title,
      "products": *[_type == "product" && references(^._id)]{
        _id, title, slug, price, images
      }
    }`;

    client.fetch(query, { slug })
      .then((data) => {
        setCategoryName(data?.title || 'Departamento');
        setProducts(data?.products || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div className="p-8 text-center">Carregando departamento...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <span className="text-sm text-gray-500">Home / Departamentos</span>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">{categoryName}</h1>
      </div>

      {products.length === 0 ? (
        <div className="p-12 bg-gray-50 rounded-lg text-center border border-gray-200">
          <h2 className="text-xl font-bold text-gray-600">Nenhum produto encontrado.</h2>
          <p className="text-gray-500 mt-2">Estamos reabastecendo o estoque deste departamento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product._id} className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow">
               <Link to={`/product/${product.slug.current}`} className="block h-40 flex items-center justify-center mb-4">
                  {product.images && (
                    <img src={urlFor(product.images[0]).width(200).url()} className="max-h-full object-contain" />
                  )}
               </Link>
               <Link to={`/product/${product.slug.current}`}>
                 <h2 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 min-h-[40px]">
                    {product.title}
                 </h2>
               </Link>
               <div className="font-bold text-lg text-brand-blue mb-3">
                 {formatCurrency(product.price)}
               </div>
               <button 
                 onClick={() => addItem(product)}
                 className="w-full py-2 border border-brand-blue text-brand-blue font-bold rounded hover:bg-brand-blue hover:text-white transition-colors"
               >
                 Adicionar
               </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Category;