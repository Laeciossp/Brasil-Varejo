// importador-massivo-v14-final.js
const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const slugify = require('slugify');
const fs = require('fs');
puppeteer.use(StealthPlugin());

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});
const generateKey = () => Math.random().toString(36).substring(2, 15);

const CATEGORY_MAP = [
    { id: '2c2a840e-6a86-47e1-9276-3a3993946c26', rules: [/CONJUNTO.*SAIA/i, /CJ.*SAIA/i, /SAIA.*CROPPED/i, /SAIA.*BLUSA/i, /SAIA.*TOP/i] },
    { id: 'c2bdb8f1-5783-4019-a806-f1265b501998', rules: [/CONJUNTO.*SHORT/i, /CJ.*SHORT/i, /SHORT.*CROPPED/i, /SHORT.*BLUSA/i, /SHORT.*TOP/i, /SHORT.*CAMISA/i, /CONJUNTO.*BERMUDA/i] },
    { id: '25aa9265-d05b-4fc0-be64-8f41a20b780a', rules: [/CONJUNTO.*CAL(Ç|C)A/i, /CJ.*CAL(Ç|C)A/i, /CONJUNTO.*PANTALONA/i, /CAL(Ç|C)A.*CROPPED/i, /CAL(Ç|C)A.*BLUSA/i, /CAL(Ç|C)A.*TOP/i] },
    { id: '0b360a5f-6923-4c22-8d16-6d3ba65f98a2', rules: ['CALÇADO', 'SAPATO', 'TÊNIS', 'SANDÁLIA', 'BOTA', 'PAPETE', 'MULE', 'RASTEIRA'] },
    { id: '1dcd7f06-7dd8-49af-be15-7b19d6d5f15c', rules: ['BERMUDA', 'SHORT'] }, 
    { id: '26077718-39db-4055-b32a-bc91b4be36d4', rules: ['CAMISA', 'CAMISETE'] },
    { id: '2a346772-2540-4da4-b29a-35d8155d8d90', rules: ['SAIA'] },
    { id: '0b5f498b-3f74-4818-9f16-604b11e26f05', rules: ['CALÇA', 'JEANS', 'PANTALONA', 'LEGGING', 'CALCA'] },
    { id: 'dc0d33a3-9165-4d57-8cc2-830f9311d26b', rules: ['VESTIDO', 'LONGO', 'MIDI', 'CURTO'] },
    { id: '7ef4bb1b-a674-41cc-b38e-dd3daa2f19ac', rules: ['BLUSA', 'TOP', 'CROPPED', 'REGATA', 'BODY', 'T-SHIRT', 'TRICOT'] },
    { id: '9ca0fcfe-9f06-44db-8c84-f8d395b610ea', rules: ['MACACÃO', 'MACAQUINHO', 'JARDINEIRA'] }
];
const DEFAULT_CATEGORY_ID = '7ef4bb1b-a674-41cc-b38e-dd3daa2f19ac'; 

