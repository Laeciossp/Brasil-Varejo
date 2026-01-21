// importador-chaleiras.js
// VERSÃO: Chaleiras Elétricas Inteligente (Padrão, Bico de Ganso e Mini)
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
        'Unitermi', 'Agratto', 'Mondial', 'Cadence', 'Oster', 
        'Britânia', 'Philco', 'Electrolux', 'KitchenAid', 
        'Xiaomi', 'Hamilton Beach', 'Black+Decker', 'Mallory'
    ];
    const titleUpper = title.toUpperCase();
    
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) {
            if (brand.toUpperCase().includes('BLACK')) return 'Black+Decker';
            return brand;
        }
    }
    return 'Genérica'; 
}

function extractSpecs(title) {
    const t = title.toUpperCase();
    
    // Capacidade (ex: 1.8L, 1,8 Litros, 1L)
    const capacityMatch = t.match(/(\d+[,.]?\d*)\s*(L|LITRO)/);
    const capacityVal = capacityMatch ? parseFloat(capacityMatch[1].replace(',', '.')) : 1.8;
    const capacityStr = `${capacityVal} Litros`;

    // Potência
    const powerMatch = t.match(/(\d{3,4})\s*W/);
    const power = powerMatch ? `${powerMatch[1]}W` : '1200W'; // Padrão médio

    // Voltagem
    let voltage = 'Bivolt/Verificar';
    if (t.includes('110V') || t.includes('127V')) voltage = '127V';
    if (t.includes('220V')) voltage = '220V';

    return { capacityVal, capacityStr, power, voltage };
}

// Define Logística baseada no TIPO e CAPACIDADE
function calculateLogistics(title, capacity) {
    const t = title.toUpperCase();
    
    // TIPO 1: BICO DE GANSO / BARISTA (Pesada e formato diferente)
    if (t.includes('GANSO') || t.includes('BARISTA') || t.includes('GOOSENECK')) {
        return {
            type: 'CHALEIRA BARISTA',
            weight: 1.5,
            width: 30, height: 20, length: 25 // Mais comprida devido ao bico
        };
    }

    // TIPO 2: MINI / VIAGEM (< 1.2L)
    if (capacity < 1.2) {
        return {
            type: 'CHALEIRA COMPACTA',
            weight: 0.8,
            width: 18, height: 18, length: 18
        };
    }

    // TIPO 3: PADRÃO / JARRA (Unitermi, Agratto, etc - 1.8L a 2L)
    // Geralmente ocupam volume cúbico
    return {
        type: 'CHALEIRA ELÉTRICA PADRÃO',
        weight: 1.3, // Peso com base e caixa
        width: 22, height: 24, length: 22
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
  console.log('🔌 Conectando ao Chrome (Modo Chaleiras)...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado. Rode: chrome.exe --remote-debugging-port=9222");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Fervendo os dados...');

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
        
        // Texto completo para análise de material (Inox, Vidro, Plástico)
        const bodyText = document.body.innerText.toUpperCase();
        
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
            title: titleEl ? titleEl.innerText : 'Chaleira Elétrica',
            originalPrice: rawPrice || 0,
            fullText: bodyText.slice(0, 3000),
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
    const logistics = calculateLogistics(rawData.title, specs.capacityVal);

    // Detecção de Material no texto
    let material = 'Plástico/Inox';
    if (rawData.title.toUpperCase().includes('VIDRO') || rawData.fullText.includes('TRANSPARENTE')) material = 'Vidro Temperado';
    else if (rawData.title.toUpperCase().includes('INOX')) material = 'Aço Inoxidável';
    else if (rawData.title.toUpperCase().includes('CERÂMICA')) material = 'Cerâmica';

    // Detecção de Controle de Temperatura
    const hasControl = rawData.fullText.includes('CONTROLE DE TEMPERATURA') || rawData.fullText.includes('AJUSTE DE TEMPERATURA') ? 'Sim' : 'Não';

    console.log(`🔍 Detecção:`);
    console.log(`   - Marca: ${detectedBrand}`);
    console.log(`   - Tipo: ${logistics.type} (${specs.capacityStr})`);
    console.log(`   - Material: ${material}`);

    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.30) : 0; 

    const uniqueMedias = [...new Set(rawData.medias.map(u => u ? u.split('?')[0] : null))]
        .filter(u => u && u.startsWith('http') && !u.includes('.svg'));
    
    const uploadedAssets = [];
    for (const url of uniqueMedias.slice(0, 6)) {
        const result = await uploadMediaToSanity(url);
        if (result) uploadedAssets.push(result);
    }

    const imageAssets = uploadedAssets.filter(a => a.type === 'image');
    if (imageAssets.length === 0) {
        console.error("❌ Erro: Nenhuma imagem encontrada.");
        browser.disconnect(); return;
    }

    const skuCode = `KETTLE-${Math.random().toString(36).substring(7).toUpperCase()}`;

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
                text: `Chaleira elétrica ${detectedBrand} de ${specs.capacityStr}. Acabamento em ${material}. Ferve água rapidamente com ${specs.power} de potência. Ideal para chás, cafés e preparos rápidos.` 
            }] 
          } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: `Padrão (${specs.voltage})`,
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 10, 
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],
      
      techSpecs: { 
          screen: `Controle Temp: ${hasControl}`, // Usando campo screen
          camera: specs.capacityStr,              // Usando campo camera para Capacidade
          processor: specs.power,                 // Potência
          battery: 'Com Fio (Base)', 
          os: material                            // Material
      },
      
      // Logística Inteligente
      logistics: { 
          weight: logistics.weight,
          width: logistics.width,
          height: logistics.height,
          length: logistics.length
      },
      freeShipping: false // Ticket médio geralmente baixo
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Chaleira Cadastrada.`);
    console.log(`📄 SKU: ${skuCode} | Logística: ${logistics.type}`);
    browser.disconnect();
}

startScraper();