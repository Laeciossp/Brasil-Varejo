// importador-v9-ar.js
// VERSÃO FINAL: Medidas Exatas de Loja (12k e 18k) para Frete Justo
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

// ID da Categoria "Ar e Ventilação"
const CATEGORY_ID = 'a518c70e-c623-4ca9-82b1-2fa9d741996d'; 

const client = createClient(SANITY_CONFIG);

const generateKey = () => Math.random().toString(36).substring(2, 15);

function getBrand(title) {
    const brands = [
        'Springer', 'Midea', 'Gree', 'Daikin', 'LG', 'Samsung', 'Electrolux', 
        'Consul', 'Philco', 'Elgin', 'Fujitsu', 'TCL', 'Hisense', 'Agratto', 
        'Komeco', 'Britânia', 'Olimpia Splendid'
    ];
    const titleUpper = title.toUpperCase();
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) return brand;
    }
    return 'Genérica';
}

function extractRealDimensions(fullText) {
    if (!fullText) return null;

    const cleanNum = (str) => {
        const match = str.match(/([\d,.]+)/);
        return match ? parseFloat(match[1].replace(',', '.')) : null;
    };

    const widthMatch = fullText.match(/(?:Largura|L):?[\s\n]*([\d,.]+)[\s\n]*(?:cm|mm)/i);
    const heightMatch = fullText.match(/(?:Altura|A):?[\s\n]*([\d,.]+)[\s\n]*(?:cm|mm)/i);
    const lengthMatch = fullText.match(/(?:Profundidade|P|Comprimento|C):?[\s\n]*([\d,.]+)[\s\n]*(?:cm|mm)/i);
    
    let weightMatch = fullText.match(/Peso Embalado:?[\s\n]*([\d,.]+)[\s\n]*(?:kg|g)/i);
    if (!weightMatch) {
        weightMatch = fullText.match(/(?:Peso|P):?[\s\n]*([\d,.]+)[\s\n]*(?:kg|g)/i);
    }

    if (widthMatch && heightMatch && lengthMatch) {
        return {
            width: cleanNum(widthMatch[1]),
            height: cleanNum(heightMatch[1]),
            length: cleanNum(lengthMatch[1]), 
            weight: weightMatch ? cleanNum(weightMatch[1]) : null
        };
    }
    return null;
}

// Medidas OTIMIZADAS para Frete (Compactas + Peso Real)
function estimateLogistics(title) {
    const titleUpper = title.toUpperCase();
    const match = titleUpper.match(/(\d{1,2})[\.,]?(\d{3})\s*(?:BTU|BTUS)/i) || 
                  titleUpper.match(/(\d{1,2})[Kk]\s*(?:BTU)?/i);
    
    let btus = 9000; 
    if (match) {
        if (match[0].toLowerCase().includes('k')) {
            btus = parseInt(match[1]) * 1000;
        } else {
            btus = parseInt(match[1] + match[2]);
        }
    }

    const base = { btus, weight: 30, width: 80, height: 55, length: 35 }; 
    
    if (btus <= 9000) return { ...base, weight: 32, width: 84, height: 55, length: 30 };
    
    // ✅ 12.000 BTUs (Medidas exatas fornecidas)
    else if (btus <= 12000) return { 
        btus, 
        weight: 29.8,  // Peso Embalado
        width: 80.5,   // Largura
        height: 28.5,  // Altura
        length: 19.4   // Profundidade
    };
    
    // ✅ 18.000 BTUs (Medidas exatas fornecidas)
    else if (btus <= 18000) return { 
        btus, 
        weight: 36.4, 
        width: 96,     
        height: 31,    
        length: 22.5   
    };
    
    else if (btus <= 24000) return { ...base, weight: 60, width: 110, height: 35, length: 25 };
    else return { ...base, weight: 80, width: 120, height: 40, length: 30 };
}

