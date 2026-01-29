const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios'); // Necessário para baixar fotos novas
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

// --- FUNÇÃO DE UPLOAD (Reativada para novas variações) ---
async function uploadMediaToSanity(mediaUrl) {
  if (!mediaUrl) return null;
  try {
    const response = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload('image', buffer, { filename: mediaUrl.split('/').pop() });
    return { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, _key: generateKey() };
  } catch (error) { 
      console.log(`      ⚠️ Falha ao baixar imagem nova: ${error.message}`);
      return null; 
  }
}

// --- FUNÇÃO DE RASPAGEM ---
async function scrapeProductData(page, url) {
    console.log(`   🔗 Acessando: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    const data = await page.evaluate(() => {
        // 1. Preço
        let priceElement = document.querySelector('.special-price .price');
        if (!priceElement) priceElement = document.querySelector('.regular-price .price');
        if (!priceElement) priceElement = document.querySelector('.price-box .price:not(.old-price .price)');

        let priceText = priceElement ? priceElement.innerText.trim() : '0';
        let rawPrice = parseFloat(priceText.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

        // 2. Cor Principal & Imagem Principal (Caso precise criar a cor base)
        let mainColor = 'Única';
        const tds = Array.from(document.querySelectorAll('#product-attribute-specs-table tr'));
        const colorRow = tds.find(tr => tr.innerText.includes('Cor'));
        if (colorRow) mainColor = colorRow.querySelector('.data')?.innerText.trim();

        let mainImage = document.querySelector('.MagicToolboxMainContainer a')?.getAttribute('href');

        // 3. Tamanhos
        let sizes = [];
        try {
            const scripts = Array.from(document.querySelectorAll('script'));
            const match = scripts.find(s => s.innerText.includes('var spConfig'))?.innerText.match(/var spConfig = new Product.Config\((.*)\);/);
            if (match) {
                const json = JSON.parse(match[1]);
                const sizeAttr = Object.values(json.attributes).find(a => a.label === 'Tamanho');
                if (sizeAttr) sizes = sizeAttr.options.map(o => o.label);
            }
        } catch (e) { }
        if (sizes.length === 0) sizes = ['Único'];

        // 4. Links de Variantes
        const variantLinks = [];
        const relatedItems = document.querySelectorAll('#block-related .item');
        relatedItems.forEach(item => {
            const linkEl = item.querySelector('a.product-image');
            if (linkEl) variantLinks.push({ url: linkEl.href });
        });

        return { rawPrice, mainColor, mainImage, sizes, variantLinks };
    });

    return data;
}

function calculatePrice(rawPrice) {
    return parseFloat(((rawPrice * 1.30) + 15.00).toFixed(2));
}

// --- ROBÔ FULL SYNC ---
async function startFullSync() {
    console.log('🚀 Iniciando Atualizador (Modo Espelho Total)...');

    const query = `*[_type == "product" && defined(sourceUrl) && isActive == true]{
        _id, title, sourceUrl, variants, price
    }`;
    
    let sanityProducts = [];
    try {
        sanityProducts = await client.fetch(query);
        console.log(`📋 Lista: ${sanityProducts.length} produtos.`);
    } catch (e) { console.error(e); return; }

    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages())[0];

    for (const [index, product] of sanityProducts.entries()) {
        console.log(`\n========================================`);
        console.log(`🔄 (${index + 1}/${sanityProducts.length}) ${product.title}`);
        
        try {
            const mainData = await scrapeProductData(page, product.sourceUrl);
            const calculatedPrice = calculatePrice(mainData.rawPrice);
            
            if (calculatedPrice <= 15) { 
                console.log(`   ⛔ Preço inválido. Desativando.`);
                await client.patch(product._id).set({ isActive: false }).commit();
                continue;
            }

            // --- A. MAPEAMENTO DO SITE (INVENTORY) ---
            // inventory = { 'AZUL': { sizes: ['P', 'M'], imageUrl: 'http...' } }
            let siteInventory = {};
            
            // Adiciona a cor principal
            siteInventory[mainData.mainColor.toUpperCase()] = {
                sizes: mainData.sizes,
                imageUrl: mainData.mainImage // Guarda a URL da imagem caso precise criar
            };

            // Visita variantes para pegar tamanhos E imagens (para caso precise criar)
            if (mainData.variantLinks.length > 0) {
                process.stdout.write(`   🔎 Mapeando fornecedor: `);
                for (const variantLink of mainData.variantLinks) {
                    try {
                         await page.goto(variantLink.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                         const variantData = await page.evaluate(() => {
                            let specificColor = 'Variante';
                            const tds = Array.from(document.querySelectorAll('#product-attribute-specs-table tr'));
                            const colorRow = tds.find(tr => tr.innerText.includes('Cor'));
                            if (colorRow) specificColor = colorRow.querySelector('.data')?.innerText.trim();
                            
                            let hdImage = document.querySelector('.MagicToolboxMainContainer a')?.getAttribute('href');

                            let sizes = [];
                            try {
                                const scripts = Array.from(document.querySelectorAll('script'));
                                const match = scripts.find(s => s.innerText.includes('var spConfig'))?.innerText.match(/var spConfig = new Product.Config\((.*)\);/);
                                if (match) {
                                    const json = JSON.parse(match[1]);
                                    const sizeAttr = Object.values(json.attributes).find(a => a.label === 'Tamanho');
                                    if (sizeAttr) sizes = sizeAttr.options.map(o => o.label);
                                }
                            } catch (e) { }
                            if (sizes.length === 0) sizes = ['Único'];
                            return { specificColor, sizes, hdImage };
                         });
                         
                         siteInventory[variantData.specificColor.toUpperCase()] = {
                             sizes: variantData.sizes,
                             imageUrl: variantData.hdImage
                         };
                         process.stdout.write(`[${variantData.specificColor}] `);
                    } catch (err) {}
                }
                console.log(""); 
            }

            // --- B. RECONSTRUÇÃO TOTAL (FULL SYNC) ---
            console.log(`   🏗️ Reconstruindo variações...`);
            let currentVariants = product.variants || [];
            let newSanityVariants = [];

            // Iteramos sobre o SITE (Fonte da Verdade)
            for (const [colorName, colorData] of Object.entries(siteInventory)) {
                
                // 1. Tenta achar essa cor no Sanity atual
                let existingVariant = currentVariants.find(v => (v.colorName || 'Única').toUpperCase() === colorName);
                
                let imageAsset = null;

                if (existingVariant) {
                    // SE JÁ EXISTE: Mantém a imagem que você já tem (Preserva edições manuais)
                    console.log(`      ✅ Cor Existente: ${colorName}`);
                    imageAsset = existingVariant.variantImage;
                } else {
                    // SE É NOVA: Faz upload da imagem descoberta
                    console.log(`      ✨ NOVA COR DETECTADA: ${colorName} - Baixando foto...`);
                    imageAsset = await uploadMediaToSanity(colorData.imageUrl);
                }

                // 2. Constrói os Tamanhos (Espelhando o Site)
                const mappedSizes = colorData.sizes.map(siteSize => {
                    // Tenta achar o tamanho antigo pra manter o ID (opcional, mas bom pra histórico)
                    const existingSize = existingVariant?.sizes?.find(s => s.size === siteSize);

                    if (!existingSize) {
                        console.log(`         ➕ Novo Tamanho: ${siteSize}`);
                    }

                    return {
                        _key: existingSize?._key || generateKey(), // Mantém chave ou cria nova
                        size: siteSize,
                        price: calculatedPrice,
                        stock: 10, // Regra de Estoque Padrão
                        sku: `${slugify(product.title).substring(0,10)}-${colorName}-${siteSize}`.toUpperCase()
                    };
                });

                // Adiciona ao novo array
                newSanityVariants.push({
                    _key: existingVariant?._key || generateKey(),
                    _type: 'object',
                    colorName: colorName.charAt(0) + colorName.slice(1).toLowerCase(), // Formata texto Bonito
                    variantImage: imageAsset,
                    sizes: mappedSizes
                });
            }

            // --- C. SALVAMENTO ---
            // O newSanityVariants contém APENAS o que estava no site. 
            // O que estava no Sanity e não no site foi ignorado (excluído).
            
            if (newSanityVariants.length === 0) {
                console.log(`   ⛔ Produto ficou vazio. Desativando.`);
                await client.patch(product._id).set({ isActive: false, variants: [] }).commit();
            } else {
                await client.patch(product._id)
                    .set({ 
                        variants: newSanityVariants,
                        price: calculatedPrice
                    })
                    .commit();
                console.log(`   💾 Sincronização completa!`);
            }

        } catch (err) {
            console.error(`   ❌ Erro: ${err.message}`);
        }
    }
    console.log('\n🏁 Finalizado!');
    process.exit(0);
}

startFullSync();