// importador-v9-tv.js
// VERSÃO ESPECIAL TVS (Logística Inteligente)
// - Margem de +25% no preço
// - Bloqueio de Correios para TVs grandes (>40")
// - Garantia de 12 meses

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const path = require('path');
const slugify = require('slugify');

puppeteer.use(StealthPlugin());

// --- CONFIGURAÇÕES ---
const SANITY_CONFIG = {
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
};

// ⚠️ ATENÇÃO: SUBSTITUA PELO ID DA SUA CATEGORIA DE TVS
const CATEGORY_ID = 'cat-smart-tvs-e-video'; // Exemplo: ajuste se necessário

const client = createClient(SANITY_CONFIG);

// --- 1. DETECTOR DE MARCA ---
function getBrand(title) {
    const brands = [
        'Samsung', 'LG', 'TCL', 'Philco', 'Philips', 'Sony', 'AOC', 
        'Panasonic', 'Toshiba', 'Multilaser', 'Aiwa', 'Hisense', 'Semp'
    ];
    const titleUpper = title.toUpperCase();
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) return brand;
    }
    return 'Genérica';
}

// --- 2. CALCULADORA DE LOGÍSTICA (A MÁGICA ACONTECE AQUI) ---
function estimateLogistics(title) {
    const titleUpper = title.toUpperCase();
    
    // Tenta encontrar o tamanho da polegada no título (ex: "TV 50", "55 Polegadas", "43''")
    const match = titleUpper.match(/(\d{2})["'”\s]*(?:POL|INCH|''|”)/i) || titleUpper.match(/\s(\d{2})\s/);
    const inches = match ? parseInt(match[1]) : 32; // Se não achar, assume 32" padrão

    console.log(`📏 Tamanho detectado: ${inches} polegadas`);

    // Tabela de Estimativa Segura (Peso + Caixa Reforçada)
    if (inches <= 32) {
        return { inches, weight: 6, width: 80, height: 52, length: 15 }; // Passa nos Correios
    } else if (inches <= 43) {
        // FORÇA 105cm para bloquear Correios (Segurança)
        return { inches, weight: 12, width: 105, height: 65, length: 16 }; 
    } else if (inches <= 50) {
        return { inches, weight: 16, width: 120, height: 75, length: 17 };
    } else if (inches <= 55) {
        return { inches, weight: 20, width: 135, height: 85, length: 18 };
    } else if (inches <= 65) {
        return { inches, weight: 28, width: 155, height: 95, length: 20 };
    } else {
        // Gigantes (75"+)
        return { inches, weight: 40, width: 175, height: 110, length: 25 };
    }
}

async function uploadImageToSanity(imageUrl) {
  try {
    const cleanUrl = imageUrl.split('?')[0]; 
    const response = await axios.get(cleanUrl, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload('image', buffer, { filename: path.basename(cleanUrl) });
    return asset._id;
  } catch (error) {
    return null;
  }
}

async function startScraper() {
  console.log('🔌 Conectando ao Chrome (Modo Debug)...');
  
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado (porta 9222).");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Analisando TV...');

  try {
    await page.evaluate(async () => { window.scrollBy(0, document.body.scrollHeight); });
    await new Promise(r => setTimeout(r, 1000));

    // EXTRAÇÃO
    const rawData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1') || document.querySelector('.product-title-text') || document.querySelector('.ui-pdp-title');
        
        const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                        document.querySelector('.price') || 
                        document.querySelector('.sale-price') ||
                        document.querySelector('.andes-money-amount__fraction');
        
        let rawPrice = 0;
        if (priceEl) {
            const onlyNumbers = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
            rawPrice = parseFloat(onlyNumbers);
        }

        const data = {
            title: titleEl ? titleEl.innerText : 'TV Sem Título',
            originalPrice: rawPrice || 0,
            images: []
        };

        // Imagens (JSON-LD + Fallback)
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(s => {
            try {
                const json = JSON.parse(s.innerText);
                if ((json['@type'] === 'Product' || json['@type'] === 'ItemPage') && json.image) {
                    const imgs = Array.isArray(json.image) ? json.image : [json.image];
                    data.images.push(...imgs);
                }
            } catch(e){}
        });

        if (data.images.length === 0) {
            document.querySelectorAll('img').forEach(img => {
                if(img.naturalWidth > 400 || img.width > 400) { // Filtro mais rigoroso para TV
                    let src = img.getAttribute('src');
                    if (img.getAttribute('data-zoom')) src = img.getAttribute('data-zoom');
                    data.images.push(src); 
                }
            });
        }
        return data;
    });

    console.log(`📺 Produto: ${rawData.title}`);

    // --- PREÇIFICAÇÃO (+25%) ---
    const finalPrice = rawData.originalPrice > 0 ? (rawData.originalPrice * 1.25) : 0; 
    console.log(`💰 Custo: R$ ${rawData.originalPrice} -> Venda (+25%): R$ ${finalPrice.toFixed(2)}`);

    // --- IMAGENS ---
    const uniqueImages = [...new Set(rawData.images.map(u => u ? u.split('?')[0] : null))].filter(Boolean);
    const finalImages = uniqueImages.filter(u => u.startsWith('http')).slice(0, 6);

    if (finalImages.length === 0) {
        console.error("❌ Sem imagens.");
        browser.disconnect(); return;
    }

    console.log(`⬆️ Subindo ${finalImages.length} imagens...`);
    const assetIds = [];
    for (const url of finalImages) {
        const id = await uploadImageToSanity(url);
        if (id) assetIds.push(id);
    }

    // --- DADOS INTELIGENTES ---
    const detectedBrand = getBrand(rawData.title);
    const logisticsInfo = estimateLogistics(rawData.title);
    const skuCode = `TV${logisticsInfo.inches}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}`
      },
      isActive: true,
      lote: 'Importação V9 (TVs)',
      productType: 'tech',
      brand: detectedBrand,
      warranty: '12 meses',

      categories: [{ _type: 'reference', _ref: CATEGORY_ID }],

      price: parseFloat(finalPrice.toFixed(2)),
      oldPrice: rawData.originalPrice > 0 ? rawData.originalPrice : null,

      images: assetIds.map(id => ({ 
        _type: 'image', 
        _key: id, 
        asset: { _type: 'reference', _ref: id } 
      })),

      description: [ 
        { 
            _type: 'block', 
            children: [{ _type: 'span', text: `Smart TV ${logisticsInfo.inches} polegadas. Garantia de 12 meses. Consulte disponibilidade de entrega para sua região.` }] 
        } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: 'Padrão',
            price: parseFloat(finalPrice.toFixed(2)),
            oldPrice: null,
            stock: 3, // Estoque baixo por segurança
            variantImage: assetIds[0] ? { _type: 'image', asset: { _type: 'reference', _ref: assetIds[0] } } : null
        }
      ],

      techSpecs: {
        screen: `${logisticsInfo.inches} polegadas`,
        camera: null,
        processor: null,
        battery: null,
        os: 'Smart TV'
      },

      // --- LOGÍSTICA CALCULADA (ANTI-CORREIOS para >40") ---
      logistics: {
        weight: logisticsInfo.weight,
        width: logisticsInfo.width,
        height: logisticsInfo.height,
        length: logisticsInfo.length
      },
      
      // Frete Grátis? Cuidado com TV. Deixei false por segurança.
      freeShipping: false 
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! TV cadastrada.`);
    console.log(`🚚 Logística Configurada: ${logisticsInfo.weight}kg | Largura: ${logisticsInfo.width}cm`);
    
    browser.disconnect();

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if(browser) browser.disconnect();
  }
}

startScraper();