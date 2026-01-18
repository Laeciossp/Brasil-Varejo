// importador-games-universal.js
// VERSÃO: UNIVERSAL (Detecta Console, Portátil, Controle, Jogo e Acessórios)
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

// ✅ CATEGORIA: Video Games
const CATEGORY_ID = 'cat-video-games'; 
const client = createClient(SANITY_CONFIG);

const generateKey = () => Math.random().toString(36).substring(2, 15);

function getBrand(title) {
    const t = title.toUpperCase();
    if (t.includes('SONY') || t.includes('PLAYSTATION') || t.includes('PS5') || t.includes('PS4') || t.includes('DUALSENSE')) return 'Sony';
    if (t.includes('MICROSOFT') || t.includes('XBOX') || t.includes('SERIES S') || t.includes('SERIES X')) return 'Microsoft';
    if (t.includes('NINTENDO') || t.includes('SWITCH') || t.includes('JOY-CON') || t.includes('MARIO') || t.includes('ZELDA')) return 'Nintendo';
    if (t.includes('VALVE') || t.includes('STEAM DECK')) return 'Valve';
    if (t.includes('ASUS') && t.includes('ALLY')) return 'Asus ROG';
    if (t.includes('LOGITECH')) return 'Logitech';
    if (t.includes('GAMESIR')) return 'GameSir';
    if (t.includes('8BITDO')) return '8BitDo';
    return 'Genérica';
}

// 🧠 O CÉREBRO DO SCRIPT: DETECÇÃO INTELIGENTE DE TIPO E LOGÍSTICA
function detectProductProfile(title) {
    const t = title.toUpperCase();

    // 1. CONTROLES E ACESSÓRIOS PEQUENOS
    // Prioridade alta para não confundir "Controle PS5" com "Console PS5"
    if (t.includes('CONTROLE') || t.includes('JOYSTICK') || t.includes('JOY-CON') || t.includes('GAMEPAD') || t.includes('CARREGADOR') || t.includes('BASE') || t.includes('DOCK')) {
        return {
            type: 'acessorio',
            skuPrefix: 'ACC-',
            logistics: { weight: 0.6, width: 20, height: 10, length: 20 }, // Caixa Padrão Acessório
            shipping: false // Geralmente cobra frete
        };
    }

    // 2. JOGOS (MÍDIA FÍSICA)
    if (t.includes('JOGO') || t.includes('GAME') || t.includes('CD') || t.includes('BLURAY') || t.includes('MÍDIA FÍSICA')) {
        return {
            type: 'jogo',
            skuPrefix: 'GAME-',
            logistics: { weight: 0.2, width: 18, height: 2, length: 14 }, // Envelope ou caixa fina
            shipping: false
        };
    }

    // 3. CONSOLES GRANDES (PS5, SERIES X)
    if ((t.includes('PS5') || t.includes('PLAYSTATION 5') || t.includes('SERIES X')) && !t.includes('SLIM')) {
        return {
            type: 'console-big',
            skuPrefix: 'CON-',
            logistics: { weight: 6.5, width: 47, height: 18, length: 43 }, // Caixa PS5 Fat
            shipping: true // Frete Grátis
        };
    }

    // 4. CONSOLES MÉDIOS (PS5 SLIM, SERIES S)
    if (t.includes('SERIES S') || t.includes('SLIM') || t.includes('PS4')) {
        return {
            type: 'console-mid',
            skuPrefix: 'CON-',
            logistics: { weight: 3.8, width: 36, height: 13, length: 29 }, // Caixa Series S / Slim
            shipping: true
        };
    }

    // 5. PORTÁTEIS PEQUENOS (SWITCH LITE)
    if (t.includes('LITE') && t.includes('SWITCH')) {
        return {
            type: 'console-lite',
            skuPrefix: 'NSW-',
            logistics: { weight: 0.9, width: 25, height: 12, length: 15 }, // Caixa Lite
            shipping: true
        };
    }

    // 6. PORTÁTEIS HÍBRIDOS (SWITCH OLED/V2, STEAM DECK)
    if (t.includes('SWITCH') || t.includes('STEAM DECK') || t.includes('ALLY')) {
        return {
            type: 'console-hybrid',
            skuPrefix: 'CON-',
            logistics: { weight: 1.6, width: 28, height: 23, length: 12 }, // Caixa OLED
            shipping: true
        };
    }

    // DEFAULT (Se não souber o que é, trata como acessório genérico médio)
    return {
        type: 'genérico',
        skuPrefix: 'GEN-',
        logistics: { weight: 1.0, width: 20, height: 10, length: 20 },
        shipping: false
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
    console.warn(`   ⚠️ PULEI (Erro download): ${error.message}`);
    return null; 
  }
}

