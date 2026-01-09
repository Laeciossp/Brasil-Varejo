import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { client, urlFor } from '../lib/sanity';
import { formatCurrency } from '../lib/utils';
import { ShoppingCart } from 'lucide-react';
import useCartStore from '../store/useCartStore';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    // Busca os 10 primeiros produtos para a vitrine
    const query = `*[_type == "product"][0...10]{
      _id,
      title,
      slug,
      price,
      oldPrice,
      images
    }`;

    client.fetch(query)
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <div className="p-10 text-center">Carregando ofertas...</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Banner Hero (Estático por enquanto) */}
      <div className="bg-brand-darkBlue text-white py-12 md:py-20 mb-8">
        <div className="container mx-auto px-4 text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Tecnologia Solar</h1>
          <p className="text-xl mb-6">As melhores soluções para sua energia, entregues com rapidez.</p>
          <button className="bg-brand-yellow text-brand-blue font-bold py-3 px-8 rounded-full hover:bg-white transition-colors">
            Ver Ofertas do Dia
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-brand-yellow pl-4">
          Destaques para Você
        </h2>

        {/* Grid de Produtos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product._id} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col">
              <Link to={`/product/${product.slug.current}`} className="block mb-4 relative h-48 flex items-center justify-center">
                {product.images && product.images[0] && (
                  <img 
                    src={urlFor(product.images[0]).width(300).url()} 
                    alt={product.title}
                    className="max-h-full object-contain" 
                  />
                )}
              </Link>
              
              <Link to={`/product/${product.slug.current}`} className="flex-1">
                <h3 className="text-gray-900 font-medium line-clamp-2 mb-2 hover:text-brand-blue">
                  {product.title}
                </h3>
              </Link>

              <div className="mt-4">
                {product.oldPrice && (
                   <span className="text-xs text-gray-500 line-through block">
                     {formatCurrency(product.oldPrice)}
                   </span>
                )}
                <span className="text-xl font-bold text-brand-blue block">
                  {formatCurrency(product.price)}
                </span>
                
                <button 
                  onClick={() => addItem(product)}
                  className="w-full mt-3 bg-brand-yellow text-brand-blue font-bold py-2 rounded flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" /> Adicionar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;