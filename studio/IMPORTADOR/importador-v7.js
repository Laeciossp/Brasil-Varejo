// importador-v7.js
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

// ID que você me passou (Smartphones)
const CATEGORY_ID = 'cd229cb8-6d7b-44d5-82a8-e4e2b5a9a9b8'; 

const client = createClient(SANITY_CONFIG);

// Função para tentar "adivinhar" especificações técnicas lendo o texto
function extractSpecs(text) {
  const specs = {
    processor: null,
    screen: null,
    camera: null,
    storage: null,
    ram: null
  };
  
  if (!text) return specs;
  const t = text.toLowerCase();

  // Tenta achar Memória (Ex: 128GB, 256GB)
  const storageMatch = text.match(/(\d+)\s?GB/i);
  if (storageMatch) specs.storage = storageMatch[0];

  // Tenta achar RAM (Ex: 8GB RAM)
  const ramMatch = text.match(/(\d+)\s?GB\s?RAM/i);
  if (ramMatch) specs.ram = ramMatch[0];

  // Tenta achar Câmera (Ex: 50MP)
  const cameraMatch = text.match(/(\d+)\s?MP/i);
  if (cameraMatch) specs.camera = `${cameraMatch[0]} Principal`;

  // Tenta achar Tela (Ex: 6.7")
  const screenMatch = text.match(/(\d+[.,]\d+)["”]/);
  if (screenMatch) specs.screen = `${screenMatch[1]} polegadas`;

  // Tenta achar Processador comum
  if (t.includes('snapdragon')) specs.processor = 'Snapdragon';
  if (t.includes('dimensity') || t.includes('mediatek')) specs.processor = 'MediaTek Dimensity';
  if (t.includes('exynos')) specs.processor = 'Samsung Exynos';
  if (t.includes('bionic')) specs.processor = 'Apple Bionic';

  return specs;
}

async function uploadImageToSanity(imageUrl) {
  try {
    const cleanUrl = imageUrl.split('?')[0]; 
    // Filtro simples: ignora ícones pequenos
    // ATENÇÃO: Removi a trava "casasbahia" para funcionar em qualquer site
    console.log(`   ⬇️ Baixando: ${cleanUrl.substring(0, 50)}...`);
    
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
      console.error("❌ Erro: Chrome debug não encontrado. Rode o comando no Executar primeiro.");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Lendo dados...');

  try {
    // Scroll para carregar imagens
    await page.evaluate(async () => {
        window.scrollBy(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 1500));

    // EXTRAÇÃO
    const rawData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1');
        // Tenta pegar preço de várias formas comuns
        const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                        document.querySelector('.price') || 
                        document.querySelector('.sale-price');
        
        const descEl = document.querySelector('#description') || document.querySelector('.description') || document.querySelector('h1');
        
        // Limpa o preço para pegar só números (Ex: "R$ 1.200,00" -> 1200.00)
        let rawPrice = 0;
        if (priceEl) {
            const onlyNumbers = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
            rawPrice = parseFloat(onlyNumbers);
        }

        const data = {
            title: titleEl ? titleEl.innerText : 'Produto Sem Título',
            originalPrice: rawPrice || 0,
            descriptionText: descEl ? descEl.innerText : '',
            images: []
        };

        // Coleta Imagens (JSON-LD + Tags IMG)
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
                if(img.width > 300) data.images.push(img.src); // Pega imagens grandes
            });
        }

        return data;
    });

    console.log(`📦 Produto: ${rawData.title}`);
    console.log(`💲 Preço Original Site: R$ ${rawData.originalPrice}`);

    // --- LÓGICA DE PREÇO (+25%) ---
    const finalPrice = rawData.originalPrice * 1.25; 
    console.log(`📈 Preço Final (+25%): R$ ${finalPrice.toFixed(2)}`);

    // --- FILTRAR IMAGENS ---
    const uniqueImages = [...new Set(rawData.images.map(u => u.split('?')[0]))];
    const finalImages = uniqueImages.filter(u => u.startsWith('http')).slice(0, 6); // Max 6 fotos

    if (finalImages.length === 0) {
        console.error("❌ Nenhuma imagem encontrada. Abortando.");
        browser.disconnect(); 
        return;
    }

    // --- UPLOAD IMAGENS ---
    console.log('⬆️ Subindo imagens...');
    const assetIds = [];
    for (const url of finalImages) {
        const id = await uploadImageToSanity(url);
        if (id) assetIds.push(id);
    }

    // --- INTELIGÊNCIA DE DADOS ---
    const specs = extractSpecs(rawData.title + " " + rawData.descriptionText);
    const skuCode = Math.random().toString(36).substring(7).toUpperCase();

    // --- MONTAGEM DO DOCUMENTO SANITY (SEGUINDO SEU SCHEMA) ---
    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(rawData.title, { lower: true, strict: true }).slice(0, 90) + `-${Date.now()}` 
      },
      isActive: true,
      lote: 'Importação Auto v7',
      productType: 'tech', // Força TECH para abrir a aba correta
      
      // Categorias (ID que você passou)
      categories: [
        { _type: 'reference', _ref: CATEGORY_ID }
      ],

      // Preços Base
      price: parseFloat(finalPrice.toFixed(2)),
      oldPrice: rawData.originalPrice > 0 ? rawData.originalPrice : null,

      // Imagens Principais
      images: assetIds.map(id => ({ 
        _type: 'image', 
        _key: id, 
        asset: { _type: 'reference', _ref: id } 
      })),

      // Descrição
      description: [ 
        { 
            _type: 'block', 
            children: [{ _type: 'span', text: rawData.descriptionText.substring(0, 500) + "..." }] 
        } 
      ],

      // Variações (Obrigatório no seu schema)
      variants: [
        {
            _key: skuCode, // ID aleatório para a lista
            variantName: specs.storage ? `${specs.storage} - Padrão` : 'Padrão',
            price: parseFloat(finalPrice.toFixed(2)),
            oldPrice: rawData.originalPrice > 0 ? rawData.originalPrice : null,
            stock: 10, // Estoque fictício inicial
            capacity: specs.storage,
            ram: specs.ram,
            // Usa a primeira foto como foto da variação também
            variantImage: assetIds[0] ? { _type: 'image', asset: { _type: 'reference', _ref: assetIds[0] } } : null
        }
      ],

      // Ficha Técnica Tech (Preenchida via Regex)
      techSpecs: {
        screen: specs.screen,
        camera: specs.camera,
        processor: specs.processor,
        // Se quiser salvar o armazenamento aqui também além da variação:
        // storage: specs.storage 
      },

      // Dados Logísticos Padrão
      logistics: {
        weight: 0.5,
        width: 15,
        height: 5,
        length: 20
      },
      
      freeShipping: true
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Produto ID: ${result._id}`);
    console.log(`🔗 Categoria Vinculada: Smartphones`);
    
    browser.disconnect();

  } catch (error) {
    console.error('❌ Erro Fatal:', error.message);
    if(browser) browser.disconnect();
  }
}

startScraper();