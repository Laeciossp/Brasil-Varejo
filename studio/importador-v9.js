// importador-v9.js
// VERSÃO FINAL: Preço Correto (+25%), Scroll Seguro e Todas as Imagens
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

const CATEGORY_ID = 'cd229cb8-6d7b-44d5-82a8-e4e2b5a9a9b8'; 
const client = createClient(SANITY_CONFIG);

const generateKey = () => Math.random().toString(36).substring(2, 15);

function getBrand(title) {
    const brands = ['Motorola', 'Samsung', 'Apple', 'Xiaomi', 'LG', 'Nokia', 'Asus', 'Realme', 'Poco', 'Infinix', 'Sony', 'Huawei', 'Positivo', 'Multilaser', 'Philco'];
    const found = brands.find(b => title.toLowerCase().includes(b.toLowerCase()));
    return found || 'Genérica';
}

async function uploadMediaToSanity(mediaUrl) {
  try {
    const cleanUrl = mediaUrl.split('?')[0];
    const isVideo = cleanUrl.match(/\.(mp4|webm|mov|mkv)$/i);
    const assetType = isVideo ? 'file' : 'image';
    
    console.log(`   ⬇️ Baixando [${assetType.toUpperCase()}]: ${cleanUrl.substring(0, 40)}...`);
    
    const response = await axios.get(cleanUrl, { 
        responseType: 'arraybuffer',
        timeout: 20000, 
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
  
  console.log('✅ Conectado! Extraindo dados...');

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
        const titleEl = document.querySelector('h1');
        const metaPrice = document.querySelector('meta[property="product:price:amount"]') || 
                          document.querySelector('meta[property="og:price:amount"]');
        
        let rawPrice = 0;
        if (metaPrice && metaPrice.content) {
            rawPrice = parseFloat(metaPrice.content);
        } else {
            const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                            document.querySelector('.price') || document.querySelector('.sale-price');
            if (priceEl) {
                const cleanText = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
                rawPrice = parseFloat(cleanText);
            }
        }

        const data = {
            title: titleEl ? titleEl.innerText : 'Produto Sem Título',
            originalPrice: rawPrice || 0,
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

        const gallerySelectors = ['.ui-pdp-gallery__figure img', '#gallery img', '.product-gallery img'];
        gallerySelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(img => {
                let src = img.getAttribute('data-zoom') || img.getAttribute('src');
                if(src) data.medias.push(src);
            });
        });

        document.querySelectorAll('img').forEach(img => {
            if(img.naturalWidth > 200 || img.width > 200) {
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

    console.log(`📦 Produto: ${rawData.title}`);

    const costPrice = Number(rawData.originalPrice);
    const salePrice = costPrice > 0 ? (costPrice * 1.25) : 0; 
    
    console.log(`💰 Custo: R$ ${costPrice.toFixed(2)}`);
    console.log(`📈 Venda (+25%): R$ ${salePrice.toFixed(2)}`);

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
        console.error("❌ Nenhuma imagem encontrada.");
        browser.disconnect(); return;
    }

    const detectedBrand = getBrand(rawData.title);
    const skuCode = Math.random().toString(36).substring(7).toUpperCase();

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

      description: [ 
        { 
            _type: 'block', 
            _key: generateKey(),
            style: 'normal',
            children: [{ 
                _type: 'span', 
                _key: generateKey(),
                text: 'Descrição pendente. Utilizar IA para gerar.' 
            }] 
        } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: 'Padrão',
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 10,
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],
      techSpecs: { screen: null, camera: null, processor: null, battery: null, os: null },
      logistics: { weight: 0.5, width: 15, height: 5, length: 20 },
      freeShipping: true
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Produto criado.`);
    browser.disconnect();
}

startScraper();