async function uploadMediaToSanity(mediaUrl) {
  try {
    const cleanUrl = mediaUrl.split('?')[0];
    const isVideo = cleanUrl.match(/\.(mp4|webm|mov|mkv)$/i);
    const assetType = isVideo ? 'file' : 'image';
    
    console.log(`   ⬇️ Baixando [${assetType.toUpperCase()}]: ${cleanUrl.substring(0, 40)}...`);
    
    const response = await axios.get(cleanUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000, 
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
  console.log('🔌 Conectando ao Chrome...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado.");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Buscando dados...');

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

    const rawData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1') || document.querySelector('.product-title-text') || document.querySelector('.ui-pdp-title');
        
        const metaPrice = document.querySelector('meta[property="product:price:amount"]') || 
                          document.querySelector('meta[property="og:price:amount"]');
        let rawPrice = 0;
        if (metaPrice && metaPrice.content) {
            rawPrice = parseFloat(metaPrice.content);
        } else {
            const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                            document.querySelector('.price') || 
                            document.querySelector('.sale-price');
            if (priceEl) {
                const cleanText = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
                rawPrice = parseFloat(cleanText);
            }
        }

        let descriptionText = '';
        const descSelectors = ['.ui-pdp-description__content', '#description', '.product-description', '.description', 'div[itemprop="description"]'];
        for (let sel of descSelectors) {
            const el = document.querySelector(sel);
            if (el && el.innerText.length > 50) {
                descriptionText = el.innerText;
                break;
            }
        }

        let technicalInfo = '';
        const tableRows = document.querySelectorAll('table tr, .ui-pdp-specs__table tr');
        if(tableRows.length > 0) {
            technicalInfo = "FICHA TÉCNICA:\n";
            tableRows.forEach(row => {
                const text = row.innerText.replace(/\n/g, ': ').trim();
                if(text.length > 3) technicalInfo += `- ${text}\n`;
            });
        }
        if (!technicalInfo || technicalInfo.length < 20) {
             const specs = document.querySelectorAll('.ui-pdp-specs__content, #specifications');
             if(specs.length > 0) {
                 technicalInfo = "FICHA TÉCNICA:\n";
                 specs.forEach(s => technicalInfo += `- ${s.innerText}\n`);
             }
        }

        const fullContentForAnalysis = (descriptionText + "\n" + technicalInfo);

        const data = {
            title: titleEl ? titleEl.innerText : 'Ar Condicionado Sem Título',
            originalPrice: rawPrice || 0,
            fullDescription: descriptionText || '',
            techInfo: technicalInfo || '',
            fullContent: fullContentForAnalysis,
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
                if (json.video && json.video.contentUrl) {
                     data.medias.push(json.video.contentUrl);
                }
            } catch(e){}
        });

        document.querySelectorAll('img').forEach(img => {
            if(img.naturalWidth > 400 || img.width > 400) {
                let src = img.getAttribute('data-zoom') || img.getAttribute('src');
                if(src) data.medias.push(src);
            }
        });

        document.querySelectorAll('video source, video').forEach(v => {
            const src = v.src || v.getAttribute('src');
            if (src && src.startsWith('http') && (src.includes('.mp4') || src.includes('.webm'))) {
                data.medias.push(src);
            }
        });

        return data;
    });

    console.log(`❄️ Produto: ${rawData.title}`);

    // --- LÓGICA DE FRETE ---
    const realData = extractRealDimensions(rawData.fullContent);
    const estimatedLogistics = estimateLogistics(rawData.title);

    let finalLogistics = { ...estimatedLogistics };

    // Se achou dados reais no texto, avalia se vale a pena
    if (realData) {
        if (realData.weight) finalLogistics.weight = realData.weight;
        
        if (realData.width && realData.height && realData.length) {
             const cubicWeight = (realData.width * realData.height * realData.length) / 6000;
             // Só usa as medidas do site se a cubagem for razoável (< 2x o peso real)
             // Caso contrário, usa as medidas "Smart" da estimateLogistics
             if (cubicWeight < (finalLogistics.weight * 2)) {
                 console.log(`📏 Medidas do site aprovadas (Volume OK).`);
                 finalLogistics.width = realData.width;
                 finalLogistics.height = realData.height;
                 finalLogistics.length = realData.length;
             } else {
                 console.log(`⚠️ Medidas do site rejeitadas (Volume Abusivo). Usando padrão compactado.`);
             }
        }
    }

    console.log(`🚚 Logística Final: ${finalLogistics.weight}kg | ${finalLogistics.width}x${finalLogistics.height}x${finalLogistics.length}cm`);

    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.25) : 0;
    
    const uniqueMedias = [...new Set(rawData.medias.map(u => u ? u.split('?')[0] : null))]
        .filter(u => u && u.startsWith('http') && !u.includes('.svg'));
    
    const uploadedAssets = [];
    for (const url of uniqueMedias.slice(0, 10)) {
        const result = await uploadMediaToSanity(url);
        if (result) uploadedAssets.push(result);
    }

    const imageAssets = uploadedAssets.filter(a => a.type === 'image');
    const videoAssets = uploadedAssets.filter(a => a.type === 'file');

    if (imageAssets.length === 0) {
        console.error("❌ Sem imagens.");
        browser.disconnect(); return;
    }

    const detectedBrand = getBrand(rawData.title);
    const skuCode = `AR${estimatedLogistics.btus}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const descriptionBlock = [];
    if (rawData.fullDescription) {
        descriptionBlock.push({ 
            _type: 'block', 
            _key: generateKey(),
            style: 'normal',
            children: [{ _type: 'span', _key: generateKey(), text: rawData.fullDescription }] 
        });
    } else {
        descriptionBlock.push({ 
            _type: 'block', 
            _key: generateKey(),
            style: 'normal',
            children: [{ _type: 'span', _key: generateKey(), text: `Ar Condicionado ${detectedBrand} ${estimatedLogistics.btus} BTUs.` }] 
        });
    }

    if (rawData.techInfo) {
        descriptionBlock.push({ 
            _type: 'block', 
            _key: generateKey(),
            style: 'h4', 
            children: [{ _type: 'span', _key: generateKey(), text: 'Ficha Técnica' }] 
        });
        descriptionBlock.push({ 
            _type: 'block', 
            _key: generateKey(),
            style: 'normal',
            children: [{ _type: 'span', _key: generateKey(), text: rawData.techInfo }] 
        });
    }

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}`
      },
      isActive: true,
      lote: 'Importação V9 (Ar)',
      productType: 'home', 
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

      ...(videoAssets.length > 0 && {
        videoFile: {
            _type: 'file',
            asset: { _type: 'reference', _ref: videoAssets[0].id }
        }
      }),

      description: descriptionBlock,

      variants: [
        {
            _key: skuCode,
            variantName: 'Padrão',
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 5,
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],

      homeSpecs: {
        consumption: 'Classe A',
        powerW: `${estimatedLogistics.btus} BTUs`
      },

      logistics: finalLogistics,
      
      freeShipping: false 
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Ar Condicionado criado.`);
    console.log(`📏 Medidas usadas: ${finalLogistics.width}x${finalLogistics.height}x${finalLogistics.length}cm (${finalLogistics.weight}kg)`);
    browser.disconnect();

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if(browser) browser.disconnect();
  }
}

startScraper();