// importador-tours.js
// FUNÇÃO: Importa tours da Queensberry e já embuti os 5% do Mercado Pago no preço.

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
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

async function uploadMediaToSanity(mediaUrl) {
    if (!mediaUrl) return null;
    try {
        const response = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const buffer = Buffer.from(response.data, 'binary');
        const asset = await client.assets.upload('image', buffer, { filename: mediaUrl.split('/').pop() });
        return { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, _key: generateKey() };
    } catch (error) { 
        console.log(`     ⚠️ Aviso: Falha ao baixar a imagem ${mediaUrl}`);
        return null; 
    }
}

async function processSingleTour(page, url) {
    console.log(`\n🔗 Acessando Tour: ${url}`);
    
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000)); 
    } catch (e) {
        console.log(`   ❌ Erro de conexão. Pulando...`);
        return;
    }

    const tourData = await page.evaluate(() => {
        const titleEl = document.querySelector('.brochure-title');
        const title = titleEl ? titleEl.innerText.trim() : 'Tour Sem Título';

        const priceEl = document.querySelector('.dev-price-per-person');
        let rawPrice = 0;
        if (priceEl) {
            let priceText = priceEl.innerText.replace('R$', '').trim();
            priceText = priceText.replace(/\./g, '').replace(',', '.');
            rawPrice = parseFloat(priceText);
        }

        let imagensElements = Array.from(document.querySelectorAll('a.fancybox'));
        let urlsImagens = imagensElements.map(a => a.getAttribute('data-href') || a.getAttribute('href')).filter(url => url);
        
        if (urlsImagens.length === 0) {
            let imgTags = Array.from(document.querySelectorAll('.c-fit-carousel__img'));
            urlsImagens = imgTags.map(img => img.getAttribute('data-src') || img.src).filter(url => url);
        }
        let uniquePhotos = [...new Set(urlsImagens)].map(url => url.startsWith('//') ? 'https:' + url : url);

        const itinerarioEl = document.querySelector('.remove-closedtour-styles');
        const itinerarioHtml = itinerarioEl ? itinerarioEl.innerHTML.trim() : '';

        const includedEl = document.querySelector('.dev-included .js-readmore-element span');
        const includedHtml = includedEl ? includedEl.innerHTML.trim() : '';

        const excludedEl = document.querySelector('.dev-excluded .js-readmore-element span');
        const excludedHtml = excludedEl ? excludedEl.innerHTML.trim() : '';

        const themeEls = Array.from(document.querySelectorAll('.dev-active-themes-item span'));
        const themes = themeEls.map(el => el.innerText.trim());

        return { title, rawPrice, uniquePhotos, itinerarioHtml, includedHtml, excludedHtml, themes };
    });

    if (!tourData || tourData.title === 'Tour Sem Título') {
        console.log(`   ⛔ Roteiro indisponível. Pulando...`);
        return;
    }

    // APLICAÇÃO DA REGRA DOS 5% DO MERCADO PAGO
    const precoComTaxa = parseFloat((tourData.rawPrice / 0.95).toFixed(2));

    console.log(`   📦 Capturado: ${tourData.title}`);
    console.log(`   💰 Custo QBY: R$ ${tourData.rawPrice} | Venda (+5%): R$ ${precoComTaxa}`);

    const sanityImages = [];
    for (const fotoUrl of tourData.uniquePhotos) {
        const asset = await uploadMediaToSanity(fotoUrl);
        if (asset) sanityImages.push(asset);
    }

    const toSanityBlock = (htmlString) => {
        if (!htmlString) return [];
        return [{
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: [{ _type: 'span', _key: generateKey(), text: htmlString.replace(/<[^>]*>?/gm, '\n').trim() }]
        }];
    };

    const doc = {
        _type: 'tour',
        title: tourData.title,
        slug: { _type: 'slug', current: tourData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}` },
        sourceUrl: url,
        isActive: true,
        price: precoComTaxa, // SALVA O PREÇO NOVO
        tags: tourData.themes,
        images: sanityImages,
        itinerary: toSanityBlock(tourData.itinerarioHtml),
        included: toSanityBlock(tourData.includedHtml),
        excluded: toSanityBlock(tourData.excludedHtml)
    };

    try {
        const res = await client.create(doc);
        console.log(`   ✅ SUCESSO! ID: ${res._id}`);
    } catch (err) { 
        console.error("   ❌ Erro ao salvar:", err.message);
    }
}

async function startMassScraper() {
    console.log('🚀 Iniciando Importador de Tours...');
    let links = [];
    try {
        const fileContent = fs.readFileSync('links_tours.txt', 'utf-8');
        links = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.startsWith('http'));
    } catch (e) {
        console.error('❌ Erro: Arquivo links_tours.txt não encontrado.');
        return;
    }

    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages())[0];
    
    for (const [index, link] of links.entries()) {
        try {
            await processSingleTour(page, link);
        } catch (err) {}
    }
    console.log('\n🏁 Importação Finalizada!');
    process.exit(0);
}

startMassScraper();