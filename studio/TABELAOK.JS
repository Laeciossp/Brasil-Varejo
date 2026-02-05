const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const slugify = require('slugify');
const fs = require('fs');
const readline = require('readline');

puppeteer.use(StealthPlugin());

// --- CONFIGURAÇÃO SANITY ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

const ID_MODA_PRAIA = '7717f1c5-8568-45f9-b161-b5ee308a89b4';
const generateKey = () => Math.random().toString(36).substring(2, 15);
const LOGISTICA_PADRAO = { weight: 0.3, width: 20, height: 5, length: 20 };

// Função para pausar e pedir ajuda
async function askForHelp(msg) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n\x1b[41m\x1b[37m%s\x1b[0m', ` 🚨 AJUDA NECESSÁRIA: ${msg} `);
    console.log('\x1b[33m%s\x1b[0m', '   👉 Resolva o bloqueio/captcha no navegador.');
    return new Promise(resolve => {
        rl.question('   ✅ Quando o produto aparecer, APERTE ENTER aqui...', () => {
            rl.close();
            resolve();
        });
    });
}

async function uploadMediaToSanity(mediaUrl) {
    if (!mediaUrl) return null;
    try {
        if (mediaUrl.startsWith('//')) mediaUrl = 'https:' + mediaUrl;
        const response = await axios.get(mediaUrl, { 
            responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        const buffer = Buffer.from(response.data, 'binary');
        const asset = await client.assets.upload('image', buffer, { filename: mediaUrl.split('/').pop() });
        return { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, _key: generateKey() };
    } catch (error) { return null; }
}

async function scrapeSheinData(page, url) {
    let attempts = 0;
    while (true) {
        try {
            if (attempts === 0) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            try { 
                await page.evaluate(() => {
                    document.querySelectorAll('.close-btn, .she-close, .svgicon-close, .j-close-btn').forEach(b => b.click());
                });
            } catch(e) {}

            // 1. DADOS BÁSICOS
            const basicData = await page.evaluate(() => {
                let title = document.querySelector('h1.product-intro__head-name')?.innerText || 
                            document.querySelector('.detail-title')?.innerText || '';
                
                let rawPrice = 0;
                const idPrice = document.getElementById('productMainPriceId');
                if (idPrice) {
                    rawPrice = parseFloat(idPrice.innerText.replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.'));
                } else {
                    const text = document.body.innerText || '';
                    const matches = text.match(/R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/g);
                    if (matches) {
                        let prices = matches.map(m => parseFloat(m.replace(/[^\d.,]/g, '').replace(',', '.')));
                        prices = prices.filter(p => p > 15 && p < 10000);
                        if (prices.length > 0) rawPrice = prices[0]; 
                    }
                }
                
                if (title) {
                    const blacklist = ['Vendedor Indicado', 'Flash Sale', 'Oferta', 'Novo', 'Top', 'Shein', 'SHEIN', 'Brasil'];
                    blacklist.forEach(w => { title = title.replace(new RegExp(w, 'gi'), ''); });
                    title = title.replace(/^[\s\|\-\.]+/g, '').trim();
                }

                const imgEls = document.querySelectorAll('.product-intro__main img, .crop-image-container img');
                let images = [];
                imgEls.forEach(img => {
                    if(img.src && !img.src.includes('gif')) {
                        images.push(img.src.replace('_220x293', '').replace('_thumbnail', '').replace('_170x170', '').split('?')[0]);
                    }
                });

                return { title, rawPrice, images };
            });

            if (!basicData.title || !basicData.rawPrice || basicData.title === 'SHEIN') {
                await askForHelp("Título/Preço não encontrados.");
                attempts++;
                continue; 
            }

            // 2. EXTRAÇÃO DE TABELA (TIRA-TEIMA)
            let guideTextResult = "";
            try {
                await page.evaluate(() => window.scrollBy(0, 400));
                await new Promise(r => setTimeout(r, 1000));

                const clicked = await page.evaluate(() => {
                    // Mira Laser no SPAN
                    const spans = document.getElementsByTagName('span');
                    for (let span of spans) {
                        if (span.innerText.trim() === 'Guia de tamanhos' || span.innerText.trim() === 'Size Guide') {
                            span.click(); return true;
                        }
                    }
                    // Backup Mira Laser
                    const all = document.querySelectorAll('div, a, p');
                    for (let el of all) {
                        if (el.innerText && (el.innerText.includes('Guia de tamanhos') || el.innerText.includes('Medidas')) && el.offsetParent !== null) {
                             if (el.tagName !== 'BODY' && el.tagName !== 'HTML' && el.children.length < 5) {
                                el.click(); return true;
                             }
                        }
                    }
                    return false;
                });

                if (clicked) {
                    await new Promise(r => setTimeout(r, 3500)); // Espera modal

                    guideTextResult = await page.evaluate(async () => {
                        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
                        let combinedText = "";

                        // Função de raspagem filtrada
                        const scrapeVisibleFiltered = () => {
                            let txt = "";
                            const tables = document.querySelectorAll('table');
                            tables.forEach(table => {
                                // Verifica visibilidade e tamanho mínimo
                                if (table.offsetParent !== null && table.innerText.length > 10) {
                                    const rows = table.querySelectorAll('tr');
                                    rows.forEach(row => {
                                        let rowTxt = "";
                                        const cells = Array.from(row.querySelectorAll('th, td')).map(c => c.innerText.replace(/\n/g, ' ').trim());
                                        // Filtra células vazias
                                        const validCells = cells.filter(c => c.length > 0);
                                        if (validCells.length > 0) {
                                            rowTxt = validCells.join(' | ');
                                            txt += rowTxt + '\n';
                                        }
                                    });
                                }
                            });
                            return txt;
                        };

                        // Tenta abas
                        const tabs = Array.from(document.querySelectorAll('.she-tabs-header-item, .common-tabs__tab'));
                        if (tabs.length === 0) return scrapeVisibleFiltered();

                        for (let tab of tabs) {
                            const tabName = tab.innerText.toUpperCase();
                            if (tabName.includes('PRODUTO') || tabName.includes('PRODUCT') || tabName.includes('CORPO') || tabName.includes('BODY')) {
                                tab.click();
                                await sleep(1000);
                                const tableContent = scrapeVisibleFiltered();
                                // Só adiciona se tiver conteúdo real (letras/numeros)
                                if (tableContent.match(/[a-zA-Z0-9]/)) {
                                    combinedText += `\n--- ${tab.innerText} ---\n${tableContent}`;
                                }
                            }
                        }
                        return combinedText;
                    });

                    await page.evaluate(() => {
                        const closeBtn = document.querySelector('.she-modal-close');
                        if (closeBtn) closeBtn.click();
                    });
                }
            } catch(e) { console.log("Erro tabela: " + e.message); }

            // 3. FINALIZAÇÃO
            const finalData = await page.evaluate((basicData, guideTextResult) => {
                const tabs = document.querySelectorAll('.common-tabs__tab, .product-intro__description-table-title');
                tabs.forEach(t => t.click());

                const getText = (sel) => { 
                    const els = document.querySelectorAll(sel);
                    let txt = '';
                    els.forEach(e => txt += e.innerText + '\n');
                    return txt.trim();
                };
                const descRaw = getText('.product-intro__description-table-item') || getText('.product-intro__description');
                
                const sizeEls = document.querySelectorAll('.product-intro__size-radio, .size-item, .val');
                let sizesProcessed = [];
                const blockList = ['Internacional', 'Nacional', 'Envio', 'Ver tudo', 'Guia', 'Enviado'];

                sizeEls.forEach(el => {
                    let rawText = el.innerText; 
                    let cleanText = rawText.split('R$')[0].trim();
                    if (cleanText.length > 0 && cleanText.length < 20 && !blockList.some(bad => cleanText.includes(bad))) {
                        sizesProcessed.push(cleanText);
                    }
                });
                if (sizesProcessed.length === 0) sizesProcessed = ['Único'];

                return { 
                    ...basicData, 
                    descriptionText: descRaw, // Texto da descrição
                    tableText: guideTextResult, // Texto da tabela
                    sizes: [...new Set(sizesProcessed)], 
                    color: 'Padrão' 
                };
            }, basicData, guideTextResult);

            return finalData;

        } catch (e) {
            if (e.message.includes('detached') || e.message.includes('closed')) throw e;
            console.error(`   ❌ Erro técnico: ${e.message}`);
            await askForHelp("Erro técnico.");
        }
    }
}

async function startSheinImport() {
    console.log('🚀 Iniciando V36 (Tira-Teima: Visualização do Conteúdo)...');
    
    let cookies = [];
    try { cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8')); } catch (e) {}
    let links = [];
    try {
        const fileContent = fs.readFileSync('links.txt', 'utf-8');
        links = fileContent.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
        console.log(`\n📄 Lendo arquivo: links.txt (${links.length} links)`);
    } catch (e) { console.log('❌ Erro: Crie o arquivo links.txt'); return; }

    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    let page = await browser.newPage();
    if(cookies.length > 0) await page.setCookie(...cookies);

    for (const [index, link] of links.entries()) {
        console.log(`\n📦 [${index + 1}/${links.length}] Processando...`);
        try {
            const data = await scrapeSheinData(page, link);
            const finalPrice = parseFloat((data.rawPrice * 1.30).toFixed(2));

            console.log(`   🏷️ ${data.title.substring(0, 40)}...`);
            console.log(`   💰 Custo: R$${data.rawPrice} | Venda: R$${finalPrice}`);
            console.log(`   📏 Tamanhos: ${data.sizes.join(', ')}`);

            // --- TIRA TEIMA: MOSTRA O QUE PEGOU ---
            if (data.tableText && data.tableText.length > 10) {
                console.log(`   ✅ Tabela Capturada! Preview:\n   ------------------\n${data.tableText.substring(0, 100).replace(/\n/g, ' ')}...\n   ------------------`);
            } else {
                console.log(`   ⚠️ Tabela VAZIA ou não capturada.`);
            }
            // -------------------------------------

            const imageAssets = [];
            for (const imgUrl of data.images.slice(0, 5)) {
                const asset = await uploadMediaToSanity(imgUrl);
                if (asset) imageAssets.push(asset);
            }
            if (imageAssets.length === 0) { console.log("   ⚠️ Sem imagens."); continue; }

            const skuBase = `SN-${slugify(data.title).substring(0,5)}-${Date.now().toString().slice(-4)}`.toUpperCase();

            // CONSTRUÇÃO DO BLOCO DE DESCRIÇÃO (SEPARADO PARA EVITAR ERROS)
            const descBlocks = [];
            // 1. Texto Descritivo
            if (data.descriptionText) {
                descBlocks.push({
                    _type: 'block', _key: generateKey(), style: 'normal',
                    children: [{ _type: 'span', text: "--- Detalhes ---\n" + data.descriptionText }]
                });
            }
            // 2. Tabela (Bloco separado)
            if (data.tableText && data.tableText.length > 10) {
                descBlocks.push({
                    _type: 'block', _key: generateKey(), style: 'normal',
                    children: [{ _type: 'span', text: "\n--- GUIA DE MEDIDAS (cm) ---\n" + data.tableText }]
                });
            } else {
                // Fallback
                descBlocks.push({
                    _type: 'block', _key: generateKey(), style: 'normal',
                    children: [{ _type: 'span', text: "\nVerifique as fotos para o guia de tamanhos." }]
                });
            }

            const doc = {
                _type: 'product',
                title: data.title,
                sourceUrl: link,
                brand: 'SN',
                isActive: true,
                price: finalPrice,
                description: descBlocks, // Usa os blocos separados
                images: imageAssets,
                slug: { _type: 'slug', current: slugify(data.title, { lower: true, strict: true }) + `-${Date.now().toString().slice(-4)}` },
                categories: [{ _key: generateKey(), _type: 'reference', _ref: ID_MODA_PRAIA }],
                logistics: LOGISTICA_PADRAO,
                variants: [{
                    _key: generateKey(), _type: 'object', colorName: 'Padrão',
                    variantImage: imageAssets[0],
                    sizes: data.sizes.map(s => ({
                        _key: generateKey(), size: s, price: finalPrice, stock: 10,
                        sku: `${skuBase}-${s}`.toUpperCase()
                    }))
                }],
                productType: 'fashion',
                fashionSpecs: { gender: 'Fem', material: 'Outros', model: 'Outros' }
            };

            await client.create(doc);
            console.log(`   ✅ Salvo!`);

        } catch (err) {
            if (err.message.includes('detached') || err.message.includes('Target closed')) {
                console.log(`\n   🔥 CRASH: Aba morreu. Reiniciando...`);
                try { await page.close(); } catch(e) {}
                page = await browser.newPage();
                if(cookies.length > 0) await page.setCookie(...cookies);
                console.log('   ⚠️ Retomando...');
            } else {
                console.error('   ❌ Erro fatal:', err.message);
            }
        }
    }
    console.log('\n🏁 Finalizado.');
    process.exit(0);
}

startSheinImport();