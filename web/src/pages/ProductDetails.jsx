import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { client } from '../lib/sanity';
import Gallery from '../components/product/Gallery';
import BuyBox from '../components/product/BuyBox';
import SpecsTable from '../components/product/SpecsTable';

const ProductDetails = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query que busca TUDO do produto: Logística, EAN, Imagens, Specs
    const query = `*[_type == "product" && slug.current == $slug][0]{
      _id,
      title,
      price,
      oldPrice,
      description,
      ean,
      images,
      logistics,
      specifications,
      "category": categories[0]->title
    }`;

    client.fetch(query, { slug })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch(console.error);
  }, [slug]);

  if (loading) return <div className="container mx-auto p-8 text-center">Carregando produto...</div>;
  if (!product) return <div className="container mx-auto p-8 text-center">Produto não encontrado.</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb Simples */}
      <div className="text-sm text-gray-500 mb-4">
        Home / {product.category || 'Departamento'} / <span className="font-bold text-gray-800">{product.title}</span>
      </div>

      {/* Grid Principal (Layout Best Buy) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Coluna Esquerda: Galeria (8 colunas) */}
        <div className="lg:col-span-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:hidden">
            {product.title}
          </h1>
          <Gallery images={product.images} />
          
          {/* Descrição em Texto */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Visão Geral</h3>
            <div className="prose max-w-none text-gray-700">
               {/* Se a descrição for texto simples ou blocos do Sanity, tratamos aqui. 
                   Simplificando para texto por enquanto */}
               <p>Descrição detalhada do produto com código EAN: {product.ean}</p> 
            </div>
          </div>

          {/* Tabela de Specs */}
          <SpecsTable specifications={product.specifications} />
        </div>

        {/* Coluna Direita: BuyBox (4 colunas) */}
        <div className="lg:col-span-4">
          <div className="sticky top-24">
             <h1 className="text-2xl font-bold text-gray-900 mb-4 hidden md:block">
               {product.title}
             </h1>
             <BuyBox product={product} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductDetails;