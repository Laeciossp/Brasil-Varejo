import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { client, urlFor } from '../lib/sanity';
import { PortableText } from '@portabletext/react'; 
import { 
  Truck, Heart, ChevronRight, ChevronLeft, Package, CheckCircle, Lock, ArrowRight, ShoppingBag, Plus, ShoppingCart
} from 'lucide-react'; 
import { formatCurrency } from '../lib/utils';
import useCartStore from '../store/useCartStore';
import { useZipCode } from '../context/ZipCodeContext';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const ZoomImage = ({ src, alt }) => {
  const [zoomParams, setZoomParams] = useState({ show: false, x: 0, y: 0 });
  const imgRef = useRef(null);

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setZoomParams({ show: true, x, y });
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden rounded-lg bg-white cursor-crosshair group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setZoomParams({ ...zoomParams, show: false })}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-contain transition-transform duration-200 ease-out origin-center select-none"
        style={{
          transformOrigin: `${zoomParams.x}% ${zoomParams.y}%`,
          transform: zoomParams.show ? "scale(2.5)" : "scale(1)", 
        }}
        draggable="false" 
      />
      <div className={`hidden lg:block absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-gray-400 border border-gray-200 pointer-events-none transition-opacity duration-300 ${zoomParams.show ? 'opacity-0' : 'opacity-100'}`}>
        Passe o mouse para ampliar
      </div>
    </div>
  );
};

const MercadoPagoTrust = () => (
  <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center gap-2">
    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
      <Lock size={12} className="text-green-600" />
      <span>Ambiente 100% Seguro</span>
    </div>
    <img 
      src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.14.3/mercadopago/logo__large.png" 
      className="h-5 opacity-50 grayscale hover:grayscale-0 transition-all" 
      alt="Mercado Pago" 
    />
  </div>
);

