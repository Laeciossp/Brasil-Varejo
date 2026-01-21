// importador-aspiradores.js
// VERSÃO: Robôs Aspiradores Compactos (+30% Preço)
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

// ID DA CATEGORIA
const CATEGORY_ID = 'cat-eletro'; 

const client = createClient(SANITY_CONFIG);

const generateKey = () => Math.random().toString(36).substring(2, 15);

function getBrand(title) {
    const brands = [
        'Roborock', 'Xiaomi', 'Mijia', 'Dreame', 'Ecovacs', 'Deebot', 
        'iRobot', 'Roomba', 'Liectroux', 'Eufy', 'Kabum', 'WAP', 
        'Multilaser', 'Samsung', 'LG', 'Midea', 'Ropo', 'Kärcher'
    ];
    const titleUpper = title.toUpperCase();
    
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) {
            if (brand.toUpperCase() === 'ROOMBA') return 'iRobot';
            if (brand.toUpperCase() === 'DEEBOT') return 'Ecovacs';
            if (brand.toUpperCase() === 'MIJIA') return 'Xiaomi';
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
        timeout: 25000, 
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
  console.log('🔌 Conectando ao Chrome (Modo Aspiradores Compactos)...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado. Rode: chrome.exe --remote-debugging-port=9222");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Iniciando varredura...');

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
                if(totalHeight >= scrollHeight || ticks >= 60){ 
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
  } catch (e) {}

  const rawData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1') || document.querySelector('.product-title-text');
        
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
            title: titleEl ? titleEl.innerText : 'Robô Aspirador Importado',
            originalPrice: rawPrice || 0,
            medias: []
        };

        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(s => {
            try {
                const json = JSON.parse(s.innerText);
                if (json.image) {
                    const imgs = Array.isArray(json.image) ? json.image : [json.image];
                    data.medias.push(...imgs);
                }
                if (json.video && json.video.contentUrl) {
                      data.medias.push(json.video.contentUrl);
                }
            } catch(e){}
        });

        const gallerySelectors = ['.ui-pdp-gallery__figure img', '.ui-pdp-image-gallery__figure img', '#gallery img', '.product-gallery img'];
        gallerySelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(img => {
                let src = img.getAttribute('data-zoom') || img.getAttribute('src');
                if(src) data.medias.push(src);
            });
        });

        document.querySelectorAll('img').forEach(img => {
            if(img.naturalWidth > 500 || img.width > 500) { 
                let src = img.getAttribute('data-zoom') || img.getAttribute('src');
                if(src) data.medias.push(src);
            }
        });
        
        document.querySelectorAll('video source, video').forEach(v => {
            const src = v.src || v.getAttribute('src');
            if (src && src.startsWith('http') && (src.includes('.mp4') || src.includes('.webm'))) {
                data.medias.push(src);
            }
        });

        return data;
    });

    console.log(`📦 Produto: ${rawData.title}`);

    // --- CÁLCULO DE PREÇO (+30%) ---
    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.30) : 0; 
    
    console.log(`💰 Custo Original: R$ ${costPrice.toFixed(2)}`);
    console.log(`📈 Preço Venda (+30%): R$ ${salePrice.toFixed(2)}`);

    const uniqueMedias = [...new Set(rawData.medias.map(u => u ? u.split('?')[0] : null))]
        .filter(u => u && u.startsWith('http') && !u.includes('.svg'));
    
    const uploadedAssets = [];
    for (const url of uniqueMedias.slice(0, 8)) {
        const result = await uploadMediaToSanity(url);
        if (result) uploadedAssets.push(result);
    }

    const imageAssets = uploadedAssets.filter(a => a.type === 'image');
    const videoAssets = uploadedAssets.filter(a => a.type === 'file');

    if (imageAssets.length === 0) {
        console.error("❌ Erro: Nenhuma imagem encontrada.");
        browser.disconnect(); return;
    }

    const detectedBrand = getBrand(rawData.title);
    const skuCode = `VAC-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}`
      },
      isActive: true,
      lote: 'Importação Eletro Compacto',
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

      ...(videoAssets.length > 0 && {
        videoFile: {
            _type: 'file',
            asset: { _type: 'reference', _ref: videoAssets[0].id }
        }
      }),

      description: [ 
          { 
            _type: 'block', 
            _key: generateKey(),
            style: 'normal',
            children: [{ 
                _type: 'span', 
                _key: generateKey(),
                text: 'Robô aspirador compacto com sensores inteligentes. Ideal para espaços menores e limpeza eficiente sob móveis.' 
            }] 
          } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: 'Padrão',
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 5, 
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],
      
      techSpecs: { 
          screen: null, 
          camera: null, 
          processor: 'Sensores Anti-queda', 
          battery: '90 min', 
          os: 'Controle Remoto/App' 
      },
      
      // ✅ LOGÍSTICA AJUSTADA (Suas medidas exatas)
      logistics: { 
          weight: 1.2,  // kg
          width: 28.5,  // cm
          height: 8,    // cm
          length: 27    // cm
      },
      freeShipping: true 
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Robô Compacto importado em [cat-eletro].`);
    console.log(`📄 SKU: ${skuCode} | Dimensões: 27x28.5x8cm`);
    browser.disconnect();
}

startScraper();