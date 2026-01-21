// importador-ventiladores.js
// VERSÃO: Ventiladores Universal (Mesa, Coluna, Teto, Parede, Torre)
// CATEGORIA ALVO: cat-eletro

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

// ✅ CATEGORIA: Eletroportáteis / Climatização
const CATEGORY_ID = 'cat-eletro'; 

const client = createClient(SANITY_CONFIG);

const generateKey = () => Math.random().toString(36).substring(2, 15);

// --- INTELIGÊNCIA DE PRODUTO ---

function getBrand(title) {
    const brands = [
        'Arno', 'Mondial', 'Britânia', 'Ventisol', 'Mallory', 
        'Philco', 'Cadence', 'Venti-Delta', 'Tron', 'Arge', 
        'Loren Sid', 'Spirit', 'Hunter', 'Wap'
    ];
    const titleUpper = title.toUpperCase();
    
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) {
            return brand;
        }
    }
    return 'Genérica'; 
}

function extractSpecs(title) {
    const t = title.toUpperCase();
    
    // Diâmetro (ex: 30cm, 40 cm, 50cm)
    const sizeMatch = t.match(/(\d{2})\s*CM/);
    const sizeVal = sizeMatch ? parseInt(sizeMatch[1]) : 40; // Padrão 40cm se não achar

    // Potência
    const powerMatch = t.match(/(\d{2,3})\s*W/);
    const power = powerMatch ? `${powerMatch[1]}W` : 'Potência Padrão';

    // Pás (ex: 6 pás, 3 pás)
    const bladesMatch = t.match(/(\d)\s*PÁS/);
    const blades = bladesMatch ? `${bladesMatch[1]} Pás` : 'Hélice Padrão';

    // Voltagem
    let voltage = 'Bivolt/Verificar';
    if (t.includes('110V') || t.includes('127V')) voltage = '127V';
    if (t.includes('220V')) voltage = '220V';

    return { sizeVal, sizeStr: `${sizeVal}cm`, power, blades, voltage };
}

// 🧠 CÉREBRO LOGÍSTICO (Define peso e tamanho da caixa por Tipo)
function calculateLogistics(title, sizeVal) {
    const t = title.toUpperCase();
    
    // TIPO 1: VENTILADOR DE COLUNA (Pedestal)
    // Caixa geralmente é achatada (grade) e larga.
    if (t.includes('COLUNA') || t.includes('PEDESTAL')) {
        return {
            type: 'COLUNA',
            weight: 6.5, // Base pesada
            width: sizeVal + 10, // Grade + margem
            height: 25,          // Altura da caixa desmontada
            length: sizeVal + 10
        };
    }

    // TIPO 2: VENTILADOR DE TETO
    // Caixa compacta, motor muito pesado.
    if (t.includes('TETO')) {
        return {
            type: 'TETO',
            weight: 5.5, // Motor pesado
            width: 30, 
            height: 20, 
            length: 45 // Pás desmontadas
        };
    }

    // TIPO 3: VENTILADOR DE TORRE
    // Alto e fino.
    if (t.includes('TORRE')) {
        return {
            type: 'TORRE',
            weight: 4.0,
            width: 20, 
            height: 85, // Altura média torre
            length: 20
        };
    }

    // TIPO 4: VENTILADOR DE PAREDE (Industrial/Comercial)
    // Grade enorme, motor pesado.
    if (t.includes('PAREDE') || (t.includes('OSCILANTE') && sizeVal >= 50)) {
        return {
            type: 'PAREDE/INDUSTRIAL',
            weight: 4.0,
            width: sizeVal + 5, 
            height: 20, 
            length: sizeVal + 5
        };
    }

    // TIPO 5: VENTILADOR DE MESA (Padrão)
    // Caixa mais cúbica.
    // Lógica progressiva por tamanho:
    let weight = 2.5;
    if (sizeVal >= 40) weight = 3.2;
    if (sizeVal >= 50) weight = 4.5;

    return {
        type: 'MESA',
        weight: weight,
        width: sizeVal + 5,  // Largura da grade + isopor
        height: sizeVal + 5, // Altura da grade
        length: 30           // Profundidade (base + motor)
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
    return null; 
  }
}

