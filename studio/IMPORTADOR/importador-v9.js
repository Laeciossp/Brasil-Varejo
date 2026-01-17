// importador-v9.js
// VERSÃO LIMPA: Sem tentar adivinhar specs ou descrição
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

// ID da Categoria (Smartphones)
const CATEGORY_ID = 'cd229cb8-6d7b-44d5-82a8-e4e2b5a9a9b8'; 

const client = createClient(SANITY_CONFIG);

// --- DETECTAR MARCA (Isso costuma funcionar bem, mantive) ---
function getBrand(title) {
    const brands = [
        'Motorola', 'Samsung', 'Apple', 'Xiaomi', 'LG', 'Nokia', 'Asus', 'Realme', 
        'Poco', 'Infinix', 'Sony', 'Huawei', 'Positivo', 'Multilaser', 'Philco'
    ];
    const found = brands.find(b => title.toLowerCase().includes(b.toLowerCase()));
    return found || 'Genérica';
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
    return null;
  }
}

async function startScraper() {
  console.log('🔌 Conectando ao Chrome...');
  
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
  
  console.log('✅ Conectado! Lendo dados básicos...');

  try {
    // Scroll para carregar imagens
    await page.evaluate(async () => {
        window.scrollBy(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 1000));

    // EXTRAÇÃO (Somente Título, Preço e Imagens)
    const rawData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1');
        
        // Seletores de preço
        const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                        document.querySelector('.price') || 
                        document.querySelector('.sale-price');
        
        let rawPrice = 0;
        if (priceEl) {
            const onlyNumbers = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
            rawPrice = parseFloat(onlyNumbers);
        }

        const data = {
            title: titleEl ? titleEl.innerText : 'Produto Sem Título',
            originalPrice: rawPrice || 0,
            images: []
        };

        // Imagens (Prioridade JSON-LD)
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(s => {
            try {
                const json = JSON.parse(s.innerText);
                if (json['@type'] === 'Product' && json.image) {
                    const imgs = Array.isArray(json.image) ? json.image : [json.image];
                    data.images.push(...imgs);
                }
            } catch(e){}
        });

        // Imagens (Fallback DOM)
        if (data.images.length === 0) {
            document.querySelectorAll('img').forEach(img => {
                if(img.width > 200) data.images.push(img.src); 
            });
        }

        return data;
    });

    console.log(`📦 Produto: ${rawData.title}`);

    // --- PREÇO +25% ---
    const finalPrice = rawData.originalPrice * 1.25; 

    // --- FILTRO IMAGENS ---
    const uniqueImages = [...new Set(rawData.images.map(u => u.split('?')[0]))];
    const finalImages = uniqueImages.filter(u => u.startsWith('http')).slice(0, 8);

    if (finalImages.length === 0) {
        console.error("❌ Nenhuma imagem encontrada.");
        browser.disconnect(); return;
    }

    console.log('⬆️ Subindo imagens...');
    const assetIds = [];
    for (const url of finalImages) {
        const id = await uploadImageToSanity(url);
        if (id) assetIds.push(id);
    }

    const detectedBrand = getBrand(rawData.title);
    const skuCode = Math.random().toString(36).substring(7).toUpperCase();

    // --- CRIAÇÃO DO DOCUMENTO ---
    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(rawData.title, { lower: true, strict: true }).slice(0, 90) + `-${Date.now()}` 
      },
      isActive: true,
      lote: 'Importação V9 (Limpa)',
      productType: 'tech',
      brand: detectedBrand,

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

      // --- DESCRIÇÃO LIMPA (Para você editar depois) ---
      description: [ 
        { 
            _type: 'block', 
            children: [{ _type: 'span', text: 'Descrição pendente. Utilizar IA para gerar.' }] 
        } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: 'Padrão', // Nome genérico para não errar
            price: parseFloat(finalPrice.toFixed(2)),
            oldPrice: rawData.originalPrice > 0 ? rawData.originalPrice : null,
            stock: 10,
            variantImage: assetIds[0] ? { _type: 'image', asset: { _type: 'reference', _ref: assetIds[0] } } : null
        }
      ],

      // --- FICHA TÉCNICA ZERADA (Para preencher manualmente) ---
      techSpecs: {
        screen: null,
        camera: null,
        processor: null,
        battery: null,
        os: null
      },

      logistics: {
        weight: 0.5,
        width: 15,
        height: 5,
        length: 20
      },
      
      freeShipping: true
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Produto criado (Campos de texto vazios para edição). ID: ${result._id}`);
    
    browser.disconnect();

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if(browser) browser.disconnect();
  }
}

startScraper();