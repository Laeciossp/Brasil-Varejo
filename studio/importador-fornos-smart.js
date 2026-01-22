// importador-fornos-v2-fixed.js
// CORREÇÃO: Remove o campo 'type' do objeto logistics antes de enviar ao Sanity.

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const path = require('path');
const slugify = require('slugify');

puppeteer.use(StealthPlugin());

// --- CONFIGURAÇÃO ---
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

// --- INTELIGÊNCIA ---

function getBrand(title) {
    const brands = [
        'Fischer', 'Mueller', 'Layr', 'Philco', 'Oster', 
        'Britânia', 'Mondial', 'Nardelli', 'Venax', 'Brastemp', 
        'Electrolux', 'Consul', 'Suggar', 'Built', 'Midea', 'Dako'
    ];
    const titleUpper = title.toUpperCase();
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) return brand;
    }
    return 'Genérica'; 
}

function extractSpecsFromTitle(title) {
    const titleUpper = title.toUpperCase();
    const litragemMatch = titleUpper.match(/(\d+)\s*(L|LITROS)/);
    const capacityVal = litragemMatch ? parseInt(litragemMatch[1]) : 44; 

    const isBuiltIn = titleUpper.includes('EMBUTIR');
    const isInox = titleUpper.includes('INOX') || titleUpper.includes('PRATA');
    const isGrill = titleUpper.includes('GRILL') || titleUpper.includes('DOURADOR');
    
    return { capacityVal, isBuiltIn, isInox, isGrill };
}

function calculateLogistics(capacity, isBuiltIn) {
    // Retorna objeto com 'type' para log, mas usaremos filtro na hora de salvar
    if (isBuiltIn) {
        return { type: 'EMBUTIR', weight: 18.5, width: 65, height: 60, length: 65 };
    }
    if (capacity >= 50) {
        return { type: 'FAMÍLIA 50L+', weight: 10.5, width: 62, height: 45, length: 50 };
    }
    if (capacity >= 35) {
        return { type: 'PADRÃO 44L', weight: 7.2, width: 55, height: 35, length: 40 };
    }
    return { type: 'COMPACTO', weight: 5.5, width: 48, height: 32, length: 38 };
}

function calculatePowerInfo(capacity, isBuiltIn) {
    let powerW = 1750;
    if (capacity < 30) powerW = 1500;
    if (capacity >= 50) powerW = 2000;
    if (isBuiltIn) powerW = 2400; 

    const consumptionKWh = (powerW / 1000).toFixed(2);
    return { power: `${powerW}W`, consumption: `${consumptionKWh} kWh` };
}