async function startScraper() {
  console.log('🔌 Conectando ao Chrome (Modo Ventiladores Universal)...');
  let browser;
  try {
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado. Rode: chrome.exe --remote-debugging-port=9222");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Girando a hélice...');

  // Scroll para carregar imagens
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
        const titleEl = document.querySelector('h1') || document.querySelector('.product-title-text');
        
        // Texto para análise extra se precisar
        const bodyText = document.body.innerText.toUpperCase();
        
        const metaPrice = document.querySelector('meta[property="product:price:amount"]') || 
                          document.querySelector('meta[property="og:price:amount"]');
        
        let rawPrice = 0;
        
        if (metaPrice && metaPrice.content) {
            rawPrice = parseFloat(metaPrice.content);
        } else {
            const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                            document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction') || 
                            document.querySelector('.price') || 
                            document.querySelector('.sale-price');
            
            if (priceEl) {
                const cleanText = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
                rawPrice = parseFloat(cleanText);
            }
        }

        const data = {
            title: titleEl ? titleEl.innerText : 'Ventilador',
            originalPrice: rawPrice || 0,
            fullText: bodyText.slice(0, 2000),
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
            } catch(e){}
        });

        const gallerySelectors = ['.ui-pdp-gallery__figure img', '#imgTagWrapperId img', '.product-gallery img'];
        gallerySelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(img => {
                let src = img.getAttribute('data-zoom') || img.getAttribute('src');
                if(src) data.medias.push(src);
            });
        });

        document.querySelectorAll('img').forEach(img => {
            if(img.naturalWidth > 500) { 
                let src = img.getAttribute('src');
                if(src) data.medias.push(src);
            }
        });

        return data;
    });

    console.log(`📦 Produto: ${rawData.title}`);

    // --- ANÁLISE INTELIGENTE ---
    const detectedBrand = getBrand(rawData.title);
    const specs = extractSpecs(rawData.title);
    const logistics = calculateLogistics(rawData.title, specs.sizeVal);

    // Detecção de Velocidades no texto
    let speeds = '3 Velocidades';
    if (rawData.fullText.includes('6 VELOCIDADES')) speeds = '6 Velocidades';
    if (rawData.fullText.includes('TURBO')) speeds += ' Turbo';

    console.log(`🔍 Detecção Avançada:`);
    console.log(`   - Marca: ${detectedBrand}`);
    console.log(`   - Tipo: ${logistics.type} (Grade ${specs.sizeStr})`);
    console.log(`   - Peso Envio: ${logistics.weight}kg`);
    console.log(`   - Dimensões: ${logistics.height}x${logistics.width}x${logistics.length}cm`);

    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.30) : 0; 

    const uniqueMedias = [...new Set(rawData.medias.map(u => u ? u.split('?')[0] : null))]
        .filter(u => u && u.startsWith('http') && !u.includes('.svg'));
    
    const uploadedAssets = [];
    for (const url of uniqueMedias.slice(0, 7)) {
        const result = await uploadMediaToSanity(url);
        if (result) uploadedAssets.push(result);
    }

    const imageAssets = uploadedAssets.filter(a => a.type === 'image');
    if (imageAssets.length === 0) {
        console.error("❌ Erro: Nenhuma imagem encontrada.");
        browser.disconnect(); return;
    }

    const skuCode = `VENT-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}`
      },
      isActive: true,
      lote: 'Climatização',
      productType: 'tech',
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

      description: [ 
          { 
            _type: 'block', 
            _key: generateKey(),
            style: 'normal',
            children: [{ 
                _type: 'span', 
                _key: generateKey(),
                text: `Ventilador ${detectedBrand} ${logistics.type} de ${specs.sizeStr}. Alta vazão de ar com ${specs.blades}. Motor eficiente e silencioso para maior conforto térmico.` 
            }] 
          } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: `Padrão (${specs.voltage})`,
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 15, 
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],
      
      // Specs mapeadas
      techSpecs: { 
          screen: speeds,               // Velocidades
          camera: specs.sizeStr,        // Tamanho da grade
          processor: specs.power,       // Potência
          battery: 'Com Fio (Elétrico)', 
          os: specs.blades              // Quantidade de pás
      },
      
      // Logística Dinâmica Calculada
      logistics: { 
          weight: logistics.weight,
          width: logistics.width,
          height: logistics.height,
          length: logistics.length
      },
      freeShipping: logistics.type === 'COLUNA' || logistics.type === 'PAREDE/INDUSTRIAL'
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Ventilador Cadastrado.`);
    console.log(`📄 SKU: ${skuCode} | Logística: ${logistics.type}`);
    browser.disconnect();
}

startScraper();