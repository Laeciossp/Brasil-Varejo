// importador-tours.js
// FUNÇÃO: Entra em cada link da Queensberry, extrai os dados completos do tour,
// baixa as imagens em HD e envia tudo estruturado para o Sanity.

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// ==========================================
// CONFIGURAÇÃO DO SEU BANCO DE DADOS (SANITY)
// ==========================================
const client = createClient({
  projectId: 'o4upb251', // <--- COLOQUE SEU PROJECT ID DA PALASTORE
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' // <--- COLOQUE SEU TOKEN DO SANITY
});

const generateKey = () => Math.random().toString(36).substring(2, 15);

// Função para baixar a foto da Queensberry e subir pro seu Sanity
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
        
        // Dá um tempinho para o PrimeFaces carregar os blocos dinâmicos
        await new Promise(r => setTimeout(r, 3000)); 
    } catch (e) {
        console.log(`   ❌ Erro de conexão ao acessar a página. Pulando...`);
        return;
    }

    const tourData = await page.evaluate(() => {
        // 1. Título
        const titleEl = document.querySelector('.brochure-title');
        const title = titleEl ? titleEl.innerText.trim() : 'Tour Sem Título';

        // 2. Preço (Limpando o "R$" e os pontos)
        const priceEl = document.querySelector('.dev-price-per-person');
        let rawPrice = 0;
        if (priceEl) {
            let priceText = priceEl.innerText.replace('R$', '').trim();
            priceText = priceText.replace(/\./g, '').replace(',', '.'); // Converte 54.565 para 54565.00
            rawPrice = parseFloat(priceText);
        }

        // 3. Imagens HD (Galeria Fancybox ou Lazy Load)
        let imagensElements = Array.from(document.querySelectorAll('a.fancybox'));
        let urlsImagens = imagensElements.map(a => a.getAttribute('data-href') || a.getAttribute('href')).filter(url => url);
        
        if (urlsImagens.length === 0) {
            let imgTags = Array.from(document.querySelectorAll('.c-fit-carousel__img'));
            urlsImagens = imgTags.map(img => img.getAttribute('data-src') || img.src).filter(url => url);
        }
        // Remove duplicadas e garante o HTTPS
        let uniquePhotos = [...new Set(urlsImagens)].map(url => url.startsWith('//') ? 'https:' + url : url);

        // 4. Estrutura da Viagem (Dia a Dia)
        const itinerarioEl = document.querySelector('.remove-closedtour-styles');
        const itinerarioHtml = itinerarioEl ? itinerarioEl.innerHTML.trim() : '';

        // 5. Inclusos e Não Inclusos
        const includedEl = document.querySelector('.dev-included .js-readmore-element span');
        const includedHtml = includedEl ? includedEl.innerHTML.trim() : '';

        const excludedEl = document.querySelector('.dev-excluded .js-readmore-element span');
        const excludedHtml = excludedEl ? excludedEl.innerHTML.trim() : '';

        // 6. Temáticas (Tags)
        const themeEls = Array.from(document.querySelectorAll('.dev-active-themes-item span'));
        const themes = themeEls.map(el => el.innerText.trim());

        return { title, rawPrice, uniquePhotos, itinerarioHtml, includedHtml, excludedHtml, themes };
    });

    if (!tourData || tourData.title === 'Tour Sem Título') {
        console.log(`   ⛔ Roteiro não carregou corretamente ou está indisponível.`);
        return;
    }

    console.log(`   📦 Capturado: ${tourData.title}`);
    console.log(`   💰 Preço Base: R$ ${tourData.rawPrice}`);
    console.log(`   🏷️ Temáticas: ${tourData.themes.join(', ')}`);

    // ==========================================
    // UPLOAD DAS FOTOS PARA O SANITY
    // ==========================================
    console.log(`   📸 Baixando ${tourData.uniquePhotos.length} foto(s) em Alta Definição...`);
    const sanityImages = [];
    for (const fotoUrl of tourData.uniquePhotos) {
        const asset = await uploadMediaToSanity(fotoUrl);
        if (asset) sanityImages.push(asset);
    }

    // ==========================================
    // CRIANDO O DOCUMENTO NO SANITY
    // ==========================================
    // Função auxiliar para transformar HTML simples em Bloco do Sanity
    const toSanityBlock = (htmlString) => {
        if (!htmlString) return [];
        return [{
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: [{ _type: 'span', _key: generateKey(), text: htmlString.replace(/<[^>]*>?/gm, '\n').trim() }] // Remove tags HTML para virar texto limpo
        }];
    };

    // Ajuste os nomes dos campos (_type e etc) conforme a estrutura real do seu Sanity para Tours
    const doc = {
        _type: 'tour', // Mude para o nome da sua Tabela/Schema de Tours no Sanity (ex: 'produto_viagem')
        title: tourData.title,
        sourceUrl: url,
        isActive: true,
        price: tourData.rawPrice,
        tags: tourData.themes,
        images: sanityImages,
        itinerary: toSanityBlock(tourData.itinerarioHtml),
        included: toSanityBlock(tourData.includedHtml),
        excluded: toSanityBlock(tourData.excludedHtml)
    };

    try {
        const res = await client.create(doc);
        console.log(`   ✅ SUCESSO! Tour salvo no Banco de Dados. ID: ${res._id}`);
    } catch (err) { 
        console.error("   ❌ Erro ao salvar no Sanity:", err.message);
    }
}

async function startMassScraper() {
    console.log('🚀 Iniciando Importador Massivo de Tours...');
    let links = [];
    try {
        const fileContent = fs.readFileSync('links_tours.txt', 'utf-8');
        links = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.startsWith('http'));
        console.log(`📋 Lista carregada: ${links.length} roteiros para importar.`);
    } catch (e) {
        console.error('❌ Erro: Arquivo links_tours.txt não encontrado.');
        return;
    }

    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages())[0];
    
    for (const [index, link] of links.entries()) {
        console.log(`\n========================================`);
        console.log(`ROTEIRO ${index + 1} de ${links.length}`);
        console.log(`========================================`);
        try {
            await processSingleTour(page, link);
        } catch (err) {
            console.error(`❌ ERRO CRÍTICO no link:`, err.message);
        }
    }

    console.log('\n🏁 Importação 100% Finalizada!');
    process.exit(0);
}

startMassScraper();