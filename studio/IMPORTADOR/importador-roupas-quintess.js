// importador-roupas-quintess-v44.js
// VERSÃO: RAIO-X COMPLETO (Preço, Tamanho e COR extraídos do sistema)

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

// ... (Categorias mantidas) ...
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
  console.log('🔌 Conectando (V44 - Raio-X Cor/Tamanho/Preço)...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages())[0];

  const data = await page.evaluate(() => {
      const title = document.querySelector('h1')?.innerText || 'Roupa Quintess';
      
      // Variáveis alvo
      let rawSizes = [];
      let jsonPrice = null;
      let jsonColor = null; // Nova variável para Cor Real
      
      try {
          const scriptEl = document.getElementById('__PRELOADED_STATE__');
          if (scriptEl && scriptEl.textContent) {
              const state = JSON.parse(scriptEl.textContent); 
              
              // Helper de busca recursiva
              const findInComponents = (obj, keyToFind) => {
                  if (!obj) return [];
                  if (Array.isArray(obj)) return obj.flatMap(i => findInComponents(i, keyToFind));
                  if (typeof obj === 'object') {
                      if (obj[keyToFind]) return obj;
                      return Object.values(obj).flatMap(i => findInComponents(i, keyToFind));
                  }
                  return [];
              };

              const components = state.pageState?.initialState?.components;
              
              // 1. PREÇO (JSON)
              if (components) {
                  const priceComponent = components.find(c => c.type === 'price' || (c.price && c.price.value));
                  if (priceComponent && priceComponent.price) {
                      jsonPrice = priceComponent.price.value;
                  }
              }

              // 2. TAMANHOS E COR (JSON)
              // Função específica para achar os "Pickers" (Seletores)
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
                  
                  // A. Busca Tamanhos
                  const sizePicker = pickers.find(p => 
                      p.id === 'SIZE' || 
                      (p.label && p.label.text && p.label.text.toUpperCase().includes('TAMANHO'))
                  );
                  if (sizePicker && sizePicker.products) {
                      rawSizes = sizePicker.products.map(p => p.label.text);
                  }

                  // B. Busca COR (Novidade V44)
                  const colorPicker = pickers.find(p => 
                      p.id === 'COLOR_SECONDARY_COLOR' || 
                      (p.label && p.label.text && p.label.text.toUpperCase().includes('COR'))
                  );
                  // Se achou o seletor de cor, pega a opção selecionada atualmente
                  if (colorPicker && colorPicker.selected_option) {
                      jsonColor = colorPicker.selected_option.text;
                  }
              }
          }
      } catch(e) {
          console.log("⚠️ Erro no Raio-X JSON:", e);
      }

      // --- FALLBACKS VISUAIS (PLANO B) ---
      
      // Preço
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

      // Cor (Fallback Visual: Procura o texto "Cor: Azul" na tela)
      let color = jsonColor;
      if (!color) {
          const pickers = document.querySelectorAll('.ui-pdp-outside_variations__picker');
          pickers.forEach(picker => {
              const titleEl = picker.querySelector('.ui-pdp-outside_variations__title__label');
              const valueEl = picker.querySelector('.ui-pdp-outside_variations__title__value');
              if (titleEl && valueEl && titleEl.innerText.toUpperCase().includes('COR')) {
                  color = valueEl.innerText.trim();
              }
          });
      }
      // Último recurso para cor (Adivinhar pelo título - Só se tudo falhar)
      if (!color) {
          const knownColors = ['AZUL', 'ROSA', 'PRETO', 'BRANCO', 'VERDE', 'AMARELO', 'VERMELHO', 'LARANJA', 'BEGE', 'MARROM', 'ROXO', 'LILÁS', 'CINZA', 'ESTAMPADO', 'DIVERSOS'];
          const titleUpper = title.toUpperCase();
          for (const c of knownColors) {
              if (titleUpper.includes(c)) {
                  color = c.charAt(0) + c.slice(1).toLowerCase(); 
                  break; 
              }
          }
      }
      if (!color) color = "Cor Principal"; // Padrão se nada for achado

      // Tamanhos (Fallback Visual)
      if (rawSizes.length === 0) {
          const pickers = document.querySelectorAll('.ui-pdp-outside_variations__picker');
          pickers.forEach(picker => {
              const titleEl = picker.querySelector('.ui-pdp-outside_variations__title__label');
              if (titleEl && titleEl.innerText.toUpperCase().includes('TAMANHO')) {
                  picker.querySelectorAll('.ui-pdp-outside_variations__thumbnails__item__label span').forEach(item => {
                      const txt = item.innerText.trim();
                      if (txt) rawSizes.push(txt);
                  });
              }
          });
      }
      if (rawSizes.length === 0) {
           const variationRows = document.querySelectorAll('.ui-pdp-outside_variations__picker');
           variationRows.forEach(row => {
               const titleEl = row.querySelector('.ui-pdp-outside_variations__title__label');
               const valueEl = row.querySelector('.ui-pdp-outside_variations__title__value');
               if (titleEl && valueEl && titleEl.innerText.toUpperCase().includes('TAMANHO')) {
                   rawSizes.push(valueEl.innerText.trim());
               }
           });
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

      return { title, price, desc, imgs, color, rawSizes: [...new Set(rawSizes)] };
  });

  // Filtro de Segurança (Remove cor da lista de tamanhos)
  let cleanSizes = data.rawSizes.filter(s => 
      s !== '' && s.toUpperCase() !== data.color.toUpperCase()
  );
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
  
  if (uploadedAssets.length === 0) { 
      console.log("❌ Sem imagens capturadas. Abortando."); 
      return; 
  }

  // --- ESTRUTURA ---
  const variantsStructure = [
      {
          _key: generateKey(),
          _type: 'object',
          colorName: data.color, // Agora usa a cor extraída do sistema
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
      console.log(`✅ SUCESSO! Produto Importado.`);
      console.log(`🎨 Cor Definida: ${data.color}`); // Deve mostrar a cor real, ex: "Azul"
      console.log(`💰 Preço Base: R$ ${costPrice} (Venda: R$ ${salePrice.toFixed(2)})`);
      console.log(`📏 Tamanhos: ${cleanSizes.join(', ')}`);
      console.log(`📄 SKU: ${doc.slug.current}`);
  } catch (err) { console.error("❌ Erro:", err.message); }
  process.exit(0);
}

startScraper();