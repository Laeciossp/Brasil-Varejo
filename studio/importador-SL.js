// importador-sl-v5.js
// VERSÃO DEFINITIVA: Navegação Real em cada Variante para Captura HD

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
const DEFAULT_CATEGORY_ID = '7ef4bb1b-a674-41cc-b38e-dd3daa2f19ac'; 

// --- FUNÇÃO DE UPLOAD ---
async function uploadMediaToSanity(mediaUrl) {
  if (!mediaUrl) return null;
  try {
    const response = await axios.get(mediaUrl, { 
        responseType: 'arraybuffer', 
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' } 
    });
    
    // Log apenas do nome do arquivo para não poluir
    const fileName = mediaUrl.split('/').pop();
    console.log(`      📸 Baixado HD: ${fileName}`);
    
    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload('image', buffer, { filename: fileName });
    return { 
        _type: 'image', 
        asset: { _type: 'reference', _ref: asset._id },
        _key: generateKey()
    };
  } catch (error) { 
      console.log(`      ❌ Erro download: ${error.message}`);
      return null; 
  }
}

async function startScraper() {
  console.log('🔌 Iniciando Importador V5 (Modo Navegação Profunda)...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages())[0];

  // ==================================================================
  // ETAPA 1: EXTRAIR DADOS DO PRODUTO PAI (PÁGINA ATUAL)
  // ==================================================================
  console.log('   📍 Lendo dados do Produto Principal...');
  
  const mainData = await page.evaluate(() => {
      const title = document.querySelector('.product-name h1')?.innerText.trim() || 'Produto Sem Título';
      
      let priceText = document.querySelector('.regular-price .price')?.innerText;
      if (!priceText) priceText = document.querySelector('.special-price .price')?.innerText;
      let rawPrice = parseFloat(priceText?.replace('R$', '').replace('.', '').replace(',', '.') || '0');

      const shortDesc = document.querySelector('.short-description .std')?.innerText.trim() || '';
      const fullDesc = document.querySelector('.tab-content .std')?.innerText.trim() || '';
      const combinedDescription = [shortDesc, fullDesc].filter(t => t).join('\n\n');

      // Cor Principal
      let mainColor = 'Única';
      const tds = Array.from(document.querySelectorAll('#product-attribute-specs-table tr'));
      const colorRow = tds.find(tr => tr.innerText.includes('Cor'));
      if (colorRow) mainColor = colorRow.querySelector('.data')?.innerText.trim();

      // Imagens Principal
      let mainImages = Array.from(document.querySelectorAll('.MagicToolboxSelectorsContainer a'))
          .map(a => a.getAttribute('href'))
          .filter(src => src);
      if (mainImages.length === 0) {
          const singleImg = document.querySelector('.MagicToolboxMainContainer a')?.getAttribute('href');
          if (singleImg) mainImages.push(singleImg);
      }
      mainImages = [...new Set(mainImages)];

      // Tamanhos
      let sizes = [];
      try {
          const scripts = Array.from(document.querySelectorAll('script'));
          const configScript = scripts.find(s => s.innerText.includes('var spConfig'));
          if (configScript) {
              const match = configScript.innerText.match(/var spConfig = new Product.Config\((.*)\);/);
              if (match && match[1]) {
                  const json = JSON.parse(match[1]);
                  const sizeAttr = Object.values(json.attributes).find(a => a.label === 'Tamanho' || a.code === 'magework_tamanhos');
                  if (sizeAttr) sizes = sizeAttr.options.map(o => o.label);
              }
          }
      } catch (e) { }
      if (sizes.length === 0) sizes = ['Único'];

      // Links das Variantes (O SEGREDO ESTÁ AQUI)
      const variantLinks = [];
      const relatedItems = document.querySelectorAll('#block-related .item');
      relatedItems.forEach(item => {
          const linkEl = item.querySelector('a.product-image');
          const nameEl = item.querySelector('.product-name a');
          if (linkEl && nameEl) {
              variantLinks.push({
                  url: linkEl.href,
                  tempName: nameEl.innerText.trim()
              });
          }
      });

      return { title, rawPrice, description: combinedDescription, mainColor, mainImages, sizes, variantLinks };
  });

  // Cálculo Preço
  const finalPrice = parseFloat(((mainData.rawPrice * 1.30) + 15.00).toFixed(2));
  console.log(`   📦 ${mainData.title}`);
  console.log(`   💰 Preço Calculado: R$${finalPrice}`);

  // Upload Imagens Principal
  console.log(`   ⬆️ Uploading imagens principais (${mainData.mainImages.length})...`);
  const mainImageAssets = [];
  for (const url of mainData.mainImages) {
      const asset = await uploadMediaToSanity(url);
      if (asset) mainImageAssets.push(asset);
  }

  // Inicializa Variantes do Sanity com a Principal
  const sanityVariants = [];
  
  if (mainImageAssets.length > 0) {
      sanityVariants.push({
          _key: generateKey(),
          _type: 'object',
          colorName: mainData.mainColor,
          variantImage: mainImageAssets[0],
          images: mainImageAssets,
          sizes: mainData.sizes.map(s => ({
              _key: generateKey(),
              size: s,
              price: finalPrice,
              stock: 10,
              sku: `${slugify(mainData.title).substring(0,10)}-${mainData.mainColor}-${s}`.toUpperCase()
          }))
      });
  }

  // ==================================================================
  // ETAPA 2: VISITAR CADA VARIANTE (NAVEGAÇÃO REAL)
  // ==================================================================
  console.log(`\n🔄 Iniciando navegação em ${mainData.variantLinks.length} variantes...`);

  for (const variant of mainData.variantLinks) {
      console.log(`   👉 Navegando para: ${variant.tempName}...`);
      
      try {
          // Vai para a página da variante
          await page.goto(variant.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
          
          // Extrai a imagem HD e o nome da cor REAL da página
          const variantPageData = await page.evaluate(() => {
              // Pega imagem HD do MagicZoom dessa página
              let hdImage = document.querySelector('.MagicToolboxMainContainer a')?.getAttribute('href');
              
              // Pega a cor exata da tabela dessa página
              let specificColor = 'Variante';
              const tds = Array.from(document.querySelectorAll('#product-attribute-specs-table tr'));
              const colorRow = tds.find(tr => tr.innerText.includes('Cor'));
              if (colorRow) specificColor = colorRow.querySelector('.data')?.innerText.trim();

              return { hdImage, specificColor };
          });

          if (variantPageData.hdImage) {
              // Faz upload da imagem HD capturada
              const variantAsset = await uploadMediaToSanity(variantPageData.hdImage);
              
              if (variantAsset) {
                  sanityVariants.push({
                      _key: generateKey(),
                      _type: 'object',
                      colorName: variantPageData.specificColor, // Nome oficial da cor
                      variantImage: variantAsset,
                      // Variantes secundárias: sem galeria extra, usa tamanhos padrão
                      sizes: mainData.sizes.map(s => ({
                          _key: generateKey(),
                          size: s,
                          price: finalPrice,
                          stock: 5,
                          sku: `${slugify(mainData.title).substring(0,10)}-${variantPageData.specificColor}-${s}`.toUpperCase()
                      }))
                  });
              }
          } else {
              console.log('      ⚠️ MagicZoom não encontrado nesta variante.');
          }

      } catch (err) {
          console.log(`      ❌ Erro ao visitar variante: ${err.message}`);
      }
  }

  // ==================================================================
  // ETAPA 3: SALVAR NO SANITY
  // ==================================================================
  const doc = {
    _type: 'product',
    title: mainData.title,
    slug: { 
        _type: 'slug', 
        current: slugify(mainData.title, { lower: true, strict: true }) + `-${Date.now().toString().slice(-4)}` 
    },
    isActive: true,
    price: finalPrice,
    description: [
        { 
            _type: 'block', 
            _key: generateKey(), 
            style: 'normal', 
            children: [{ _type: 'span', _key: generateKey(), text: mainData.description }] 
        }
    ],
    images: mainImageAssets,
    categories: [{ _type: 'reference', _ref: DEFAULT_CATEGORY_ID, _key: generateKey() }],
    variants: sanityVariants,
    productType: 'fashion', 
    fashionSpecs: { 
        gender: 'Fem', 
        material: 'Padrão', 
        model: 'Padrão' 
    },
    logistics: { weight: 0.3, width: 20, height: 5, length: 20 }
  };

  console.log(`\n💾 Salvando produto consolidado no Sanity...`);
  try {
      const res = await client.create(doc);
      console.log(`✅ SUCESSO! Produto criado ID: ${res._id}`);
      console.log(`   Total de Variantes: ${sanityVariants.length}`);
  } catch (err) { 
      console.error("❌ Erro Sanity:", err.message); 
  }

  process.exit(0);
}

startScraper();