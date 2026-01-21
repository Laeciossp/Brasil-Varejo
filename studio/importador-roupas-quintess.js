// importador-roupas-quintess-v38.js
// VERSÃO: O CIRURGIÃO (Baseado no HTML fornecido)
// Alvo: Classes 'ui-pdp-outside_variations' encontradas no código fonte.

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const path = require('path');
const slugify = require('slugify');

puppeteer.use(StealthPlugin());

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});
const generateKey = () => Math.random().toString(36).substring(2, 15);

// ... (Categorias igual) ...
const CATEGORIES_MAP = {
    'MACAQUINHO': '9ca0fcfe-9f06-44db-8c84-f8d395b610ea',
    'MACAC':      '9ca0fcfe-9f06-44db-8c84-f8d395b610ea', 
    'VESTIDO':    'dc0d33a3-9165-4d57-8cc2-830f9311d26b',
    'CALÇA':      '0b5f498b-3f74-4818-9f16-604b11e26f05',
    'JEANS':      '0b5f498b-3f74-4818-9f16-604b11e26f05',
    'SAIA':       '2a346772-2540-4da4-b29a-35d8155d8d90',
    'BERMUDA':    '1dcd7f06-7dd8-49af-be15-7b19d6d5f15c',
    'SHORT':      '1dcd7f06-7dd8-49af-be15-7b19d6d5f15c',
    'CAMISA':     '26077718-39db-4055-b32a-bc91b4be36d4',
    'BLUSA':      '7ef4bb1b-a674-41cc-b38e-dd3daa2f19ac'
};
const DEFAULT_CATEGORY = '7ef4bb1b-a674-41cc-b38e-dd3daa2f19ac'; 

function detectCategory(title) {
    const t = title.toUpperCase();
    for (const [key, id] of Object.entries(CATEGORIES_MAP)) {
        if (t.includes(key)) return id;
    }
    return DEFAULT_CATEGORY;
}

