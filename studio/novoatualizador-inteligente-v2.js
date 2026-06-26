// atualizador-inteligente-v6-final.js
const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
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

async function uploadMediaToSanity(mediaUrl) {
  if (!mediaUrl) return null;
  try {
    const response = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload('image', buffer, { filename: mediaUrl.split('/').pop() });
    return { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, _key: generateKey() };
  } catch (error) { 
      return null; 
  }
}

async function scrapeProductData(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (e) {
        return null;
    }

    const data = await page.evaluate(() => {
        const variantsContainer = document.querySelector('.js-product-container[data-variants]');
        let todasVariacoes = [];
        
        if (variantsContainer) {
            try { todasVariacoes = JSON.parse(variantsContainer.getAttribute('data-variants')); } catch (e) {}
        }
        
        if (todasVariacoes.length === 0 && window.LS && window.LS.variants) {
            todasVariacoes = window.LS.variants;
        }

        if (todasVariacoes.length === 0) return null;

        const rawPrice = todasVariacoes[0]?.price_number || 0;
        const siteInventory = {};

        todasVariacoes.forEach(variant => {
            // TRAVA DE ESTOQUE: Se não estiver disponível ou estoque for 0, ignora completamente
            const isAvailable = variant.available && variant.stock > 0;
            if (!isAvailable) return;

            let cor = 'Padrão';
            let tamanho = 'Único';
            
            if (variant.option1) {
                cor = variant.option0;
                tamanho = variant.option1;
            } else if (variant.option0) {
                tamanho = variant.option0;
            }

            cor = cor.toUpperCase();
            const imagemUrl = variant.image_url ? `https:${variant.image_url}` : null;
            
            if (!siteInventory[cor]) {
                siteInventory[cor] = { sizes: [], imageUrl: imagemUrl };
            }
            siteInventory[cor].sizes.push({ tamanho, estoque: variant.stock });
        });

        return { rawPrice, siteInventory };
    });

    return data;
}

function calculatePrice(rawPrice) {
    return parseFloat(((rawPrice * 1.30) + 15.00).toFixed(2));
}

async function startFullSync() {
    console.log('🚀 Iniciando Atualizador Inteligente (Limpando esgotados do Sanity e preservando imagens)...');

    const query = `*[_type == "product" && defined(sourceUrl) && brand match "SL"]{
        _id, title, sourceUrl, variants, price, isActive
    }`;
    
    let sanityProducts = [];
    try {
        sanityProducts = await client.fetch(query);
        console.log(`📋 Lista: ${sanityProducts.length} produtos para verificar.`);
    } catch (e) { console.error(e); return; }

    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages())[0];

    for (const [index, product] of sanityProducts.entries()) {
        console.log(`\n========================================`);
        console.log(`🔄 (${index + 1}/${sanityProducts.length}) ${product.title}`);
        
        try {
            const mainData = await scrapeProductData(page, product.sourceUrl);
            
            if (!mainData) {
                console.log(`   ⛔ Produto não encontrado na loja. Desativando.`);
                await client.patch(product._id).set({ isActive: false }).commit();
                continue;
            }

            const calculatedPrice = calculatePrice(mainData.rawPrice);
            if (calculatedPrice <= 15) { 
                console.log(`   ⛔ Preço inválido. Desativando.`);
                await client.patch(product._id).set({ isActive: false }).commit();
                continue;
            }

            const siteInventory = mainData.siteInventory;

            if (Object.keys(siteInventory).length === 0) {
                console.log(`   ⛔ Produto totalmente esgotado em todos os tamanhos. Desativando e limpando variações.`);
                await client.patch(product._id).set({ isActive: false, variants: [] }).commit();
                continue;
            }

            console.log(`   🏗️ Atualizando tamanhos no Sanity (removendo esgotados)...`);
            let currentVariants = product.variants || [];
            let newSanityVariants = [];

            for (const [colorName, colorData] of Object.entries(siteInventory)) {
                process.stdout.write(`   [Estoque confirmado: ${colorName}] `);
                
                let existingVariant = currentVariants.find(v => (v.colorName || 'Única').toUpperCase() === colorName);
                let imageAsset = null;

                if (existingVariant && existingVariant.variantImage) {
                    imageAsset = existingVariant.variantImage;
                } else if (colorData.imageUrl) {
                    imageAsset = await uploadMediaToSanity(colorData.imageUrl);
                }

                const mappedSizes = colorData.sizes.map(siteVar => {
                    const existingSize = existingVariant?.sizes?.find(s => s.size === siteVar.tamanho);
                    return {
                        _key: existingSize?._key || generateKey(),
                        size: siteVar.tamanho,
                        price: calculatedPrice,
                        stock: siteVar.estoque,
                        sku: `${slugify(product.title).substring(0,10)}-${colorName}-${siteVar.tamanho}`.toUpperCase()
                    };
                });

                newSanityVariants.push({
                    _key: existingVariant?._key || generateKey(),
                    _type: 'object',
                    // Mantém o nome exato da cor que o Importador gravou (ex: "Jeans")
                    colorName: existingVariant?.colorName || (colorName.charAt(0) + colorName.slice(1).toLowerCase()),
                    variantImage: imageAsset,
                    // ALINHAMENTO CRÍTICO: Preserva a galeria de imagens que o Importador carregou
                    images: existingVariant?.images || [], 
                    sizes: mappedSizes
                });
            }

            console.log(""); 

            await client.patch(product._id)
                .set({ 
                    variants: newSanityVariants, 
                    price: calculatedPrice,
                    isActive: true
                })
                .commit();
            console.log(`   💾 Atualizado no Sanity com sucesso.`);

        } catch (err) {
            console.error(`   ❌ Erro crítico: ${err.message}`);
        }
    }
    console.log('\n🏁 Finalizado!');
    process.exit(0);
}

startFullSync();