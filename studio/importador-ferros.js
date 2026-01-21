// importador-ferros.js
// VERSÃO: Ferros de Passar Inteligente (Seco, Vapor e Estação)
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
        'Black+Decker', 'Black Decker', 'Arno', 'Oster', 
        'Philips', 'Walita', 'Electrolux', 'Mallory', 
        'Mondial', 'Britânia', 'Singer', 'Philco'
    ];
    const titleUpper = title.toUpperCase();
    
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) {
            if (brand.toUpperCase().includes('BLACK')) return 'Black+Decker';
            if (brand.toUpperCase() === 'WALITA') return 'Philips Walita';
            return brand;
        }
    }
    return 'Genérica'; 
}

function extractSpecs(title) {
    const t = title.toUpperCase();
    
    // Potência
    const powerMatch = t.match(/(\d{3,4})\s*W/);
    const power = powerMatch ? `${powerMatch[1]}W` : '1000W+';

    // Voltagem
    let voltage = 'Bivolt/Verificar';
    if (t.includes('110V') || t.includes('127V')) voltage = '127V';
    if (t.includes('220V')) voltage = '220V';

    return { power, voltage };
}

// Define Logística baseada no TIPO de ferro
function calculateLogistics(title, rawFeatures) {
    const t = title.toUpperCase();
    // Verifica características enviadas no texto (ex: "É estação à vapor")
    const isStation = rawFeatures.includes('ESTAÇÃO') || t.includes('CALDEIRA') || t.includes('ESTAÇÃO');
    const isDry = rawFeatures.includes('A SECO') || t.includes('SECO') || t.includes('VFA'); // VFA é o clássico pesado
    
    // TIPO 1: ESTAÇÃO DE VAPOR (Gigante)
    if (isStation) {
        return {
            type: 'ESTAÇÃO DE VAPOR',
            weight: 4.5, // Base + Ferro
            width: 40, height: 30, length: 25
        };
    }

    // TIPO 2: FERRO A SECO (Clássico/Pesado)
    // Ex: Black+Decker VFA (Metal)
    if (isDry) {
        return {
            type: 'FERRO A SECO',
            weight: 1.6, // Mais pesado que o de plástico devido à base
            width: 13, height: 13, length: 25
        };
    }

    // TIPO 3: FERRO A VAPOR PADRÃO (Plástico)
    return {
        type: 'FERRO A VAPOR',
        weight: 1.2,
        width: 15, height: 17, length: 30
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
  console.log('🔌 Conectando ao Chrome (Modo Ferros de Passar)...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado. Rode: chrome.exe --remote-debugging-port=9222");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Passando a limpo os dados...');

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
        
        // Coleta texto da página para ajudar na identificação (seco vs vapor)
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
            title: titleEl ? titleEl.innerText : 'Ferro de Passar',
            originalPrice: rawPrice || 0,
            fullText: bodyText.slice(0, 5000), // Pega um pedaço do texto para análise
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
    
    // Analisa Título + Texto da página para saber se é seco ou vapor
    const logistics = calculateLogistics(rawData.title, rawData.fullText);

    console.log(`🔍 Detecção:`);
    console.log(`   - Marca: ${detectedBrand}`);
    console.log(`   - Tipo: ${logistics.type} (${logistics.weight}kg)`);
    console.log(`   - Potência: ${specs.power}`);

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

    const skuCode = `IRON-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Definição da TechSpec baseada no tipo
    let techProcessor = logistics.type === 'ESTAÇÃO DE VAPOR' ? 'Pressão de Vapor Alta' : specs.power;
    let techOS = logistics.type === 'FERRO A SECO' ? 'Base de Alumínio/Metal' : 'Base Antiaderente/Cerâmica';

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
                text: `Ferro de passar ${detectedBrand} (${logistics.type}). Alta eficiência com ${specs.power} de potência. Ideal para uso doméstico, garantindo roupas lisas e bem cuidadas.` 
            }] 
          } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: `Padrão (${specs.voltage})`,
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 12, 
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],
      
      techSpecs: { 
          screen: logistics.type, // Ex: "A Seco" ou "A Vapor"
          camera: specs.voltage,  
          processor: techProcessor, // Potência
          battery: 'Com Fio', 
          os: techOS // Material da base
      },
      
      // Logística Inteligente
      logistics: { 
          weight: logistics.weight,
          width: logistics.width,
          height: logistics.height,
          length: logistics.length
      },
      freeShipping: logistics.type === 'ESTAÇÃO DE VAPOR' 
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Ferro Cadastrado.`);
    console.log(`📄 SKU: ${skuCode} | Tipo Detectado: ${logistics.type}`);
    browser.disconnect();
}

startScraper();