async function uploadMediaToSanity(mediaUrl) {
  try {
    const cleanUrl = mediaUrl.split('?')[0];
    if (cleanUrl.includes('.svg') || cleanUrl.includes('icon')) return null;

    const response = await axios.get(cleanUrl, { 
        responseType: 'arraybuffer',
        timeout: 20000, 
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload('image', buffer, { filename: path.basename(cleanUrl) });
    return { id: asset._id, type: 'image' };
  } catch (error) { return null; }
}

async function startScraper() {
  console.log('🔌 Conectando (Modo Fornos V2)...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado.");
      return;
  }
  
  const page = (await browser.pages())[0]; 
  
  // Scroll
  await page.evaluate(async () => {
      await new Promise((resolve) => {
          let totalHeight = 0, distance = 300, ticks = 0;
          const timer = setInterval(() => {
              window.scrollBy(0, distance);
              totalHeight += distance;
              ticks++;
              if(ticks >= 30 || totalHeight >= document.body.scrollHeight) { 
                  clearInterval(timer); resolve();
              }
          }, 100);
      });
  });

  const rawData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1') || document.querySelector('.product-title-text');
        
        let rawPrice = 0;
        const metaPrice = document.querySelector('meta[property="product:price:amount"]');
        if (metaPrice) rawPrice = parseFloat(metaPrice.content);
        else {
            const priceEl = document.querySelector('.price') || document.querySelector('[data-testid="product-price-value"]');
            if (priceEl) rawPrice = parseFloat(priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.'));
        }

        const data = {
            title: titleEl ? titleEl.innerText : 'Forno Elétrico',
            originalPrice: rawPrice || 0,
            medias: []
        };

        const imgs = document.querySelectorAll('img');
        imgs.forEach(img => {
            let src = img.getAttribute('src') || img.getAttribute('data-src');
            if(src && img.naturalWidth > 400) data.medias.push(src);
        });

        return data;
    });

    // --- PROCESSAMENTO ---
    const detectedBrand = getBrand(rawData.title);
    const specs = extractSpecsFromTitle(rawData.title);
    const logistics = calculateLogistics(specs.capacityVal, specs.isBuiltIn);
    const powerInfo = calculatePowerInfo(specs.capacityVal, specs.isBuiltIn);

    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.25) : 0; 

    // Imagens
    const uniqueMedias = [...new Set(rawData.medias)].slice(0, 6);
    const uploadedAssets = [];
    console.log(`📸 Baixando ${uniqueMedias.length} imagens...`);
    
    for (const url of uniqueMedias) {
        const res = await uploadMediaToSanity(url);
        if (res) uploadedAssets.push(res);
    }
    
    if (uploadedAssets.length === 0) {
        console.error("❌ Sem imagens."); browser.disconnect(); return;
    }

    const skuBase = `FOR-${detectedBrand.substring(0,3).toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const mainImageRef = { _type: 'image', asset: { _type: 'reference', _ref: uploadedAssets[0].id } };

    const variantsList = [
        {
            _key: `${skuBase}-127`,
            variantName: '127V',
            sku: `${skuBase}-127`,    
            size: '127V', 
            color: 'Padrão', 
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 3,
            variantImage: mainImageRef
        },
        {
            _key: `${skuBase}-220`,
            variantName: '220V',
            sku: `${skuBase}-220`,
            size: '220V', 
            color: 'Padrão',
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 3,
            variantImage: mainImageRef
        }
    ];

    const specList = [
        { _key: generateKey(), label: 'Capacidade', value: `${specs.capacityVal} Litros` },
        { _key: generateKey(), label: 'Potência Elétrica (W)', value: powerInfo.power },
        { _key: generateKey(), label: 'Consumo (kWh)', value: powerInfo.consumption },
        { _key: generateKey(), label: 'Tipo', value: specs.isBuiltIn ? 'De Embutir' : 'De Bancada' },
        { _key: generateKey(), label: 'Voltagem', value: '127V ou 220V (Selecionar)' }
    ];

    if (specs.isGrill) specList.push({ _key: generateKey(), label: 'Função', value: 'Com Grill Dourador' });

    let fullTitle = `Forno Elétrico ${detectedBrand} ${specs.capacityVal} Litros`;
    if (specs.isBuiltIn) fullTitle += ' de Embutir';

    console.log(`📦 Logística Identificada: ${logistics.type} (${logistics.weight}kg)`);

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { _type: 'slug', current: slugify(`${detectedBrand}-${specs.capacityVal}L-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) },
      isActive: true,
      lote: 'Eletro Fornos',
      productType: 'tech',
      brand: detectedBrand,
      
      categories: [{ _type: 'reference', _ref: CATEGORY_ID, _key: generateKey() }],
      
      price: parseFloat(salePrice.toFixed(2)),
      oldPrice: parseFloat(costPrice.toFixed(2)),

      images: uploadedAssets.map(i => ({ _type: 'image', _key: i.id, asset: { _type: 'reference', _ref: i.id } })),

      description: [{ 
        _type: 'block', _key: generateKey(), style: 'normal',
        children: [{ _type: 'span', text: `${fullTitle}. Ideal para assar, gratinar e aquecer. Produto robusto com isolamento térmico e timer programável.` }] 
      }],

      variants: variantsList,
      
      specifications: specList,

      // CORREÇÃO: Enviamos APENAS os campos numéricos para o Sanity
      logistics: {
          weight: logistics.weight,
          width: logistics.width,
          height: logistics.height,
          length: logistics.length
          // Note que NÃO enviamos o 'type' aqui, pois o Schema não aceita
      },

      techSpecs: { 
          screen: specs.isBuiltIn ? 'Embutir' : 'Bancada', 
          camera: `${specs.capacityVal}L`, 
          processor: powerInfo.power, 
          battery: 'Elétrico', 
          os: 'Analógico' 
      },
      
      freeShipping: true 
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Forno Importado.`);
    console.log(`🔌 Variantes: 127V e 220V criadas.`);
    
    browser.disconnect();
}

startScraper();