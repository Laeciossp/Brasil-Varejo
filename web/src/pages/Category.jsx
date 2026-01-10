import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { client, urlFor } from '../lib/sanity';
import { Filter, ChevronRight, ShoppingCart } from 'lucide-react';

export default function Category() {
  const { slug } = useParams();
  const [categoryData, setCategoryData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Busca Categoria (SÓ SE ESTIVER ATIVA)
      // Adicionamos "&& isActive == true" aqui. Se estiver false, retorna null.
      const categoryQuery = `*[_type == "category" && slug.current == $slug && isActive == true][0]{
        _id,
        title,
        description,
        "children": *[_type == "category" && references(^._id) && isActive == true] { title, slug }
      }`;

      const cat = await client.fetch(categoryQuery, { slug });

      if (cat) {
        setCategoryData(cat);
        
        // 2. Busca Produtos dessa categoria
        // Busca produtos que referenciam esta categoria OU alguma subcategoria dela
        const productsQuery = `*[_type == "product" && references($catId)] {
          title,
          slug,
          price,
          oldPrice,
          "image": images[0]
        }`;
        
        const prods = await client.fetch(productsQuery, { catId: cat._id });
        setProducts(prods);
      } else {
        setCategoryData(null); // Categoria não existe ou está desativada
      }
      
      setLoading(false);
    };

    fetchData();
  }, [slug]);

  if (loading) return <div className="p-20 text-center text-gray-400 font-bold">Carregando...</div>;

  // SE NÃO ACHOU (OU ESTÁ DESATIVADA), MOSTRA ERRO BONITO
  if (!categoryData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-black text-gray-300 mb-4">404</h1>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Categoria Indisponível</h2>
        <p className="text-gray-500 mb-6">Esta categoria não existe ou foi desativada temporariamente.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700">
          Voltar para a Loja
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        
        {/* Cabeçalho da Categoria */}
        <div className="mb-8">
           <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
             <Link to="/" className="hover:underline">Home</Link> 
             <ChevronRight size={14}/> 
             <span className="font-bold text-gray-900">{categoryData.title}</span>
           </div>
           <h1 className="text-3xl font-black text-gray-900 uppercase">{categoryData.title}</h1>
           {categoryData.description && <p className="text-gray-500 mt-2 max-w-2xl">{categoryData.description}</p>}
        </div>

        {/* Subcategorias (Chips) */}
        {categoryData.children?.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8">
            {categoryData.children.map(child => (
              <Link 
                key={child.slug.current}
                to={`/category/${child.slug.current}`}
                className="bg-white border border-gray-200 px-4 py-2 rounded-full text-sm font-bold text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                {child.title}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filtros Laterais (Simulação) */}
          <div className="hidden md:block w-64 flex-shrink-0">
             <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
               <h3 className="font-black text-sm uppercase mb-4 flex items-center gap-2">
                 <Filter size={16}/> Filtros
               </h3>
               <div className="space-y-4">
                 <div>
                   <p className="font-bold text-xs mb-2">Preço</p>
                   <input type="range" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
                 </div>
                 {/* Aqui entrariam filtros dinâmicos no futuro */}
               </div>
             </div>
          </div>

          {/* Grid de Produtos */}
          <div className="flex-1">
             {products.length === 0 ? (
               <div className="bg-white p-10 rounded-lg border border-dashed border-gray-300 text-center">
                 <p className="text-gray-400 font-bold">Nenhum produto cadastrado nesta categoria ainda.</p>
               </div>
             ) : (
               <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {products.map((prod, idx) => (
                   <Link key={idx} to={`/product/${prod.slug.current}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-blue-400 transition-all group">
                     <div className="aspect-square bg-gray-100 relative flex items-center justify-center overflow-hidden">
                       {prod.image ? (
                         <img src={urlFor(prod.image).width(400).url()} className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500"/>
                       ) : (
                         <div className="text-gray-300 font-bold text-xs">Sem foto</div>
                       )}
                     </div>
                     <div className="p-4">
                       <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-2 h-10">{prod.title}</h3>
                       {prod.oldPrice > prod.price && (
                         <span className="text-xs text-gray-400 line-through block">R$ {prod.oldPrice.toFixed(2)}</span>
                       )}
                       <div className="font-black text-xl text-blue-900">R$ {prod.price?.toFixed(2)}</div>
                       <p className="text-[10px] text-gray-500 mb-3">10x de R$ {(prod.price/10).toFixed(2)} sem juros</p>
                       
                       <button className="w-full bg-gray-100 hover:bg-green-600 hover:text-white text-gray-700 font-bold text-xs py-2 rounded transition-colors flex items-center justify-center gap-2">
                         <ShoppingCart size={14}/> Comprar
                       </button>
                     </div>
                   </Link>
                 ))}
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}