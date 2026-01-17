// importador-v9-tablet.js
// VERSÃO TABLETS:
// - Margem de +25% no preço
// - Garantia de 12 Meses
// - Modo Debug (Chrome Aberto)

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

// ID da Categoria (TABLETS E ACESSÓRIOS)
const CATEGORY_ID = 'cat-tablets-e-acessorios'; 

const client = createClient(SANITY_CONFIG);

// --- DETECTAR MARCA ---
function getBrand(title) {
    const brands = [
        'Apple', 'Samsung', 'Xiaomi', 'Lenovo', 'Amazon', 'Microsoft', 
        'Huawei', 'Motorola', 'Realme', 'Nokia', 'TCL', 'Honor',
        'Philco', 'Multilaser', 'Positivo', 'Vaio', 'DL', 'Oukitel', 'Blackview'
    ];
    
    const titleUpper = title.toUpperCase();
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) {
            return brand;
        }
    }
    // Casos especiais
    if (titleUpper.includes('IPAD')) return 'Apple';
    if (titleUpper.includes('GALAXY TAB')) return 'Samsung';
    if (titleUpper.includes('FIRE HD')) return 'Amazon';
    if (titleUpper.includes('SURFACE')) return 'Microsoft';

    return 'Genérica';
}

async function uploadImageToSanity(imageUrl) {
  try {
    const cleanUrl = imageUrl.split('?')[0]; 
    console.log(`   ⬇️ Baixando: ${cleanUrl.substring(0, 40)}...`);
    
    const response = await axios.get(cleanUrl, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
    });
    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload('image', buffer, { filename: path.basename(cleanUrl) });
    return asset._id;
  } catch (error) {
    console.error(`   ❌ Falha ao baixar imagem: ${error.message}`);
    return null;
  }
}

async function startScraper() {
  console.log('🔌 Conectando ao Chrome (Modo Debug)...');
  
  let browser;
  try {
      browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9222',
        defaultViewport: null
      });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado.");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Lendo página ativa...');

  try {
    // Scroll para carregar imagens
    await page.evaluate(async () => {
        window.scrollBy(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 1000));

    // EXTRAÇÃO DE DADOS
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
            title: titleEl ? titleEl.innerText : 'Tablet Sem Título',
            originalPrice: rawPrice || 0,
            images: []
        };

        // Imagens via JSON-LD
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

        // Fallback Imagens
        if (data.images.length === 0) {
            document.querySelectorAll('img').forEach(img => {
                if(img.naturalWidth > 300 || img.width > 300) {
                    let src = img.getAttribute('src');
                    if (img.getAttribute('data-zoom')) src = img.getAttribute('data-zoom');
                    data.images.push(src); 
                }
            });
        }

        return data;
    });

    console.log(`📦 Tablet identificado: ${rawData.title}`);

    // --- CORREÇÃO: PREÇO + 25% ---
    const finalPrice = rawData.originalPrice > 0 ? (rawData.originalPrice * 1.25) : 0; 
    console.log(`💰 Preço Original: R$ ${rawData.originalPrice} -> Com Margem (25%): R$ ${finalPrice.toFixed(2)}`);

    const uniqueImages = [...new Set(rawData.images.map(u => u ? u.split('?')[0] : null))].filter(Boolean);
    const finalImages = uniqueImages.filter(u => u.startsWith('http')).slice(0, 8);

    if (finalImages.length === 0) {
        console.error("❌ Nenhuma imagem encontrada.");
        browser.disconnect(); return;
    }

    console.log(`⬆️ Subindo ${finalImages.length} imagens...`);
    const assetIds = [];
    for (const url of finalImages) {
        const id = await uploadImageToSanity(url);
        if (id) assetIds.push(id);
    }

    const detectedBrand = getBrand(rawData.title);
    const skuCode = `TAB-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}`
      },
      isActive: true,
      lote: 'Importação V9 (Tablets)',
      productType: 'tech',
      brand: detectedBrand,
      
      warranty: '12 meses', // Garantia Fixa

      categories: [
        { _type: 'reference', _ref: CATEGORY_ID } 
      ],

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
            children: [{ _type: 'span', text: 'Tablet com 12 meses de garantia. Detalhes técnicos completos em breve.' }] 
        } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: 'Padrão',
            price: parseFloat(finalPrice.toFixed(2)),
            oldPrice: null,
            stock: 8,
            variantImage: assetIds[0] ? { _type: 'image', asset: { _type: 'reference', _ref: assetIds[0] } } : null
        }
      ],

      techSpecs: {
        screen: null,
        camera: null,
        processor: null,
        battery: null,
        os: null
      },

      logistics: {
        weight: 0.8,
        width: 20,
        height: 5,
        length: 28
      },
      
      freeShipping: true
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Tablet criado com ID: ${result._id}`);
    
    browser.disconnect();

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if(browser) browser.disconnect();
  }
}

startScraper();