async function startScraper() {
  console.log('🔌 Conectando ao Chrome (Modo Universal Games)...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado. Rode: chrome.exe --remote-debugging-port=9222");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Analisando o produto...');

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
        const titleEl = document.querySelector('h1') || document.querySelector('.product-title-text') || document.querySelector('.ui-pdp-title');
        
        // PREÇO
        const metaPrice = document.querySelector('meta[property="product:price:amount"]') || 
                          document.querySelector('meta[property="og:price:amount"]');
        let rawPrice = 0;
        if (metaPrice && metaPrice.content) {
            rawPrice = parseFloat(metaPrice.content);
        } else {
            const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                            document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction') || 
                            document.querySelector('.price');
            if (priceEl) {
                const cleanText = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
                rawPrice = parseFloat(cleanText);
            }
        }

        const data = {
            title: titleEl ? titleEl.innerText : 'Produto Gamer',
            originalPrice: rawPrice || 0,
            medias: []
        };

        // Imagens
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

        document.querySelectorAll('img').forEach(img => {
            if(img.naturalWidth > 500) { 
                let src = img.getAttribute('data-zoom') || img.getAttribute('src');
                if(src) data.medias.push(src);
            }
        });
        
        return data;
    });

    console.log(`📦 Produto: ${rawData.title}`);

    // --- CÁLCULO DE PREÇO ---
    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.25) : 0; 
    
    console.log(`💰 Custo Original: R$ ${costPrice.toFixed(2)}`);
    console.log(`📈 Preço Venda (+25%): R$ ${salePrice.toFixed(2)}`);

    const uniqueMedias = [...new Set(rawData.medias.map(u => u ? u.split('?')[0] : null))]
        .filter(u => u && u.startsWith('http') && !u.includes('.svg'));
    
    const uploadedAssets = [];
    for (const url of uniqueMedias.slice(0, 10)) {
        const result = await uploadMediaToSanity(url);
        if (result) uploadedAssets.push(result);
    }

    const imageAssets = uploadedAssets.filter(a => a.type === 'image');
    if (imageAssets.length === 0) {
        console.error("❌ Erro: Nenhuma imagem encontrada.");
        browser.disconnect(); return;
    }

    const detectedBrand = getBrand(rawData.title);
    
    // 🔥 AQUI A MÁGICA ACONTECE: Detecta o Perfil do Produto
    const profile = detectProductProfile(rawData.title);
    
    const skuCode = `${profile.skuPrefix}${Math.random().toString(36).substring(7).toUpperCase()}`;

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}`
      },
      isActive: true,
      lote: 'Importação Games Universal',
      productType: 'tech',
      brand: detectedBrand,
      warranty: profile.type.includes('console') ? '12 meses' : '3 meses', // Garantia menor para acessórios
      
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
                text: 'Produto original com garantia e nota fiscal.' 
            }] 
          } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: 'Padrão',
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: profile.type.includes('console') ? 3 : 10, // Menos estoque para consoles caros, mais para acessórios
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],
      
      techSpecs: { 
          screen: null, 
          camera: null, 
          processor: null, 
          battery: null, 
          os: null 
      },
      
      // ✅ LOGÍSTICA AUTOMÁTICA (Vem da função detectProductProfile)
      logistics: profile.logistics,
      freeShipping: profile.shipping
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Produto criado.`);
    console.log(`🧠 Perfil Detectado: ${profile.type.toUpperCase()}`);
    console.log(`⚖️ Peso definido: ${profile.logistics.weight}kg`);
    console.log(`📄 SKU: ${skuCode}`);
    
    browser.disconnect();
}

startScraper();