async function uploadMediaToSanity(mediaUrl) {
  try {
    const cleanUrl = mediaUrl.split('?')[0];
    if (cleanUrl.includes('.svg') || cleanUrl.includes('data:')) return null;
    await new Promise(r => setTimeout(r, 200));
    const response = await axios.get(cleanUrl, { responseType: 'arraybuffer', timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload('image', buffer, { filename: path.basename(cleanUrl) });
    return { id: asset._id, type: 'image' };
  } catch (error) { return null; }
}

async function startScraper() {
  console.log('🔌 Conectando (V38 - O Cirurgião)...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages())[0];

  const data = await page.evaluate(() => {
      const title = document.querySelector('h1')?.innerText || 'Roupa Quintess';
      
      // Preço
      let price = 0;
      const meta = document.querySelector('meta[property="product:price:amount"]');
      if(meta) price = parseFloat(meta.content);
      if(!price) {
          const el = document.querySelector('.andes-money-amount__fraction');
          if(el) price = parseFloat(el.innerText.replace(/\./g,'').replace(',','.'));
      }
      
      // Descrição
      let desc = document.querySelector('.ui-pdp-description__content')?.innerText;
      if (!desc || desc.trim().length === 0) desc = "Descrição detalhada indisponível.";

      // Imagens
      const imgs = [];
      document.querySelectorAll('.ui-pdp-gallery__figure img').forEach(i => {
          let src = i.getAttribute('data-zoom') || i.getAttribute('src');
          if(src) imgs.push(src);
      });

      // --- ESTRATÉGIA COR (Via Título) ---
      let color = 'Cor Principal';
      const knownColors = ['AZUL', 'ROSA', 'PRETO', 'BRANCO', 'VERDE', 'AMARELO', 'VERMELHO', 'LARANJA', 'BEGE', 'MARROM', 'ROXO', 'LILÁS', 'CINZA', 'ESTAMPADO'];
      const titleUpper = title.toUpperCase();
      for (const c of knownColors) {
          if (titleUpper.includes(c)) {
              color = c.charAt(0) + c.slice(1).toLowerCase(); 
              break; 
          }
      }

      // --- ESTRATÉGIA DE TAMANHO (BASEADA NO SEU HTML) ---
      let rawSizes = [];
      
      // 1. Procura os containers de variação "Outside" (Onde o HTML mostrou que está)
      const pickers = document.querySelectorAll('.ui-pdp-outside_variations__picker');
      
      pickers.forEach(picker => {
          // Pega o título do picker (Ex: "Tamanho:")
          const pickerTitle = picker.querySelector('.ui-pdp-outside_variations__title__label')?.innerText || '';
          
          // Se for o picker de Tamanho
          if (pickerTitle.toUpperCase().includes('TAMANHO')) {
              // Pega os itens dentro dele (P, XXG, etc)
              const items = picker.querySelectorAll('.ui-pdp-outside_variations__thumbnails__item__label span');
              items.forEach(item => {
                  const sizeText = item.innerText.trim();
                  if (sizeText) rawSizes.push(sizeText);
              });
          }
      });

      // 2. Fallback: Se não achou na estrutura nova, tenta a antiga (padrão ML)
      if (rawSizes.length === 0) {
          document.querySelectorAll('.ui-pdp-variations__option-label').forEach(el => {
              const txt = el.innerText.trim();
              if (txt && !txt.toUpperCase().includes('ESCOLHA') && txt.length < 5) {
                  rawSizes.push(txt);
              }
          });
      }

      return { title, price, desc, imgs, color, rawSizes: [...new Set(rawSizes)] };
  });

  // Limpeza final para garantir
  let cleanSizes = data.rawSizes.filter(s => s !== '');
  if (cleanSizes.length === 0) cleanSizes = ['Único'];

  const categoryId = detectCategory(data.title);
  let costPrice = Number(data.price) || 99.00;
  const salePrice = costPrice * 1.30;

  const uploadedAssets = [];
  const uniqueMedias = [...new Set(data.imgs.map(u => u.split('?')[0]))].filter(u => u.startsWith('http'));
  for (const url of uniqueMedias.slice(0, 5)) {
      const res = await uploadMediaToSanity(url);
      if (res) uploadedAssets.push(res);
  }
  if (uploadedAssets.length === 0) { console.log("Sem imagens"); return; }

  // --- ESTRUTURA FERRARI (V38) ---
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
    slug: { _type: 'slug', current: slugify(`quintess-${data.title}`, { lower: true, strict: true }).slice(0, 90) + `-${Date.now().toString().slice(-4)}` },
    isActive: true,
    lote: 'Moda Quintess',
    productType: 'fashion',
    brand: 'Quintess',
    categories: [{ _type: 'reference', _ref: categoryId, _key: generateKey() }],
    
    price: parseFloat(salePrice.toFixed(2)),
    oldPrice: parseFloat(costPrice.toFixed(2)), 
    images: uploadedAssets.map(i => ({ _type: 'image', _key: i.id, asset: { _type: 'reference', _ref: i.id } })),
    description: [{ _type: 'block', _key: generateKey(), style: 'normal', children: [{ _type: 'span', _key: generateKey(), text: String(data.desc) }] }],
    
    variants: variantsStructure,
    
    fashionSpecs: { gender: 'Fem', material: 'Tecido', model: 'Padrão' },
    logistics: { weight: 0.5, width: 20, height: 10, length: 20 },
    freeShipping: false
  };

  try {
      const res = await client.create(doc);
      console.log(`✅ SUCESSO! Produto Importado (V38 - HTML Confirmado).`);
      console.log(`🎨 Cor: ${data.color}`);
      console.log(`📏 Tamanhos Capturados: ${cleanSizes.join(', ')}`);
      console.log(`📄 SKU: ${doc.slug.current}`);
  } catch (err) { console.error("❌ Erro:", err.message); }
  process.exit(0);
}

startScraper();