function getFixedCategoryId(detectedName, productTitle, productDescription, productUrl) {
    const cleanUrl = productUrl ? productUrl.replace(/-/g, ' ').replace(/\//g, ' ') : '';
    const textToScan = (detectedName + ' ' + productTitle + ' ' + (productDescription || '') + ' ' + cleanUrl).toUpperCase();
    for (const category of CATEGORY_MAP) {
        for (const rule of category.rules) {
            if (rule instanceof RegExp) {
                if (rule.test(textToScan)) return category.id;
            } else if (typeof rule === 'string') {
                if (textToScan.includes(rule)) return category.id;
            }
        }
    }
    return DEFAULT_CATEGORY_ID;
}

async function uploadMediaToSanity(mediaUrl) {
    if (!mediaUrl) return null;
    try {
        const response = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const buffer = Buffer.from(response.data, 'binary');
        const asset = await client.assets.upload('image', buffer, { filename: mediaUrl.split('/').pop() });
        return { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, _key: generateKey() };
    } catch (error) { return null; }
}

async function processSingleProduct(page, url) {
    console.log(`\n🔗 Acessando: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    const mainData = await page.evaluate(() => {
        const variantsContainer = document.querySelector('.js-product-container[data-variants]');
        let todasVariacoes = [];
        
        if (variantsContainer) {
            try { todasVariacoes = JSON.parse(variantsContainer.getAttribute('data-variants')); } catch (e) {}
        }
        
        if (todasVariacoes.length === 0 && window.LS && window.LS.variants) {
            todasVariacoes = window.LS.variants;
        }

        if (todasVariacoes.length === 0) return null;

        const title = window.LS?.product?.name || document.querySelector('h1')?.innerText || 'Produto Sem Título';
        const rawPrice = todasVariacoes[0]?.price_number || 0;

        const descEl = document.querySelector('.user-content') 
                    || document.querySelector('[data-store="product-description"]') 
                    || document.querySelector('.js-product-description')
                    || document.querySelector('.description');
        const description = descEl ? descEl.innerText.trim() : 'Descrição não encontrada';

        let detectedCategory = '';
        const breadcrumbs = Array.from(document.querySelectorAll('.js-breadcrumb li a, [data-store="breadcrumb"] li a'));
        if (breadcrumbs.length > 0) {
            const validCrumbs = breadcrumbs.map(a => a.innerText.trim()).filter(t => !t.includes('Início') && !t.includes('Home') && t !== '/');
            if (validCrumbs.length > 0) detectedCategory = validCrumbs[validCrumbs.length - 1]; 
        }

        // ==========================================
        // NOVO: CAPTURADOR DA GALERIA DE FOTOS
        // ==========================================
        let galerias = Array.from(document.querySelectorAll('a.js-product-slide-link, a[data-fancybox="product-gallery"]'))
            .map(a => a.getAttribute('href'))
            .filter(href => href);
        
        // Se falhar o link, tenta pegar direto as imagens da miniatura
        if (galerias.length === 0) {
             galerias = Array.from(document.querySelectorAll('.js-product-slide-img, .product-slider-image'))
                .map(img => img.getAttribute('data-src') || img.getAttribute('src'))
                .filter(src => src && !src.includes('data:image')); // ignora base64 vazios
        }

        // Remove links duplicados e garante o HTTPS
        let uniquePhotos = [...new Set(galerias)].map(url => url.startsWith('//') ? 'https:' + url : url);
        // ==========================================

        const colorsMap = {};
        
        todasVariacoes.forEach(variant => {
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

            const estoque = variant.stock;
            const imagem_url = variant.image_url ? `https:${variant.image_url}` : null;

            if (!colorsMap[cor]) {
                colorsMap[cor] = { corName: cor, imagem: imagem_url, tamanhos: [] };
            }
            colorsMap[cor].tamanhos.push({ tamanho, estoque, sku: variant.sku });
        });

        return { title, rawPrice, description, detectedCategory, colorsMap, uniquePhotos };
    });

    if (!mainData) {
        console.log(`   ❌ Erro: Dados da loja não encontrados na página.`);
        return;
    }

    if (Object.keys(mainData.colorsMap).length === 0) {
        console.log(`   ⛔ Produto totalmente esgotado. Ignorando importação.`);
        return;
    }

    const finalPrice = parseFloat(((mainData.rawPrice * 1.30) + 15.00).toFixed(2));
    const targetCategoryId = getFixedCategoryId(mainData.detectedCategory, mainData.title, mainData.description, url);
    
    console.log(`   📦 ${mainData.title}`);
    console.log(`   📂 ID Categoria: ${targetCategoryId}`);

    const categoryRef = [{ _type: 'reference', _ref: targetCategoryId, _key: generateKey() }];
    
    // ==========================================
    // UPLOAD DE TODA A GALERIA DE FOTOS
    // ==========================================
    console.log(`   📸 Baixando ${mainData.uniquePhotos.length} foto(s) da galeria...`);
    const allGalleryAssets = [];
    for (const fotoUrl of mainData.uniquePhotos) {
        const asset = await uploadMediaToSanity(fotoUrl);
        if (asset) allGalleryAssets.push(asset);
    }

    const sanityVariants = [];

    console.log(`   ⬆️ Montando variações com estoque...`);
    
    for (const [cor, dadosCor] of Object.entries(mainData.colorsMap)) {
        
        // Define a foto principal da cor (tenta pegar a específica, ou usa a 1ª da galeria)
        let mainVariantImage = null;
        if (dadosCor.imagem) {
            mainVariantImage = await uploadMediaToSanity(dadosCor.imagem);
        } else if (allGalleryAssets.length > 0) {
            mainVariantImage = allGalleryAssets[0];
        }

        const mappedSizes = dadosCor.tamanhos.map(s => ({
            _key: generateKey(),
            size: s.tamanho,
            price: finalPrice,
            stock: s.estoque,
            sku: s.sku || `${slugify(mainData.title).substring(0,10)}-${cor}-${s.tamanho}`.toUpperCase()
        }));

        sanityVariants.push({
            _key: generateKey(),
            _type: 'object',
            colorName: cor,
            variantImage: mainVariantImage,
            images: allGalleryAssets.length > 0 ? allGalleryAssets : [], // Injeta todas as fotos aqui
            sizes: mappedSizes
        });
    }

    const doc = {
        _type: 'product',
        title: mainData.title,
        sourceUrl: url,
        slug: { _type: 'slug', current: slugify(mainData.title, { lower: true, strict: true }) + `-${Date.now().toString().slice(-4)}` },
        isActive: true,
        price: finalPrice,
        description: [{ _type: 'block', _key: generateKey(), style: 'normal', children: [{ _type: 'span', _key: generateKey(), text: mainData.description }] }],
        images: allGalleryAssets.length > 0 ? allGalleryAssets : [], // Injeta todas as fotos no produto pai
        brand: 'SL',
        categories: categoryRef, 
        variants: sanityVariants,
        productType: 'fashion', 
        fashionSpecs: { gender: 'Fem', material: 'Padrão', model: 'Padrão' },
        logistics: { weight: 0.3, width: 20, height: 5, length: 20 }
    };

    try {
        const res = await client.create(doc);
        console.log(`   ✅ SUCESSO! Produto importado no Sanity. ID: ${res._id}`);
    } catch (err) { 
        console.error("   ❌ Erro Sanity:", err.message);
    }
}

async function startMassScraper() {
    console.log('🚀 Iniciando Importador (Galeria de Fotos Completa Restaurada)...');
    let links = [];
    try {
        const fileContent = fs.readFileSync('links.txt', 'utf-8');
        links = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.startsWith('http'));
        console.log(`📋 Lista carregada: ${links.length} produtos.`);
    } catch (e) {
        console.error('❌ Erro: Arquivo links.txt não encontrado.');
        return;
    }

    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages())[0];
    
    for (const [index, link] of links.entries()) {
        console.log(`\n========================================`);
        console.log(`PRODUTO ${index + 1} de ${links.length}`);
        console.log(`========================================`);
        try {
            await processSingleProduct(page, link);
        } catch (err) {
            console.error(`❌ ERRO CRÍTICO no link:`, err.message);
        }
    }

    console.log('\n🏁 Finalizado!');
    process.exit(0);
}

startMassScraper();