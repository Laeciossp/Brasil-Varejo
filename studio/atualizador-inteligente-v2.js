const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
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

// --- FUNÇÃO DE RASPAGEM OTIMIZADA ---
async function scrapeProductData(page, url) {
    // console.log(`   🔗 Verificando: ${url}`);
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (e) {
        console.log(`      ⚠️ Erro ao carregar página: ${e.message}`);
        return null;
    }

    const data = await page.evaluate(() => {
        // 0. DETECTOR DE ESTOQUE (CRÍTICO)
        const bodyText = document.body.innerText.toUpperCase();
        // Verifica textos comuns de falta de estoque
        const isOutOfStock = bodyText.includes('SEM ESTOQUE') || 
                             bodyText.includes('ESGOTADO') || 
                             bodyText.includes('INDISPONÍVEL');

        // 1. Preço
        let priceElement = document.querySelector('.special-price .price');
        if (!priceElement) priceElement = document.querySelector('.regular-price .price');
        if (!priceElement) priceElement = document.querySelector('.price-box .price:not(.old-price .price)');

        let priceText = priceElement ? priceElement.innerText.trim() : '0';
        let rawPrice = parseFloat(priceText.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

        // 2. Cor
        let specificColor = 'Padrão';
        const tds = Array.from(document.querySelectorAll('#product-attribute-specs-table tr'));
        const colorRow = tds.find(tr => tr.innerText.includes('Cor'));
        if (colorRow) specificColor = colorRow.querySelector('.data')?.innerText.trim();

        // 3. Imagem
        let mainImage = document.querySelector('.MagicToolboxMainContainer a')?.getAttribute('href');

        // 4. Tamanhos
        let sizes = [];
        try {
            // Tenta pegar do JSON da página (mais confiável)
            const scripts = Array.from(document.querySelectorAll('script'));
            const match = scripts.find(s => s.innerText.includes('var spConfig'))?.innerText.match(/var spConfig = new Product.Config\((.*)\);/);
            if (match) {
                const json = JSON.parse(match[1]);
                const sizeAttr = Object.values(json.attributes).find(a => a.label === 'Tamanho');
                if (sizeAttr) sizes = sizeAttr.options.map(o => o.label);
            }
        } catch (e) { }

        // LÓGICA DE CORREÇÃO:
        if (sizes.length === 0) {
            if (isOutOfStock) {
                // Se não achou tamanhos E está escrito sem estoque -> É VAZIO MESMO (DESATIVA)
                sizes = []; 
            } else {
                // Se não achou tamanhos MAS NÃO está escrito sem estoque -> É ÚNICO (ATIVA)
                sizes = ['Único'];
            }
        }

        // 5. Links das Outras Cores (Variantes)
        const variantLinks = [];
        const relatedItems = document.querySelectorAll('#block-related .item'); // "CORES DISPONÍVEIS"
        relatedItems.forEach(item => {
            const linkEl = item.querySelector('a.product-image');
            if (linkEl) variantLinks.push({ url: linkEl.href });
        });

        return { rawPrice, specificColor, mainImage, sizes, variantLinks, isOutOfStock };
    });

    return data;
}

function calculatePrice(rawPrice) {
    return parseFloat(((rawPrice * 1.30) + 15.00).toFixed(2));
}

// --- ROBÔ FULL SYNC ---
async function startFullSync() {
    console.log('🚀 Iniciando Atualizador Inteligente (Detector de Cores & Reposição)...');

    // QUERY AJUSTADA: Traz APENAS produtos SL (ativos ou inativos)
    // Removemos o "OR isActive == true" para impedir que ele puxe SN
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
            // A. Analisa a URL Principal (que pode ser a Marrom sem estoque)
            const mainData = await scrapeProductData(page, product.sourceUrl);
            
            if (!mainData) continue;

            const calculatedPrice = calculatePrice(mainData.rawPrice);
            if (calculatedPrice <= 15) { 
                console.log(`   ⛔ Preço inválido (R$ ${mainData.rawPrice}). Desativando.`);
                await client.patch(product._id).set({ isActive: false }).commit();
                continue;
            }

            // B. Mapeamento Geral do Site (Site Inventory)
            let siteInventory = {};
            
            // Adiciona a cor principal SÓ SE tiver estoque
            if (mainData.sizes && mainData.sizes.length > 0) {
                siteInventory[mainData.specificColor.toUpperCase()] = {
                    sizes: mainData.sizes,
                    imageUrl: mainData.mainImage
                };
                console.log(`   ✅ Cor Principal (${mainData.specificColor}): Disponível.`);
            } else {
                console.log(`   ⛔ Cor Principal (${mainData.specificColor}): SEM ESTOQUE.`);
            }

            // C. Visita as variações (ex: Branca) para ver se tem estoque
            if (mainData.variantLinks.length > 0) {
                process.stdout.write(`   🔎 Verificando outras cores: `);
                
                for (const variantLink of mainData.variantLinks) {
                    // Evita re-visitar a mesma URL se já estivermos nela
                    if (variantLink.url === product.sourceUrl) continue;

                    const variantData = await scrapeProductData(page, variantLink.url);
                    
                    if (variantData && variantData.sizes.length > 0) {
                        // Se tem estoque, adiciona ao inventário
                        siteInventory[variantData.specificColor.toUpperCase()] = {
                             sizes: variantData.sizes,
                             imageUrl: variantData.mainImage // Usa a imagem dessa variação
                        };
                        process.stdout.write(`[✅ ${variantData.specificColor}] `);
                    } else {
                        // Se não tem estoque, ignora
                        process.stdout.write(`[⛔ ${variantData?.specificColor || 'Desc'}] `);
                    }
                }
                console.log(""); 
            }

            // --- RECONSTRUÇÃO ---
            // Se o inventário do site estiver vazio (nem marrom, nem branca, nada), desativa tudo.
            if (Object.keys(siteInventory).length === 0) {
                console.log(`   ⛔ NENHUMA cor disponível. Desativando produto.`);
                await client.patch(product._id).set({ isActive: false, variants: [] }).commit();
                continue; // Vai pro próximo
            }

            // Se chegou aqui, TEM alguma cor disponível. Vamos montar o Sanity.
            console.log(`   🏗️ Montando variações válidas...`);
            let currentVariants = product.variants || [];
            let newSanityVariants = [];

            for (const [colorName, colorData] of Object.entries(siteInventory)) {
                
                // Tenta reaproveitar dados antigos (imagem, chave)
                let existingVariant = currentVariants.find(v => (v.colorName || 'Única').toUpperCase() === colorName);
                
                let imageAsset = null;
                if (existingVariant) {
                    imageAsset = existingVariant.variantImage;
                } else {
                    console.log(`      ✨ Baixando foto da nova cor: ${colorName}...`);
                    imageAsset = await uploadMediaToSanity(colorData.imageUrl);
                }

                const mappedSizes = colorData.sizes.map(siteSize => {
                    const existingSize = existingVariant?.sizes?.find(s => s.size === siteSize);
                    return {
                        _key: existingSize?._key || generateKey(),
                        size: siteSize,
                        price: calculatedPrice,
                        stock: 10,
                        sku: `${slugify(product.title).substring(0,10)}-${colorName}-${siteSize}`.toUpperCase()
                    };
                });

                newSanityVariants.push({
                    _key: existingVariant?._key || generateKey(),
                    _type: 'object',
                    colorName: colorName.charAt(0) + colorName.slice(1).toLowerCase(),
                    variantImage: imageAsset,
                    sizes: mappedSizes
                });
            }

            await client.patch(product._id)
                .set({ 
                    variants: newSanityVariants,
                    price: calculatedPrice,
                    isActive: true // Garante que volta a ficar ativo se tiver estoque
                })
                .commit();
            console.log(`   💾 Atualizado com ${newSanityVariants.length} cores ativas.`);

        } catch (err) {
            console.error(`   ❌ Erro crítico: ${err.message}`);
        }
    }
    console.log('\n🏁 Finalizado!');
    process.exit(0);
}

startFullSync();