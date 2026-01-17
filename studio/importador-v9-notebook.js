// importador-v9-notebook.js
// VERSÃO NOTEBOOKS - MODO DEBUG (CHROME ABERTO)
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

// ID da Categoria (NOTEBOOKS) - Atualizado
const CATEGORY_ID = '4685ccb5-a7e6-4799-bb7a-cac69d3b9a2a'; 

const client = createClient(SANITY_CONFIG);

// --- DETECTAR MARCA (ATUALIZADO PARA NOTEBOOKS) ---
function getBrand(title) {
    const brands = [
        // Notebooks
        'Dell', 'HP', 'Lenovo', 'Acer', 'Asus', 'Apple', 'Samsung', 'Vaio', 'Compaq', 'Avell', 'MSI', 'Gigabyte', 'Razer',
        // Celulares/Geral (mantido caso apareça)
        'Motorola', 'Xiaomi', 'LG', 'Positivo', 'Multilaser', 'Philco'
    ];
    // Verifica marcas compostas primeiro ou busca simples
    const titleUpper = title.toUpperCase();
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) {
            return brand;
        }
    }
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
      // MANTIDO: Conecta ao Chrome já aberto pelo usuário
      browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9222',
        defaultViewport: null
      });
  } catch (e) {
      console.error("❌ Erro: Chrome debug não encontrado.");
      console.error("   Certifique-se de rodar o Chrome com: --remote-debugging-port=9222");
      return;
  }
  
  // Pega a primeira aba aberta (a que você está olhando)
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('✅ Conectado! Lendo página ativa...');

  try {
    // Scroll para garantir carregamento de imagens (Lazy Load)
    await page.evaluate(async () => {
        window.scrollBy(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 1000));

    // EXTRAÇÃO DE DADOS
    const rawData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1') || document.querySelector('.product-title-text');
        
        // Tentativa genérica de pegar preço
        const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                        document.querySelector('.price') || 
                        document.querySelector('.sale-price') ||
                        document.querySelector('.andes-money-amount__fraction'); // Exemplo ML
        
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

        // 1. Tenta pegar imagens via JSON-LD (Melhor qualidade)
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

        // 2. Fallback: Pega imagens grandes do DOM se JSON falhar
        if (data.images.length === 0) {
            document.querySelectorAll('img').forEach(img => {
                // Filtra ícones pequenos
                if(img.naturalWidth > 300 || img.width > 300) {
                    let src = img.getAttribute('src');
                    // Tenta pegar versão HD se existir atributos de zoom
                    if (img.getAttribute('data-zoom')) src = img.getAttribute('data-zoom');
                    data.images.push(src); 
                }
            });
        }

        return data;
    });

    console.log(`📦 Notebook identificado: ${rawData.title}`);

    // --- PREÇO (Lógica mantida: +25% ou ajuste conforme necessidade) ---
    const finalPrice = rawData.originalPrice > 0 ? (rawData.originalPrice * 1.25) : 0; 

    // --- FILTRO IMAGENS ---
    // Limpa URLs e pega apenas únicas
    const uniqueImages = [...new Set(rawData.images.map(u => u ? u.split('?')[0] : null))].filter(Boolean);
    const finalImages = uniqueImages.filter(u => u.startsWith('http')).slice(0, 8); // Max 8 fotos

    if (finalImages.length === 0) {
        console.error("❌ Nenhuma imagem de qualidade encontrada.");
        browser.disconnect(); return;
    }

    console.log(`⬆️ Subindo ${finalImages.length} imagens para o Sanity...`);
    const assetIds = [];
    for (const url of finalImages) {
        const id = await uploadImageToSanity(url);
        if (id) assetIds.push(id);
    }

    const detectedBrand = getBrand(rawData.title);
    const skuCode = `NB-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // --- CRIAÇÃO DO DOCUMENTO (Schema de Produto) ---
    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}`
      },
      isActive: true,
      lote: 'Importação V9 (Notebooks)',
      productType: 'tech',
      brand: detectedBrand,

      categories: [
        { _type: 'reference', _ref: CATEGORY_ID } // ID de Notebooks
      ],

      price: parseFloat(finalPrice.toFixed(2)),
      oldPrice: rawData.originalPrice > 0 ? rawData.originalPrice : null,

      images: assetIds.map(id => ({ 
        _type: 'image', 
        _key: id, 
        asset: { _type: 'reference', _ref: id } 
      })),

      // Descrição genérica para preenchimento posterior
      description: [ 
        { 
            _type: 'block', 
            children: [{ _type: 'span', text: 'Descrição técnica do Notebook pendente. Gerar com IA.' }] 
        } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: 'Padrão',
            price: parseFloat(finalPrice.toFixed(2)),
            oldPrice: rawData.originalPrice > 0 ? rawData.originalPrice : null,
            stock: 5, // Estoque padrão menor para notebooks
            variantImage: assetIds[0] ? { _type: 'image', asset: { _type: 'reference', _ref: assetIds[0] } } : null
        }
      ],

      // Specs vazias (o padrão V9 limpo)
      techSpecs: {
        screen: null,
        camera: null,
        processor: null,
        battery: null,
        os: null
      },

      logistics: {
        weight: 2.5, // Peso médio notebook
        width: 38,
        height: 5,
        length: 26
      },
      
      freeShipping: true
    };

    const result = await client.create(doc);
    console.log(`✅ SUCESSO! Notebook criado.`);
    console.log(`🆔 ID: ${result._id}`);
    console.log(`🏷️ Marca: ${detectedBrand} | Categoria: Notebooks`);
    
    // IMPORTANTE: Disconnect apenas desconecta o script, não fecha seu Chrome
    browser.disconnect();

  } catch (error) {
    console.error('❌ Erro Fatal:', error.message);
    if(browser) browser.disconnect();
  }
}

startScraper();