const myPortableTextComponents = {
  types: {
    htmlBlock: ({ value }) => {
      if (!value?.html) return null;
      return <div className="my-4" dangerouslySetInnerHTML={{ __html: value.html }} />;
    },
    image: ({ value }) => {
      if (!value?.asset?._ref) return null;
      return (
        <figure className="my-10 flex flex-col items-center">
          <img
            src={urlFor(value).width(800).fit('max').url()}
            alt={value.alt || 'Imagem do produto'}
            className="rounded-xl shadow-sm border border-gray-100 max-h-[500px] object-contain"
          />
        </figure>
      );
    },
  },
  block: {
    h1: ({children}) => <h1 className="text-2xl font-bold mt-8 mb-4 text-gray-900">{children}</h1>,
    h2: ({children}) => <h2 className="text-xl font-bold mt-6 mb-3 text-gray-800">{children}</h2>,
    ul: ({children}) => <ul className="list-disc pl-5 my-4 space-y-2 text-gray-600">{children}</ul>,
    li: ({children}) => <li className="pl-1">{children}</li>,
    normal: ({children}) => <p className="mb-4 leading-relaxed text-gray-600">{children}</p>,
  }
};

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
   
  const { addItem, setShipping, selectedShipping, toggleFavorite, favorites } = useCartStore();
  const { globalCep } = useZipCode(); 

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
   
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentOldPrice, setCurrentOldPrice] = useState(0);

  const [activeMedia, setActiveMedia] = useState(null); 
  const [cep, setCep] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [shippingOptions, setShippingOptions] = useState(null);

  const [handlingDays, setHandlingDays] = useState(0);

  const carouselRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50; 

  const processVariants = (rawVariants, productOldPrice) => {
    if (!rawVariants || !Array.isArray(rawVariants)) return [];
    const flatList = [];
    rawVariants.forEach(item => {
        if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0) {
            const groupImage = item.variantImage; 
            item.sizes.forEach(sizeObj => {
                flatList.push({
                    _key: sizeObj.sku || Math.random().toString(36),
                    variantName: `${item.colorName || 'Opção'} - ${sizeObj.size}`,
                    price: sizeObj.price,
                    oldPrice: productOldPrice,
                    stock: sizeObj.stock,
                    sku: sizeObj.sku,
                    color: item.colorName,
                    size: sizeObj.size,
                    variantImage: groupImage
                });
            });
        } 
        else {
            flatList.push({
                _key: item._key,
                variantName: item.variantName || item.size || item.colorName || "Padrão",
                price: item.price,
                oldPrice: item.oldPrice || productOldPrice,
                stock: item.stock,
                sku: item.sku,
                color: item.colorName,
                size: item.size || item.variantName,
                variantImage: item.variantImage
            });
        }
    });
    return flatList.sort((a, b) => (a.variantName || "").localeCompare(b.variantName || ""));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = `{
          "product": *[_type == "product" && slug.current == $slug && isActive == true][0]{
            _id, title, brand, description, specifications, "slug": slug,
            categories[]->{_id, title},
            price, oldPrice,
            "images": images[]{ _key, _type, asset->{_id, url, mimeType} },
            "rawVariants": variants[] {
              _key, variantName, price, oldPrice, stock, sku, colorName,
              "variantImage": variantImage.asset->{_id, url, mimeType},
              sizes[] { size, price, sku, stock }
            },
            freeShipping,
            logistics { width, height, length, weight }
          },
          "settings": *[_type == "shippingSettings"][0]{ handlingTime }
        }`;

        const data = await client.fetch(query, { slug });

        if (data && data.product) {
          setHandlingDays(Number(data.settings?.handlingTime) || 0);

          const productData = data.product;
          const processedVariants = processVariants(productData.rawVariants, productData.oldPrice);
          productData.variants = processedVariants;

          setProduct(productData);
          
          if (productData.variants && productData.variants.length > 0) {
            const firstVar = productData.variants[0];
            setSelectedVariant(firstVar);
            
            const safePrice = firstVar.price && firstVar.price > 0 ? firstVar.price : productData.price;
            const safeOldPrice = firstVar.oldPrice && firstVar.oldPrice > 0 ? firstVar.oldPrice : productData.oldPrice;

            setCurrentPrice(safePrice || 0);
            setCurrentOldPrice(safeOldPrice || 0);

            if (firstVar.variantImage) {
              setActiveMedia({ _key: `var-${firstVar._key}`, asset: firstVar.variantImage });
            } else if (productData.images?.length > 0) {
              setActiveMedia(productData.images[0]);
            }
          } else {
            setCurrentPrice(productData.price || 0);
            setCurrentOldPrice(productData.oldPrice || 0);
            if (productData.images?.length > 0) setActiveMedia(productData.images[0]);
          }

          if (productData.categories && productData.categories.length > 0) {
            const catId = productData.categories[0]._id;
            const relatedQuery = `
              *[_type == "product" && references($catId) && _id != $id && isActive == true][0...50] {
                _id, title, slug, price, oldPrice,
                "imageUrl": images[0].asset->url,
                variants,
                logistics { width, height, length, weight }
              }
            `;
            const related = await client.fetch(relatedQuery, { catId, id: productData._id });
            setRelatedProducts(related || []);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Erro no Sanity Fetch:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const handleVariantChange = (variant) => {
    if (!variant) return;
    setSelectedVariant(variant);
    const safePrice = variant.price && variant.price > 0 ? variant.price : product.price;
    const safeOldPrice = variant.oldPrice && variant.oldPrice > 0 ? variant.oldPrice : product.oldPrice;
    setCurrentPrice(safePrice || 0);
    setCurrentOldPrice(safeOldPrice || 0);
    if (variant.variantImage) {
      setActiveMedia({ _key: `var-${variant._key}`, asset: variant.variantImage });
    }
  };

  useEffect(() => {
    if (product && globalCep) {
        const cleanGlobal = globalCep.replace(/\D/g, '');
        if (cleanGlobal.length === 8) {
            setCep(cleanGlobal);
            handleCalculateShipping(cleanGlobal);
        }
    }
  }, [product, globalCep, handlingDays]); 

  const handleCalculateShipping = async (cepOverride) => {
    const targetCep = typeof cepOverride === 'string' ? cepOverride : cep;
    const cleanCep = targetCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setCalculating(true);
    setShippingOptions([]);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'https://brasil-varejo-api.laeciossp.workers.dev';
      const workerUrl = `${baseUrl}/shipping`;

      const response = await fetch(workerUrl, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: { postal_code: "43805000" },
          to: { postal_code: cleanCep },
          products: [{ 
            id: product._id, 
            width: product.logistics?.width || 15,
            height: product.logistics?.height || 15,
            length: product.logistics?.length || 15,
            weight: product.logistics?.weight || 0.5, 
            insurance_value: currentPrice, 
            quantity: 1 
          }]
        })
      });
      const rawOptions = await response.json();

      if (Array.isArray(rawOptions) && rawOptions.length > 0) {
          const isLocal = cleanCep === '43850000'; 

          // 1. LIMPEZA DOS DADOS E ORDENAÇÃO POR PREÇO
          const candidates = rawOptions.map(opt => {
             let p = opt.custom_price || opt.price || 0;
             if (typeof p === 'string') p = parseFloat(p.replace(',', '.'));
             return {
               ...opt,
               price: Number(p),
               days: parseInt(opt.delivery_time) || 0,
               cleanName: (opt.name || '').toLowerCase()
             };
          }).sort((a, b) => a.price - b.price); // Mais barato primeiro

          let finalOptions = [];

          if (isLocal) {
             // === REGRA LOCAL (FERRO E FOGO) ===
             // Ignora nomes da API. Pega o primeiro (mais barato) e força os dados da Palastore.
             const cheapest = candidates[0];
             
             if (cheapest) {
                 finalOptions.push({
                    name: "Expresso Palastore ⚡",
                    price: cheapest.price, // Usa o preço da API
                    delivery_time: 5, // !!! FIXO 5 DIAS !!!
                    company: "Própria"
                 });
             }
          } else {
             // === REGRA NACIONAL (FILTRO RIGOROSO) ===
             
             // 1. Acha o primeiro PAC (o mais barato, pois já ordenamos)
             const bestEconomy = candidates.find(o => 
                o.cleanName.includes('pac') || 
                o.cleanName.includes('econômico') ||
                o.cleanName.includes('normal')
             );
             
             // 2. Acha o primeiro SEDEX (o mais barato)
             const bestExpress = candidates.find(o => 
                o.cleanName.includes('sedex') || 
                o.cleanName.includes('expresso')
             );

             // Adiciona PAC (se existir)
             if (bestEconomy) {
                finalOptions.push({
                    name: "PAC (Econômico)",
                    price: bestEconomy.price,
                    delivery_time: bestEconomy.days + handlingDays, // SOMA O PRAZO
                    company: "Correios"
                });
             }
             
             // Adiciona SEDEX (se existir e não for igual ao PAC)
             if (bestExpress && bestExpress.cleanName !== bestEconomy?.cleanName) {
                finalOptions.push({
                    name: "SEDEX (Expresso)",
                    price: bestExpress.price,
                    delivery_time: bestExpress.days + handlingDays, // SOMA O PRAZO
                    company: "Correios"
                });
             }
          }
          
          setShippingOptions(finalOptions);
      } else {
          setShippingOptions([]);
      }
    } catch (err) {
      console.error(err);
      setShippingOptions([]); 
    } finally {
      setCalculating(false);
    }
  };

  const createCartItem = () => {
      const finalSku = selectedVariant ? (selectedVariant.sku || selectedVariant._key) : product._id;
      return {
        _id: product._id,
        title: product.title, 
        slug: product.slug,
        price: currentPrice,
        image: activeMedia ? urlFor(activeMedia.asset).url() : '',
        variantName: selectedVariant ? selectedVariant.variantName : null,
        sku: finalSku,
        color: selectedVariant ? selectedVariant.color : null,
        size: selectedVariant ? selectedVariant.size : null,
        handlingTime: handlingDays,
        width: product.logistics?.width || 15,
        height: product.logistics?.height || 15,
        length: product.logistics?.length || 15,
        weight: product.logistics?.weight || 0.5
      };
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!selectedShipping) return alert("Por favor, calcule o frete para continuar.");
    addItem(createCartItem());
    window.location.href = '/cart'; 
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (!selectedShipping) return alert("Por favor, calcule o frete para adicionar.");
    addItem(createCartItem());
    alert("Produto adicionado ao carrinho!"); 
  };

  const handleQuickAdd = (e, prod) => {
    e.preventDefault();
    e.stopPropagation();
    if (prod.variants && prod.variants.length > 0) {
        navigate(`/product/${prod.slug.current}`);
    } else {
        addItem({
            _id: prod._id,
            title: prod.title,
            slug: prod.slug,
            price: prod.price,
            image: prod.imageUrl,
            sku: prod._id,
            variantName: null,
            handlingTime: handlingDays,
            width: prod.logistics?.width || 15,
            height: prod.logistics?.height || 15,
            length: prod.logistics?.length || 15,
            weight: prod.logistics?.weight || 0.5
        });
        alert("Adicionado ao carrinho!");
    }
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      const newPos = direction === 'left' ? carouselRef.current.scrollLeft - scrollAmount : carouselRef.current.scrollLeft + scrollAmount;
      carouselRef.current.scrollTo({ left: newPos, behavior: 'smooth' });
    }
  };

  const navigateImage = (direction) => {
      const allImages = product?.images || [];
      if (allImages.length <= 1) return;
      const currentIndex = allImages.findIndex(img => img._key === activeMedia?._key);
      const safeIndex = currentIndex === -1 ? 0 : currentIndex; 
      if (direction === 'next') {
          const nextIndex = (safeIndex + 1) % allImages.length;
          setActiveMedia(allImages[nextIndex]);
      } else {
          const prevIndex = (safeIndex - 1 + allImages.length) % allImages.length;
          setActiveMedia(allImages[prevIndex]);
      }
  };

  const onTouchStart = (e) => {
    if (e.targetTouches.length > 1) return; 
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) navigateImage('next');
    if (distance < -minSwipeDistance) navigateImage('prev');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 rounded-full animate-spin"></div></div>;
  if (!product) return <div className="p-10 text-center">Produto não encontrado.</div>;

  const isFreeShipping = product.freeShipping === true;
  const isFavorite = favorites.some((fav) => fav._id === product._id);
  const isVideo = activeMedia?.asset?.mimeType?.includes('video');

  return (
    <div className="bg-gray-50 min-h-screen py-8 font-sans">
      <div className="container mx-auto px-4 max-w-6xl mb-6">
         <div className="flex items-center text-xs text-gray-400 gap-1">
            <Link to="/" className="hover:text-orange-600 hover:underline">Home</Link>
            <ChevronRight size={12} />
            <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.title}</span>
         </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col lg:flex-row mb-10">
          
          <div className="lg:w-3/5 p-6 border-r border-gray-50 bg-white group relative">
           <div 
                className="aspect-square w-full flex items-center justify-center mb-4 relative overflow-hidden rounded-lg border border-gray-50 select-none"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {activeMedia && (
                isVideo ? (
                    <video src={activeMedia.asset.url} controls className="w-full h-full object-contain" />
                ) : (
                    <>
                        <div className="hidden lg:block w-full h-full">
                            <ZoomImage
                                src={urlFor(activeMedia.asset).width(1200).quality(100).fit('max').bg('ffffff').url()}
                                alt={product.title}
                            />
                        </div>
                        <div className="lg:hidden w-full h-full flex items-center justify-center bg-white overflow-hidden">
                            <TransformWrapper
                                initialScale={1}
                                minScale={1}
                                maxScale={4}
                                centerOnInit={true}
                                wheel={{ step: 0.2 }}
                            >
                                {({ zoomIn, zoomOut, resetTransform }) => (
                                    <React.Fragment>
                                        <TransformComponent
                                            wrapperClass="w-full h-full flex items-center justify-center"
                                            contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >
                                            <img
                                                src={urlFor(activeMedia.asset).width(1200).quality(100).fit('max').bg('ffffff').url()}
                                                alt={product.title}
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </TransformComponent>
                                    </React.Fragment>
                                )}
                            </TransformWrapper>
                        </div>
                    </>
                )
                )}

                {product.images?.length > 1 && (
                    <>
                        <button 
                            onClick={(e) => { e.stopPropagation(); navigateImage('prev'); }}
                            className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-crocus-deep text-white w-10 h-10 rounded-full items-center justify-center shadow-lg shadow-purple-900/20 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-purple-900"
                        >
                            <ChevronLeft size={20} strokeWidth={3} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); navigateImage('next'); }}
                            className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-crocus-deep text-white w-10 h-10 rounded-full items-center justify-center shadow-lg shadow-purple-900/20 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-purple-900"
                        >
                            <ChevronRight size={20} strokeWidth={3} />
                        </button>
                    </>
                )}
                <div className="lg:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {product.images?.map((_, idx) => (
                          <div key={idx} className={`h-1.5 rounded-full transition-all ${activeMedia?._key === product.images[idx]._key ? 'w-4 bg-orange-500' : 'w-1.5 bg-gray-300'}`}></div>
                      ))}
                </div>
            </div>
            <div className="flex gap-2 overflow-x-auto justify-center pb-2">
                {product.images?.map((media) => (
                <button 
                    key={media._key} 
                    onClick={() => setActiveMedia(media)} 
                    className={`w-16 h-16 border rounded-lg overflow-hidden transition-all flex-shrink-0 ${
                    activeMedia?._key === media._key 
                        ? 'border-orange-500 ring-2 ring-orange-100' 
                        : 'border-gray-100 opacity-60 hover:opacity-100'
                    }`}
                >
                    <img src={urlFor(media.asset).width(150).bg('ffffff').url()} className="w-full h-full object-contain" />
                </button>
                ))}
            </div>
          </div>

          <div className="lg:w-2/5 p-6 lg:p-10 flex flex-col bg-white">
            <div className="flex justify-between items-start mb-2">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide">
                    {product.categories?.[0]?.title || 'Oferta'}
                </span>
                <button onClick={() => toggleFavorite(product)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Heart size={22} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
                </button>
            </div>

            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2">{product.title}</h1>

            {product.brand && (
                <div className="mb-4">
                      <span className="text-sm font-medium text-gray-400">Marca: </span>
                      <Link to={`/marca/${encodeURIComponent(product.brand)}`} className="text-sm font-bold text-blue-600 hover:underline hover:text-blue-800">
                        {product.brand}
                      </Link>
                </div>
            )}

            {product.variants && product.variants.length > 0 && (
              <div className="mb-6">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Opção Selecionada: <span className="text-black ml-1">{selectedVariant?.variantName}</span></span>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isSelected = selectedVariant?._key === variant._key;
                    return (
                      <button
                        key={variant._key}
                        onClick={() => handleVariantChange(variant)}
                        title={variant.variantName}
                        className={`relative rounded-lg border transition-all overflow-hidden ${
                          isSelected 
                            ? 'border-blue-600 ring-1 ring-blue-600' 
                            : 'border-gray-200 hover:border-gray-400'
                        } ${variant.variantImage ? 'w-12 h-12 p-0' : 'px-3 py-2 text-xs font-bold text-gray-600 min-w-[3rem]'}`}
                      >
                          {variant.variantImage ? (
                            <img src={urlFor(variant.variantImage).width(100).url()} className="w-full h-full object-cover" alt={variant.variantName} />
                          ) : (
                              <span className="uppercase block text-center">
                                {variant.size || variant.variantName || "Opção"}
                              </span>
                          )}
                        {isSelected && !variant.variantImage && <div className="absolute -top-1 -right-1 text-blue-600 bg-white rounded-full"><CheckCircle size={12} fill="white"/></div>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-100">
                {currentOldPrice > currentPrice && (
                    <span className="text-gray-400 line-through text-xs block mb-1">De: {formatCurrency(currentOldPrice)}</span>
                )}
                <span className="text-4xl font-black text-gray-900 tracking-tighter block">{formatCurrency(currentPrice)}</span>
                <p className="text-xs text-green-700 mt-2 font-bold flex items-center gap-2">
                    <span className="bg-green-100 px-2 py-0.5 rounded">10% OFF no Pix</span>
                    <span className="text-gray-400 font-normal">ou em até 12x</span>
                </p>
                {isFreeShipping && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-purple-700">
                        <Truck size={14} /> Frete Grátis disponível
                    </div>
                )}
            </div>

            <div className="mb-6">
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    placeholder="00000-000"
                    maxLength={9} 
                    value={cep} 
                    onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, ''); 
                        let formatted = raw;
                        if (raw.length > 5) {
                           formatted = raw.slice(0, 5) + '-' + raw.slice(5, 8); 
                        }
                        setCep(formatted);
                    }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:border-orange-500 outline-none"
                  />
                  <button onClick={() => handleCalculateShipping()} disabled={calculating} className="bg-gray-900 text-white px-4 rounded-lg font-bold text-xs uppercase">
                    OK
                  </button>
                </div>
                {shippingOptions && shippingOptions.length > 0 && (
                    <div className="space-y-1">
                        {shippingOptions.map((opt, idx) => {
                            const isSelected = selectedShipping?.name === opt.name;
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => setShipping(opt)} 
                                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer text-xs ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100'}`}
                                >
                                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                        <Truck size={16} className="text-gray-400" />
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <span className="font-bold text-gray-700 uppercase">{opt.name}</span>
                                        <span className="text-[10px] text-gray-400 font-medium">Em até {opt.delivery_time} dias úteis</span>
                                    </div>
                                    <span className="font-black text-gray-900 self-center">
                                        {opt.price === 0 ? 'Grátis' : formatCurrency(opt.price)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <button onClick={handleBuyNow} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2">
                    Comprar Agora <ArrowRight size={18} />
                </button>
                
                <button onClick={handleAddToCart} className="w-full bg-white border-2 border-orange-600 text-orange-600 hover:bg-orange-50 py-3 rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    Adicionar ao Carrinho <ShoppingCart size={18} />
                </button>
            </div>
            
            <MercadoPagoTrust />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10">
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="text-xl font-black text-gray-900 mb-6 border-b pb-2">Sobre o Produto</h3>
               <div className="prose prose-sm max-w-none text-gray-600">
                 {product.description ? <PortableText value={product.description} components={myPortableTextComponents} /> : <p>Sem descrição.</p>}
               </div>
               {product.specifications && (
                 <div className="mt-8 pt-6 border-t border-gray-100">
                   <h4 className="text-xs font-black uppercase text-gray-400 mb-4">Especificações</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                     {product.specifications.map((spec, i) => (
                       <div key={i} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                         <span className="font-medium text-gray-500">{spec.label}</span>
                         <span className="font-bold text-gray-900">{spec.value}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
           </div>
          {relatedProducts.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-gray-900 px-1">Quem viu, viu também</h3>
                <div className="hidden md:flex gap-2">
                    <button onClick={() => scrollCarousel('left')} className="p-2 rounded-full border hover:bg-gray-100"><ChevronLeft size={16}/></button>
                    <button onClick={() => scrollCarousel('right')} className="p-2 rounded-full border hover:bg-gray-100"><ChevronRight size={16}/></button>
                </div>
            </div>
            <div ref={carouselRef} className="flex gap-3 overflow-x-auto pb-6 snap-x scrollbar-hide scroll-smooth px-1">
              {relatedProducts.map((rel) => {
                const relPrice = rel.price;
                const relOldPrice = rel.oldPrice;
                return (
                  <Link 
                    to={`/product/${rel.slug.current}`} 
                    key={rel._id} 
                    className="min-w-[145px] md:min-w-[180px] w-[145px] md:w-[180px] snap-start bg-white p-3 rounded-lg border border-gray-100 hover:shadow-xl hover:border-gray-300 transition-all group flex flex-col relative"
                  >
                    <div className="h-32 w-full mb-3 flex items-center justify-center bg-white p-2 rounded relative">
                      {rel.imageUrl ? (
                        <img src={`${rel.imageUrl}?w=300`} alt={rel.title} className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300" />
                      ) : <Package className="text-gray-200"/>}
                    </div>

                    <h4 className="font-medium text-gray-600 mb-2 text-xs leading-4 line-clamp-3 h-[3rem] overflow-hidden group-hover:text-blue-600" title={rel.title}>
                      {rel.title}
                    </h4>
                    
                    <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-end">
                        <div className="flex flex-col">
                            {relOldPrice > relPrice && (
                                <span className="text-[10px] text-gray-400 line-through block mb-0.5">
                                de {formatCurrency(relOldPrice)}
                                </span>
                            )}
                            <span className="text-base font-black text-green-700 block tracking-tight leading-none">
                            {formatCurrency(relPrice)}
                            </span>
                            <div className="mt-1 flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded w-fit">-10% à vista</span>
                                <span className="text-[10px] text-gray-400 font-medium">Em até 12x</span>
                            </div>
                        </div>

                         <button 
                            onClick={(e) => handleQuickAdd(e, rel)}
                            className="mb-1 bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-orange-700 transition-colors flex-shrink-0 ml-2"
                            title="Adicionar ao Carrinho"
                        >
                            <div className="relative">
                                <ShoppingBag size={14} />
                                <Plus size={8} strokeWidth={4} className="absolute -top-1 -right-1 bg-white text-orange-600 rounded-full" />
                            </div>
                        </button>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}