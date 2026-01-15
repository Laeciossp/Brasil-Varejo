// importador-v8.js
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

// --- NOVA FUNÇÃO: DETECTAR MARCA ---
function getBrand(title) {
    const brands = [
        'Motorola', 'Samsung', 'Apple', 'Xiaomi', 'LG', 'Nokia', 'Asus', 'Realme', 
        'Poco', 'Infinix', 'Sony', 'Huawei', 'Positivo', 'Multilaser', 'Philco'
    ];
    // Procura a marca no título (ignorando maiúsculas/minúsculas)
    const found = brands.find(b => title.toLowerCase().includes(b.toLowerCase()));
    return found || 'Genérica';
}

// --- FUNÇÃO MELHORADA: EXTRAIR SPECS DO TEXTO ---
function extractSpecs(fullText) {
  const specs = {
    processor: 'Não informado',
    screen: 'Não informado',
    camera: 'Não informado',
    os: 'Não informado',
    battery: 'Não informado',
    storage: null,
    ram: null
  };
  
  if (!fullText) return specs;
  
  // Limpa o texto para facilitar a busca
  const t = fullText.replace(/\n/g, ' ').replace(/\s+/g, ' '); 

  // 1. Processador (Procura por "Processador:" ou palavras chave)
  const procMatch = fullText.match(/Processador:\s*([^:\n]+)/i);
  if (procMatch) {
      specs.processor = procMatch[1].trim();
  } else if (t.match(/Dimensity \d+|Snapdragon \d+|Helio \w+|Exynos \d+/i)) {
      specs.processor = t.match(/(Dimensity \d+|Snapdragon \d+|Helio \w+|Exynos \d+)/i)[0];
  }

  // 2. Sistema Operacional
  const osMatch = fullText.match(/Sistema operacional:\s*([^:\n]+)/i);
  if (osMatch) {
      specs.os = osMatch[1].trim();
  } else if (t.match(/Android \d+|iOS \d+/i)) {
      specs.os = t.match(/(Android \d+|iOS \d+)/i)[0];
  }

  // 3. Bateria
  const batMatch = fullText.match(/Bateria:\s*([^:\n]+)/i);
  if (batMatch) {
      specs.battery = batMatch[1].trim();
  } else {
      const mahMatch = t.match(/(\d{3,5})\s?mAh/i);
      if (mahMatch) specs.battery = mahMatch[0];
  }

  // 4. Tela
  const screenMatch = fullText.match(/Tela:\s*([^:\n]+)/i);
  if (screenMatch) {
     specs.screen = screenMatch[1].trim(); // Pega "6,7""
  } else {
     const inchMatch = t.match(/(\d+[.,]\d+)["”]/);
     if (inchMatch) specs.screen = `${inchMatch[1]} polegadas`;
  }

  // 5. Câmera
  const camMatch = fullText.match(/Câmeras?\s*Traseiras?:\s*([^:\n]+)/i);
  if (camMatch) {
      specs.camera = camMatch[1].trim();
  } else {
      const mpMatch = t.match(/(\d+)\s?MP/i);
      if (mpMatch) specs.camera = `${mpMatch[0]} Principal`;
  }

  // 6. Armazenamento e RAM (Para a Variação)
  const storageMatch = t.match(/(\d+)\s?GB/i);
  if (storageMatch) specs.storage = storageMatch[0];

  const ramMatch = t.match(/(\d+)\s?GB\s?RAM/i);
  if (ramMatch) specs.ram = ramMatch[0];

  return specs;
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
  
  console.log('✅ Conectado! Lendo dados...');

  try {
    // Scroll para carregar
    await page.evaluate(async () => {
        window.scrollBy(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 1000));

    // EXTRAÇÃO
    const rawData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1');
        
        // Seletores de preço variados
        const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                        document.querySelector('.price') || 
                        document.querySelector('.sale-price');
        
        // Tenta pegar a descrição do container principal ou do H1 se falhar
        const descEl = document.querySelector('#description') || document.querySelector('.description') || document.body;
        
        let rawPrice = 0;
        if (priceEl) {
            const onlyNumbers = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
            rawPrice = parseFloat(onlyNumbers);
        }

        const data = {
            title: titleEl ? titleEl.innerText : 'Produto Sem Título',
            originalPrice: rawPrice || 0,
            descriptionText: descEl ? descEl.innerText : '', // Pega TODO o texto da página
            images: []
        };

        // Imagens
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

        if (data.images.length === 0) {
            document.querySelectorAll('img').forEach(img => {
                // Filtro > 200px (seguro) + Limpeza de URL depois
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

    // --- INTEGRAÇÃO: EXTRAIR DADOS ---
    // Passamos o texto inteiro da descrição para a função inteligente
    const specs = extractSpecs(rawData.descriptionText);
    const detectedBrand = getBrand(rawData.title);
    
    console.log(`🧠 Marca Detectada: ${detectedBrand}`);
    console.log(`🧠 Specs Detectadas: Proc: ${specs.processor} | Bat: ${specs.battery}`);

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
      lote: 'Importação V8',
      productType: 'tech',
      
      // CAMPO NOVO: MARCA
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

      description: [ 
        { 
            _type: 'block', 
            children: [{ _type: 'span', text: rawData.descriptionText.substring(0, 2000) }] // Aumentei o limite de texto
        } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: specs.storage ? `${specs.storage} - Padrão` : 'Padrão',
            price: parseFloat(finalPrice.toFixed(2)),
            oldPrice: rawData.originalPrice > 0 ? rawData.originalPrice : null,
            stock: 10,
            capacity: specs.storage,
            ram: specs.ram,
            variantImage: assetIds[0] ? { _type: 'image', asset: { _type: 'reference', _ref: assetIds[0] } } : null
        }
      ],

      // TECH SPECS PREENCHIDA
      techSpecs: {
        screen: specs.screen,
        camera: specs.camera,
        processor: specs.processor,
        battery: specs.battery,
        os: specs.os
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
    console.log(`✅ SUCESSO COMPLETO! Produto ID: ${result._id}`);
    
    browser.disconnect();

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if(browser) browser.disconnect();
  }
}

startScraper();