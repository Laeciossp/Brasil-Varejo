// importador-universal-final.js
// VERSÃO: RAIO-X + IMAGENS HD + DETECTOR DE CALÇADOS E MARCAS

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const path = require('path');
const slugify = require('slugify');

puppeteer.use(StealthPlugin());

// --- CONFIGURAÇÃO SANITY ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});

const generateKey = () => Math.random().toString(36).substring(2, 15);

// --- CONFIGURAÇÃO DE CATEGORIAS E MARCAS ---

// 1. Categoria Especial de Calçados (Prioridade Alta)
const SHOES_CATEGORY_ID = '0b360a5f-6923-4c22-8d16-6d3ba65f98a2';
const SHOES_KEYWORDS = [
    'TÊNIS', 'TENIS', 'SAPATO', 'SANDÁLIA', 'SANDALIA', 'CHINELO', 
    'BOTA', 'RASTEIRA', 'MOCASSIM', 'SCARPIN', 'PAPETE', 'ANABELA', 
    'SLIDE', 'MULE', 'FLAT', 'COTURNO', 'TAMANCO'
];

// 2. Mapeamento de Roupas (Padrão)
const CLOTHING_MAP = {
    'MACAQUINHO': '9ca0fcfe-9f06-44db-8c84-f8d395b610ea',
    'MACAC':      '9ca0fcfe-9f06-44db-8c84-f8d395b610ea', 
    'VESTIDO':    'dc0d33a3-9165-4d57-8cc2-830f9311d26b',
    'CALÇA':      '0b5f498b-3f74-4818-9f16-604b11e26f05',
    'JEANS':      '0b5f498b-3f74-4818-9f16-604b11e26f05',
    'SAIA':       '2a346772-2540-4da4-b29a-35d8155d8d90',
    'BERMUDA':    '1dcd7f06-7dd8-49af-be15-7b19d6d5f15c',
    'SHORT':      '1dcd7f06-7dd8-49af-be15-7b19d6d5f15c',
    'CAMISA':     '26077718-39db-4055-b32a-bc91b4be36d4',
    'BLUSA':      '7ef4bb1b-a674-41cc-b38e-dd3daa2f19ac',
    'TOP':        '7ef4bb1b-a674-41cc-b38e-dd3daa2f19ac',
    'CROPPED':    '7ef4bb1b-a674-41cc-b38e-dd3daa2f19ac'
};
const DEFAULT_CATEGORY = '7ef4bb1b-a674-41cc-b38e-dd3daa2f19ac'; 

// 3. Lista de Marcas (Ordem importa: compostas primeiro)
const BRAND_LIST = [
    'FARM ME LEVA', 'MINI MELISSA', 'ALL IS LOVE', 'MARIA FILÓ', 'JOHN JOHN', 
    'FARM', 'MELISSA', 'ANTIX', 'ANIMALE', 'FÁBULA', 'CANTÃO', 'RESERVA', 
    'FOXTON', 'IMAGIVAN', 'ARAMIS', 'OSKLEN', 'QUINTESS'
];

// --- FUNÇÕES AUXILIARES ---

function detectCategory(title) {
    const t = title.toUpperCase();
    
    // 1. Checa se é Calçado (Prioridade)
    if (SHOES_KEYWORDS.some(word => t.includes(word))) {
        return { id: SHOES_CATEGORY_ID, type: 'shoe' };
    }

    // 2. Checa Roupas
    for (const [key, id] of Object.entries(CLOTHING_MAP)) {
        if (t.includes(key)) return { id: id, type: 'clothing' };
    }
    
    return { id: DEFAULT_CATEGORY, type: 'clothing' };
}

function detectBrand(title) {
    const t = title.toUpperCase();
    for (const brand of BRAND_LIST) {
        if (t.includes(brand)) {
            // Formatação bonita (Ex: "MARIA FILÓ" -> "Maria Filó")
            return brand.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
        }
    }
    return 'Genérica'; // Fallback se não achar nenhuma marca da lista
}

