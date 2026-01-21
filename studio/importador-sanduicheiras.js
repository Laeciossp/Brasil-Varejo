// importador-sanduicheiras.js
// VERSÃO: Sanduicheiras e Grills (+30% Margem)
// CATEGORIA ALVO: cat-eletro

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const path = require('path');
const slugify = require('slugify');

puppeteer.use(StealthPlugin());

const SANITY_CONFIG = {
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
};

// ✅ CATEGORIA: Eletroportáteis
const CATEGORY_ID = 'cat-eletro'; 

const client = createClient(SANITY_CONFIG);

const generateKey = () => Math.random().toString(36).substring(2, 15);

function getBrand(title) {
    const brands = [
        'Cadence', 'Britânia', 'Mondial', 'Oster', 'Philco', 
        'Arno', 'Mallory', 'Black+Decker', 'Black Decker', 
        'Wap', 'Multilaser', 'Agratto', 'Lenoxx'
    ];
    const titleUpper = title.toUpperCase();
    
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) {
            if (brand.toUpperCase() === 'BLACK DECKER') return 'Black+Decker';
            return brand;
        }
    }
    return 'Genérica'; 
}

async function uploadMediaToSanity(mediaUrl) {
  try {
    const cleanUrl = mediaUrl.split('?')[0];
    const isVideo = cleanUrl.match(/\.(mp4|webm|mov|mkv)$/i);
    const assetType = isVideo ? 'file' : 'image';
    
    console.log(`   ⬇️ Baixando [${assetType.toUpperCase()}]: ${cleanUrl.substring(0, 40)}...`);
    
    const response = await axios.get(cleanUrl, { 
        responseType: 'arraybuffer',
        timeout: 20000, 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload(assetType, buffer, { filename: path.basename(cleanUrl) });
    return { id: asset._id, type: assetType };
  } catch (error) {
    console.warn(`   ⚠️ PULEI (Erro download): ${error.message}`);
    return null; 
  }
}

async function startScraper() {
  console.log('🔌 Conectando ao Chrome (Modo Sanduicheiras)...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado. Rode: chrome.exe --remote-debugging-port=9222");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Preparando a chapa...');

  try {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 200;
            let ticks = 0;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                ticks++;
                if(totalHeight >= scrollHeight || ticks >= 50){ 
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
  } catch (e) {}

  const rawData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1') || document.querySelector('.product-title-text');
        
        // Captura de Preço
        const metaPrice = document.querySelector('meta[property="product:price:amount"]') || 
                          document.querySelector('meta[property="og:price:amount"]');
        
        let rawPrice = 0;
        
        if (metaPrice && metaPrice.content) {
            rawPrice = parseFloat(metaPrice.content);
        } else {
            const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                            document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction') || 
                            document.querySelector('.price') || 
                            document.querySelector('.sale-price');
            
            if (priceEl) {
                const cleanText = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
                rawPrice = parseFloat(cleanText);
            }
        }

        const data = {
            title: titleEl ? titleEl.innerText : 'Sanduicheira Grill',
            originalPrice: rawPrice || 0,
            medias: []
        };

        // Captura de Mídias
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(s => {
            try {
                const json = JSON.parse(s.innerText);
                if (json.image) {
                    const imgs = Array.isArray(json.image) ? json.image : [json.image];
                    data.medias.push(...imgs);
                }
            } catch(e){}
        });

        const gallerySelectors = ['.ui-pdp-gallery__figure img', '#imgTagWrapperId img', '.product-gallery img'];
        gallerySelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(img => {
                let src = img.getAttribute('data-zoom') || img.getAttribute('src');
                if(src) data.medias.push(src);
            });
        });

        document.querySelectorAll('img').forEach(img => {
            if(img.naturalWidth > 500) { 
                let src = img.getAttribute('src');
                if(src) data.medias.push(src);
            }
        });

        return data;
    });

    console.log(`📦 Produto: ${rawData.title}`);

    // --- CÁLCULO DE PREÇO (+30% Margem Eletroportáteis) ---
    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.30) : 0; 
    
    console.log(`💰 Custo Original: R$ ${costPrice.toFixed(2)}`);
    console.log(`📈 Preço Venda (+30%): R$ ${salePrice.toFixed(2)}`);

    const uniqueMedias = [...new Set(rawData.medias.map(u => u ? u.split('?')[0] : null))]
        .filter(u => u && u.startsWith('http') && !u.includes('.svg'));
    
    const uploadedAssets = [];
    // 6 imagens é o ideal para esse tipo de produto
    for (const url of uniqueMedias.slice(0, 6)) {
        const result = await uploadMediaToSanity(url);
        if (result) uploadedAssets.push(result);
    }

    const imageAssets = uploadedAssets.filter(a => a.type === 'image');

    if (imageAssets.length === 0) {
        console.error("❌ Erro: Nenhuma imagem encontrada.");
        browser.disconnect(); return;
    }

    const detectedBrand = getBrand(rawData.title);
    const skuCode = `GRILL-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}`
      },
      isActive: true,
      lote: 'Eletro Cozinha',
      productType: 'tech',
      brand: detectedBrand,
      warranty: '12 meses',
      
      categories: [{ 
          _type: 'reference', 
          _ref: CATEGORY_ID,
          _key: generateKey() 
      }],
      
      price: parseFloat(salePrice.toFixed(2)),
      oldPrice: parseFloat(costPrice.toFixed(2)),

      images: imageAssets.map(item => ({ 
        _type: 'image', 
        _key: item.id, 
        asset: { _type: 'reference', _ref: item.id } 
      })),

      description: [ 
          { 
            _type: 'block', 
            _key: generateKey(),
            style: 'normal',
            children: [{ 
                _type: 'span', 
                _key: generateKey(),
                text: 'Prepare lanches rápidos e deliciosos para toda a família. Conta com chapas antiaderentes que facilitam a limpeza e garantem um tostado perfeito e uniforme.' 
            }] 
          } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: 'Padrão (110v/220v verificar)',
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 15, 
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],
      
      // Specs Personalizadas para Sanduicheiras
      techSpecs: { 
          screen: 'N/A', 
          camera: 'Capacidade: 2 Pães', 
          processor: '750W de Potência', // Usando campo processor para Potência
          battery: 'Elétrico (Com Fio)', 
          os: 'Antiaderente Easy Clean'  // Usando campo OS para Revestimento
      },
      
      // ✅ LOGÍSTICA REALISTA (Baseada na Cadence SAN400)
      logistics: { 
          weight: 1.4,   // 1.31kg + embalagem
          width: 22,     // 21.5cm arredondado
          height: 9,     // 7.8cm -> 9cm (margem caixa)
          length: 23     // 22.3cm -> 23cm
      },
      freeShipping: false 
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Sanduicheira cadastrada.`);
    console.log(`📄 SKU: ${skuCode} | Marca: ${detectedBrand}`);
    browser.disconnect();
}

startScraper();