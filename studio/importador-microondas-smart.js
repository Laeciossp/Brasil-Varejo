// importador-microondas-v3-fixed.js
// CORREÇÃO: Gera SEMPRE as duas variações (127V e 220V) para os botões aparecerem.

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const path = require('path');
const slugify = require('slugify');

puppeteer.use(StealthPlugin());

// --- CONFIGURAÇÃO (Igual à anterior) ---
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
        'Brastemp', 'Electrolux', 'Consul', 'Panasonic', 'Midea', 
        'Philco', 'Britânia', 'LG', 'Samsung', 'Fischer', 
        'Mueller', 'Continental', 'Tramontina', 'Oster'
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
    const capacityVal = litragemMatch ? parseInt(litragemMatch[1]) : 30;

    const isBuiltIn = titleUpper.includes('EMBUTIR');
    const isMirrored = titleUpper.includes('ESPELHADO');
    
    return { capacityVal, isBuiltIn, isMirrored };
}

function calculateLogistics(capacity, isBuiltIn) {
    if (isBuiltIn) {
        return { type: 'EMBUTIR', weight: 18.5, width: 60, height: 45, length: 55 };
    }
    if (capacity >= 30) {
        return { type: 'FAMÍLIA', weight: 16.0, width: 55, height: 35, length: 48 };
    }
    return { type: 'COMPACTO', weight: 12.5, width: 49, height: 29, length: 39 };
}

function estimatePower(capacity, title) {
    const wattMatch = title.toUpperCase().match(/(\d{3,4})\s*W/);
    if (wattMatch) return wattMatch[0];
    if (capacity < 25) return '1100W';
    return '1000W+'; 
}

async function uploadMediaToSanity(mediaUrl) {
  try {
    const cleanUrl = mediaUrl.split('?')[0];
    const isVideo = cleanUrl.match(/\.(mp4|webm|mov|mkv)$/i);
    const assetType = isVideo ? 'file' : 'image';
    
    // Filtra ícones pequenos que as vezes vem no scraper
    if (cleanUrl.includes('.svg') || cleanUrl.includes('icon')) return null;

    const response = await axios.get(cleanUrl, { 
        responseType: 'arraybuffer',
        timeout: 20000, 
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload(assetType, buffer, { filename: path.basename(cleanUrl) });
    return { id: asset._id, type: assetType };
  } catch (error) { return null; }
}

async function startScraper() {
  console.log('🔌 Conectando (Modo Dual Voltage)...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado.");
      return;
  }
  
  const page = (await browser.pages())[0]; 
  
  // Scroll rápido
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
        
        // Preço
        let rawPrice = 0;
        const metaPrice = document.querySelector('meta[property="product:price:amount"]');
        if (metaPrice) rawPrice = parseFloat(metaPrice.content);
        else {
            const priceEl = document.querySelector('.price') || document.querySelector('[data-testid="product-price-value"]');
            if (priceEl) rawPrice = parseFloat(priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.'));
        }

        const data = {
            title: titleEl ? titleEl.innerText : 'Micro-ondas',
            originalPrice: rawPrice || 0,
            medias: []
        };

        // Imagens
        document.querySelectorAll('img').forEach(img => {
            let src = img.getAttribute('src') || img.getAttribute('data-src');
            if(src && img.naturalWidth > 400) data.medias.push(src);
        });

        return data;
    });

    const detectedBrand = getBrand(rawData.title);
    const specs = extractSpecsFromTitle(rawData.title);
    const logistics = calculateLogistics(specs.capacityVal, specs.isBuiltIn);
    const power = estimatePower(specs.capacityVal, rawData.title);

    // Preços
    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.35) : 0; 

    // Upload Imagens
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

    const skuBase = `MIC-${detectedBrand.substring(0,3).toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const mainImageRef = { _type: 'image', asset: { _type: 'reference', _ref: uploadedAssets[0].id } };

    // --- CORREÇÃO AQUI: GERA AS DUAS VARIANTES ---
    const variantsList = [
        {
            _key: `${skuBase}-127`,
            variantName: '127V',  // Nome exato para o botão
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 5,
            variantImage: mainImageRef
        },
        {
            _key: `${skuBase}-220`,
            variantName: '220V', // Nome exato para o botão
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 5,
            variantImage: mainImageRef
        }
    ];

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { _type: 'slug', current: slugify(`${detectedBrand}-${specs.capacityVal}L-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) },
      isActive: true,
      lote: 'Eletro Pesado',
      productType: 'tech',
      brand: detectedBrand,
      
      categories: [{ _type: 'reference', _ref: CATEGORY_ID, _key: generateKey() }],
      
      price: parseFloat(salePrice.toFixed(2)),
      oldPrice: parseFloat(costPrice.toFixed(2)),

      images: uploadedAssets.map(i => ({ _type: 'image', _key: i.id, asset: { _type: 'reference', _ref: i.id } })),

      description: [{ 
        _type: 'block', _key: generateKey(), style: 'normal',
        children: [{ _type: 'span', text: `Micro-ondas ${detectedBrand} ${specs.capacityVal}L. Potência: ${power}.` }] 
      }],

      // AQUI ESTÁ A MÁGICA:
      variants: variantsList,
      
      techSpecs: { 
          screen: specs.isMirrored ? 'Espelhado' : 'Digital', 
          camera: `${specs.capacityVal} Litros`, 
          processor: power, 
          battery: 'Elétrico', 
          os: specs.isBuiltIn ? 'De Embutir' : 'De Bancada'
      },
      
      logistics: logistics,
      freeShipping: true 
    };

    await client.create(doc);
    console.log(`✅ SUCESSO! 2 Variações Criadas (127V e 220V).`);
    console.log(`📄 SKU Base: ${skuBase}`);
    browser.disconnect();
}

startScraper();