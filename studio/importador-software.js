// importador-software-final.js
// VERSÃO: MAGALU ULTRA-RES (Ignora vídeos e força imagem gigante)

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const path = require('path');
const slugify = require('slugify');

puppeteer.use(StealthPlugin());

// --- CONFIGURAÇÕES SANITY ---
const SANITY_CONFIG = {
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
};

// ID da Categoria (Software/Informática)
const CATEGORY_ID = '9ca0fcfe-9f06-44db-8c84-f8d395b610ea'; 

const client = createClient(SANITY_CONFIG);

// Função para transformar URL pequena em GIGANTE (Magalu)
function getHighResUrl(url) {
    if (!url) return null;
    // Padrão Magalu: https://.../420x420/...
    // Vamos trocar qualquer coisa tipo "123x456" por "2000x2000"
    if (url.includes('mlcdn.com.br')) {
        return url.replace(/\/\d+x\d+\//, '/2000x2000/');
    }
    return url;
}

async function uploadImageToSanity(imageUrl) {
  try {
    // 1. Forçar Alta Resolução
    const highResUrl = getHighResUrl(imageUrl);
    const cleanUrl = highResUrl.split('?')[0]; 
    
    // 2. Filtro Anti-Vídeo Rigoroso
    if (cleanUrl.match(/\.(mp4|webm|avi|mov)$/i) || cleanUrl.includes('play') || cleanUrl.includes('youtube')) {
        console.log(`   🚫 Vídeo ignorado: ${cleanUrl}`);
        return null;
    }

    console.log(`   ⬇️ Baixando (HD): ${cleanUrl.substring(0, 50)}...`);
    
    const response = await axios.get(cleanUrl, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
        timeout: 20000
    });

    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload('image', buffer, { filename: path.basename(cleanUrl) });
    return asset._id;

  } catch (error) {
    // Se falhar a gigante, tenta a original como fallback
    if (imageUrl !== getHighResUrl(imageUrl)) {
        console.log(`   ⚠️ Alta resolução falhou, tentando original...`);
        return uploadImageToSanity(imageUrl); // Recursivo com original
    }
    console.error(`   ❌ Falha imagem: ${imageUrl}`);
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
      console.error("❌ Erro: Chrome debug não encontrado. Rode: chrome.exe --remote-debugging-port=9222");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Extraindo dados...');

  try {
    // Scroll para carregar imagens
    await page.evaluate(async () => {
        window.scrollBy(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 2000));

    // EXTRAÇÃO
    const rawData = await page.evaluate(() => {
        // Título
        const titleEl = document.querySelector('h1') || document.querySelector('[data-testid="heading"]');
        
        // Preço
        const priceEl = document.querySelector('[data-testid="price-value"]') || 
                        document.querySelector('.price-tag-fraction');
        
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

        // 1. Tenta pegar imagens do JSON-LD (Geralmente a melhor qualidade)
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(s => {
            try {
                const json = JSON.parse(s.innerText);
                // Procura em Product ou ItemList
                const product = json['@type'] === 'Product' ? json : (json.itemListElement ? json.itemListElement[0]?.item : null);
                
                if (product && product.image) {
                    const imgs = Array.isArray(product.image) ? product.image : [product.image];
                    data.images.push(...imgs);
                }
            } catch(e){}
        });

        // 2. Se falhar, pega do HTML específico do Magalu (data-testid="image")
        if (data.images.length === 0) {
            const imgElements = document.querySelectorAll('img[data-testid="image"]');
            imgElements.forEach(img => {
                let src = img.getAttribute('src');
                if (src && src.startsWith('http')) {
                    data.images.push(src);
                }
            });
        }

        return data;
    });

    console.log(`📦 Produto: ${rawData.title}`);
    console.log(`💰 Preço Original: R$ ${rawData.originalPrice}`);

    // --- CÁLCULO DE PREÇO (+25%) ---
    const finalPrice = rawData.originalPrice * 1.25; 
    console.log(`📈 Preço Final (+25%): R$ ${finalPrice.toFixed(2)}`);

    // --- LIMPEZA E UPLOAD DE IMAGENS ---
    // Remove duplicadas e ignora ícones pequenos
    const uniqueImages = [...new Set(rawData.images)];
    const validImages = uniqueImages.filter(u => !u.includes('icon') && !u.includes('svg'));

    console.log(`🔍 Encontradas ${validImages.length} URLs de imagem. Filtrando vídeos...`);

    const assetIds = [];
    // Pega no máximo 8 imagens
    for (const url of validImages.slice(0, 8)) {
        const id = await uploadImageToSanity(url);
        if (id) assetIds.push(id);
    }

    if (assetIds.length === 0) {
        console.error("❌ ERRO CRÍTICO: Nenhuma imagem válida foi baixada.");
        browser.disconnect(); return;
    }

    const skuCode = `SOFT-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // --- CRIAÇÃO NO SANITY ---
    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(rawData.title, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}` 
      },
      isActive: true,
      lote: 'Software Microsoft V10',
      productType: 'general',
      brand: 'Microsoft',

      categories: [
        { _type: 'reference', _ref: CATEGORY_ID }
      ],

      price: parseFloat(finalPrice.toFixed(2)),
      oldPrice: rawData.originalPrice > 0 ? parseFloat((rawData.originalPrice * 1.5).toFixed(2)) : null,

      images: assetIds.map(id => ({ 
        _type: 'image', 
        _key: id, 
        asset: { _type: 'reference', _ref: id } 
      })),

      description: [ 
        { 
            _type: 'block', 
            style: 'normal',
            children: [{ _type: 'span', text: 'Licença oficial Microsoft 365 Personal. Acesso aos apps premium do Office (Word, Excel, PowerPoint), 1TB de armazenamento na nuvem e segurança avançada para seus dados.' }] 
        } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: 'Licença 1 Ano', 
            price: parseFloat(finalPrice.toFixed(2)),
            stock: 50,
            sku: skuCode,
            variantImage: assetIds[0] ? { _type: 'image', asset: { _type: 'reference', _ref: assetIds[0] } } : null
        }
      ],

      logistics: {
        weight: 0.04, 
        width: 11,
        height: 14.5,
        length: 2
      },
      
      freeShipping: true
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Produto criado com imagens HD.`);
    console.log(`🔗 ID: ${result._id}`);
    
    browser.disconnect();

  } catch (error) {
    console.error('❌ Erro Fatal:', error.message);
    if(browser) browser.disconnect();
  }
}

startScraper();