function getHighResUrl(url) {
    if (!url) return null;
    if (url.includes('mlcdn.com.br')) {
        return url.replace(/\/\d+x\d+\//, '/2000x2000/');
    }
    return url;
}

async function uploadMediaToSanity(mediaUrl) {
  try {
    const highResUrl = getHighResUrl(mediaUrl);
    const cleanUrl = highResUrl.split('?')[0];
    
    if (cleanUrl.includes('.svg') || cleanUrl.includes('data:')) return null;
    
    console.log(`   ⬇️ Baixando: ${cleanUrl.substring(0, 50)}...`);
    await new Promise(r => setTimeout(r, 200));
    
    const response = await axios.get(cleanUrl, { responseType: 'arraybuffer', timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload('image', buffer, { filename: path.basename(cleanUrl) });
    return { id: asset._id, type: 'image' };
  } catch (error) { 
      console.log(`   ⚠️ Falha na imagem HD, tentando original...`);
      if (mediaUrl !== getHighResUrl(mediaUrl)) {
           try {
               const originalResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 20000 });
               const originalBuffer = Buffer.from(originalResponse.data, 'binary');
               const originalAsset = await client.assets.upload('image', originalBuffer, { filename: path.basename(mediaUrl) });
               return { id: originalAsset._id, type: 'image' };
           } catch (e) { return null; }
      }
      return null; 
  }
}

async function startScraper() {
  console.log('🔌 Iniciando Importador Inteligente (Marcas + Calçados)...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages())[0];

  const data = await page.evaluate(() => {
      const title = document.querySelector('h1')?.innerText || 'Produto Sem Título';
      
      // --- CAPTURA DE COR ---
      let color = 'Cor Principal';
      const knownColors = ['AZUL', 'ROSA', 'PRETO', 'BRANCO', 'VERDE', 'AMARELO', 'VERMELHO', 'LARANJA', 'BEGE', 'MARROM', 'ROXO', 'LILÁS', 'CINZA', 'ESTAMPADO', 'OFF-WHITE', 'VINHO', 'NUDE', 'OURO', 'PRATA'];
      const titleUpper = title.toUpperCase();
      for (const c of knownColors) { if (titleUpper.includes(c)) { color = c.charAt(0) + c.slice(1).toLowerCase(); break; } }

      let rawSizes = [];
      let jsonPrice = null;
      let jsonColor = null;
      let debugLogs = [];
      
      try {
          const scriptEl = document.getElementById('__PRELOADED_STATE__');
          if (scriptEl && scriptEl.textContent) {
              const state = JSON.parse(scriptEl.textContent); 
              
              if (state.pageState?.initialState?.price) {
                 jsonPrice = state.pageState.initialState.price;
              }

              const analytics = state.pageState?.initialState?.analytics_event;
              if (analytics && analytics.custom_dimensions && analytics.custom_dimensions.customDimensions) {
                  const pickers = JSON.parse(analytics.custom_dimensions.customDimensions.pickers || "{}");
                  
                  if (pickers.SIZE && Array.isArray(pickers.SIZE)) {
                      rawSizes = pickers.SIZE.map(s => s.value);
                  }
                  
                  if (pickers.COLOR_SECONDARY_COLOR && Array.isArray(pickers.COLOR_SECONDARY_COLOR)) {
                      if(pickers.COLOR_SECONDARY_COLOR.length > 0) {
                          jsonColor = pickers.COLOR_SECONDARY_COLOR[0].value;
                      }
                  }
              }
              
              // FALLBACK DE ESTRUTURA
              if (rawSizes.length === 0) {
                   const components = state.pageState?.initialState?.components;
                   const findPickers = (obj) => {
                      if (!obj) return [];
                      if (Array.isArray(obj)) return obj.flatMap(findPickers);
                      if (typeof obj === 'object') {
                          if (obj.type === 'outside_variations' && Array.isArray(obj.pickers)) {
                              return obj.pickers;
                          }
                          return Object.values(obj).flatMap(findPickers);
                      }
                      return [];
                   };

                   if (components) {
                      const pickers = findPickers(components);
                      const sizePicker = pickers.find(p => p.id === 'SIZE');
                      if (sizePicker && sizePicker.products) {
                          rawSizes = sizePicker.products.map(p => p.label.text);
                      }
                   }
              }

          }
      } catch(e) { debugLogs.push("Erro JSON: " + e.message); }

      // --- FALLBACKS VISUAIS ---
      let price = jsonPrice;
      if (!price) {
          const priceContainer = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction');
          if (priceContainer) {
              price = parseFloat(priceContainer.innerText.replace(/\./g,'').replace(',','.'));
          } else {
              const meta = document.querySelector('meta[property="product:price:amount"]');
              if(meta) price = parseFloat(meta.content);
          }
      }

      let finalColor = jsonColor || color;
      
      let desc = document.querySelector('.ui-pdp-description__content')?.innerText || "Descrição indisponível.";
      const imgs = [];
      document.querySelectorAll('.ui-pdp-gallery__figure img').forEach(i => {
          let src = i.getAttribute('data-zoom') || i.getAttribute('src');
          if(src) imgs.push(src);
      });

      return { 
          title, price, desc, imgs, color: finalColor, 
          rawSizes: [...new Set(rawSizes)],
          logs: debugLogs
      };
  });

  if(data.logs) console.log("🔍 Logs:", data.logs);

  // --- FILTRAGEM ---
  const invalidWords = ['ESCOLHA', 'SELECIONE', 'OPÇÕES', 'TAMANHO', 'COR', 'VERIFIQUE', 'GUIA'];
  let cleanSizes = data.rawSizes.filter(s => {
      if (!s) return false;
      const upperS = s.toString().toUpperCase(); 
      const upperColor = data.color.toUpperCase();
      if (upperS === upperColor) return false;
      if (invalidWords.some(word => upperS.includes(word))) return false;
      return true;
  });
   
  if (cleanSizes.length === 0) cleanSizes = ['Único'];

  // --- INTELIGÊNCIA DE DADOS ---
  const categoryInfo = detectCategory(data.title);
  const detectedBrand = detectBrand(data.title);
  
  let costPrice = Number(data.price) || 99.00;
  const salePrice = costPrice * 1.30;

  // --- LÓGICA DE LOGÍSTICA ---
  let logisticsSettings;
  if (categoryInfo.type === 'shoe') {
      // Configuração para Caixa de Sapato
      logisticsSettings = { weight: 1.0, width: 32, height: 12, length: 22 };
      console.log("👟 Modo Calçados Ativado (Logística ajustada)");
  } else {
      // Configuração para Roupas (Envelope/Pacote pequeno)
      logisticsSettings = { weight: 0.3, width: 20, height: 5, length: 20 };
  }

  // --- UPLOAD ---
  const uploadedAssets = [];
  const uniqueMedias = [...new Set(data.imgs.map(u => u.split('?')[0]))].filter(u => u.startsWith('http'));
   
  for (const url of uniqueMedias.slice(0, 8)) {
      const res = await uploadMediaToSanity(url);
      if (res) uploadedAssets.push(res);
  }
   
  if (uploadedAssets.length === 0) { console.log("❌ Sem imagens."); return; }

  // --- ESTRUTURA FINAL ---
  const variantsStructure = [
      {
          _key: generateKey(),
          _type: 'object',
          colorName: data.color, 
          variantImage: { _type: 'image', asset: { _type: 'reference', _ref: uploadedAssets[0].id } },
          
          sizes: cleanSizes.map(size => ({
              _key: generateKey(),
              _type: 'object',
              size: size, 
              price: parseFloat(salePrice.toFixed(2)),
              stock: 5,
              sku: `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`
          }))
      }
  ];

  const doc = {
    _type: 'product',
    title: data.title,
    slug: { _type: 'slug', current: slugify(`${detectedBrand}-${data.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}` },
    isActive: true,
    lote: `Importação ${detectedBrand}`, // Agrupamento por marca
    productType: categoryInfo.type === 'shoe' ? 'footwear' : 'fashion', // Define o tipo interno
    brand: detectedBrand, // Marca detectada
    categories: [{ _type: 'reference', _ref: categoryInfo.id, _key: generateKey() }],
    
    price: parseFloat(salePrice.toFixed(2)),
    oldPrice: parseFloat(costPrice.toFixed(2)), 
    images: uploadedAssets.map(i => ({ _type: 'image', _key: i.id, asset: { _type: 'reference', _ref: i.id } })),
    description: [{ _type: 'block', _key: generateKey(), style: 'normal', children: [{ _type: 'span', _key: generateKey(), text: String(data.desc) }] }],
    
    variants: variantsStructure,
    
    fashionSpecs: { gender: 'Fem', material: 'Padrão', model: 'Padrão' },
    logistics: logisticsSettings, // Logística dinâmica inserida aqui
    freeShipping: false
  };

  try {
      const res = await client.create(doc);
      console.log(`✅ SUCESSO! Produto Importado.`);
      console.log(`🏷️ Marca: ${doc.brand}`);
      console.log(`📂 Categoria: ${categoryInfo.type === 'shoe' ? 'Calçados' : 'Roupas'}`);
      console.log(`📦 Dimensões: ${logisticsSettings.width}x${logisticsSettings.height}x${logisticsSettings.length}`);
      console.log(`📄 SKU: ${doc.slug.current}`);
  } catch (err) { console.error("❌ Erro:", err.message); }
  process.exit(0);
}

startScraper();