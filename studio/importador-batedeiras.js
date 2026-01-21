// importador-batedeiras.js
// VERSÃO: Batedeiras Inteligente (Planetária vs Comum vs Portátil)
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

// --- INTELIGÊNCIA DE PRODUTO ---

function getBrand(title) {
    const brands = [
        'Philco', 'Arno', 'Oster', 'Britânia', 'Mondial', 
        'KitchenAid', 'Kenwood', 'Walita', 'Philips', 
        'Cadence', 'Black+Decker', 'Electrolux', 'Mallory', 'Lenoxx'
    ];
    const titleUpper = title.toUpperCase();
    
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) {
            if (brand.toUpperCase() === 'WALITA') return 'Philips Walita';
            return brand;
        }
    }
    return 'Genérica'; 
}

// Extrai Potência (Watts) e Voltagem do Título
function extractSpecs(title) {
    const t = title.toUpperCase();
    
    // Regex para achar Watts (ex: 500W, 750 W)
    const powerMatch = t.match(/(\d+)\s*W/);
    const power = powerMatch ? `${powerMatch[1]}W` : 'Potência Padrão';

    let voltage = 'Bivolt/Verificar';
    if (t.includes('110V') || t.includes('127V')) voltage = '127V';
    if (t.includes('220V')) voltage = '220V';

    return { power, voltage };
}

// Define Logística baseada no TIPO de batedeira
function calculateLogistics(title) {
    const t = title.toUpperCase();
    
    // TIPO 1: PLANETÁRIA (Pesada e Alta)
    // Ex: Philco PBP90, Oster, KitchenAid
    if (t.includes('PLANET') || t.includes('PROFISSIONAL') || t.includes('KITCHENAID')) {
        return {
            type: 'PLANETÁRIA',
            // Peso real ~3.5kg -> Peso envio 4.5kg
            weight: 4.5,
            width: 25, 
            height: 38, // Altura maior p/ caber o braço levantado ou isopor
            length: 40
        };
    }

    // TIPO 2: PORTÁTIL / MÃO (Pequena)
    if (t.includes('MÃO') || t.includes('PORTÁTIL') || t.includes('HAND')) {
        return {
            type: 'PORTÁTIL',
            weight: 1.2,
            width: 15, height: 20, length: 25
        };
    }

    // TIPO 3: COMUM COM TIGELA (Média)
    // Batedeiras simples de bolo (Arno Facilita, etc)
    return {
        type: 'COMUM / BASE',
        weight: 2.2,
        width: 22, height: 25, length: 30
    };
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
    return null; 
  }
}

async function startScraper() {
  console.log('🔌 Conectando ao Chrome (Modo Batedeiras)...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado. Rode: chrome.exe --remote-debugging-port=9222");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Batendo os dados...');

  // Scroll
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
            title: titleEl ? titleEl.innerText : 'Batedeira Elétrica',
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

    // --- ANÁLISE INTELIGENTE ---
    const detectedBrand = getBrand(rawData.title);
    const specs = extractSpecs(rawData.title);
    const logistics = calculateLogistics(rawData.title);

    console.log(`🔍 Detecção:`);
    console.log(`   - Marca: ${detectedBrand}`);
    console.log(`   - Tipo: ${logistics.type} (${logistics.weight}kg)`);
    console.log(`   - Potência: ${specs.power}`);

    // Preço (+30%)
    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.30) : 0; 

    const uniqueMedias = [...new Set(rawData.medias.map(u => u ? u.split('?')[0] : null))]
        .filter(u => u && u.startsWith('http') && !u.includes('.svg'));
    
    const uploadedAssets = [];
    for (const url of uniqueMedias.slice(0, 7)) {
        const result = await uploadMediaToSanity(url);
        if (result) uploadedAssets.push(result);
    }

    const imageAssets = uploadedAssets.filter(a => a.type === 'image');
    if (imageAssets.length === 0) {
        console.error("❌ Erro: Nenhuma imagem encontrada.");
        browser.disconnect(); return;
    }

    const skuCode = `BAT-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}`
      },
      isActive: true,
      lote: 'Eletro Portáteis',
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
                text: `Batedeira ${detectedBrand} ${logistics.type === 'PLANETÁRIA' ? 'Planetária' : ''} com ${specs.power}. Ideal para preparar massas leves e pesadas com eficiência e rapidez.` 
            }] 
          } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: `Padrão (${specs.voltage})`,
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 8, 
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],
      
      // Specs mapeadas
      techSpecs: { 
          screen: 'Velocidade Ajustável', // Velocidades
          camera: 'Tigela Grande/Média',  // Capacidade
          processor: specs.power,         // Potência Real Extraída
          battery: `Elétrico (${specs.voltage})`, 
          os: logistics.type === 'PLANETÁRIA' ? 'Movimento Planetário' : 'Movimento Tradicional'
      },
      
      // Logística Dinâmica
      logistics: { 
          weight: logistics.weight,
          width: logistics.width,
          height: logistics.height,
          length: logistics.length
      },
      freeShipping: logistics.type === 'PLANETÁRIA' // Frete grátis apenas para as caras (planetárias)
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Batedeira Cadastrada.`);
    console.log(`📄 SKU: ${skuCode} | Dimensões: ${logistics.height}x${logistics.width}cm`);
    browser.disconnect();
}

startScraper();