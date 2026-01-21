// importador-fritadeiras-smart.js
// VERSÃO: Air Fryers Inteligente (Detecta Tamanho e Ajusta Logística)
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

const CATEGORY_ID = 'cat-eletro'; 
const client = createClient(SANITY_CONFIG);

const generateKey = () => Math.random().toString(36).substring(2, 15);

// --- FUNÇÕES DE INTELIGÊNCIA ---

function getBrand(title) {
    const brands = [
        'Arno', 'Mondial', 'Philco', 'Britânia', 'Oster', 
        'Philips', 'Walita', 'Midea', 'Electrolux', 'Cadence', 
        'Gaabor', 'Multilaser', 'Ninja', 'Black+Decker'
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

// Extrai Litragem e Voltagem do Título
function extractSpecsFromTitle(title) {
    const titleUpper = title.toUpperCase();
    
    // Regex para achar Litros (ex: 3.5L, 8,3L, 12 Litros)
    const litragemMatch = titleUpper.match(/(\d+[,.]?\d*)\s*(L|LITROS)/);
    const capacityVal = litragemMatch ? parseFloat(litragemMatch[1].replace(',', '.')) : 4.0; // Padrão 4L se não achar

    // Regex para Voltagem
    let voltage = 'Bivolt/Verificar';
    if (titleUpper.includes('110V') || titleUpper.includes('127V')) voltage = '127V';
    if (titleUpper.includes('220V')) voltage = '220V';

    return { capacityVal, voltage };
}

// Define Logística baseada no Tamanho detectado
function calculateLogistics(capacity, title) {
    const t = title.toUpperCase();
    
    // TIPO 1: OVEN (Fornos Air Fryer - Muito Grandes)
    if (t.includes('OVEN') || capacity >= 10) {
        return {
            type: 'OVEN / SUPER',
            weight: 10.5,
            width: 40, height: 45, length: 40
        };
    }

    // TIPO 2: DUAL / FAMÍLIA (Grandes > 5.5L)
    if (t.includes('DUAL') || capacity >= 5.5) {
        return {
            type: 'FAMÍLIA / DUAL',
            weight: 7.5,
            width: 38, height: 40, length: 38
        };
    }

    // TIPO 3: PADRÃO (3L a 5L)
    return {
        type: 'COMPACTA / PADRÃO',
        weight: 4.5,
        width: 30, height: 35, length: 30
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
  console.log('🔌 Conectando ao Chrome (Modo Air Fryer Inteligente)...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado. Rode: chrome.exe --remote-debugging-port=9222");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Analisando produto...');

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
            title: titleEl ? titleEl.innerText : 'Fritadeira Air Fryer',
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

    // --- CÁLCULO INTELIGENTE ---
    // 1. Marca
    const detectedBrand = getBrand(rawData.title);
    
    // 2. Capacidade e Voltagem (Extração via Regex)
    const specs = extractSpecsFromTitle(rawData.title);
    
    // 3. Logística Dinâmica (Oven vs Dual vs Padrão)
    const logistics = calculateLogistics(specs.capacityVal, rawData.title);

    console.log(`🔍 Análise Inteligente:`);
    console.log(`   - Marca: ${detectedBrand}`);
    console.log(`   - Capacidade Detectada: ${specs.capacityVal} Litros`);
    console.log(`   - Perfil Logístico: ${logistics.type} (${logistics.weight}kg)`);

    // 4. Preço (+30%)
    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.30) : 0; 

    const uniqueMedias = [...new Set(rawData.medias.map(u => u ? u.split('?')[0] : null))]
        .filter(u => u && u.startsWith('http') && !u.includes('.svg'));
    
    const uploadedAssets = [];
    for (const url of uniqueMedias.slice(0, 8)) {
        const result = await uploadMediaToSanity(url);
        if (result) uploadedAssets.push(result);
    }

    const imageAssets = uploadedAssets.filter(a => a.type === 'image');
    if (imageAssets.length === 0) {
        console.error("❌ Erro: Nenhuma imagem encontrada.");
        browser.disconnect(); return;
    }

    const skuCode = `FRY-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}`
      },
      isActive: true,
      lote: 'Eletro Inteligente',
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
                text: `Fritadeira Air Fryer ${detectedBrand} de ${specs.capacityVal} Litros. Tecnologia avançada para preparar alimentos crocantes sem óleo. Ideal para sua cozinha.` 
            }] 
          } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: `Padrão (${specs.voltage})`,
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 5, 
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],
      
      // Specs preenchidas dinamicamente
      techSpecs: { 
          screen: 'Até 200°C', 
          camera: `${specs.capacityVal} Litros`, // Capacidade real
          processor: specs.capacityVal > 5 ? '1500W-1900W' : '1400W', // Estimativa de potência baseada no tamanho
          battery: `Elétrico (${specs.voltage})`, 
          os: 'Antiaderente' 
      },
      
      // Logística calculada automaticamente
      logistics: { 
          weight: logistics.weight,
          width: logistics.width,
          height: logistics.height,
          length: logistics.length
      },
      freeShipping: true 
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Air Fryer Importada.`);
    console.log(`📄 SKU: ${skuCode} | Tipo: ${logistics.type}`);
    browser.disconnect();
}

startScraper();