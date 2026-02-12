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

// ALTERADO: ID extraído do link fornecido (Moda Academia)
const ID_MODA_ACADEMIA = 'cf02a96e-b3cb-4e4f-a705-87782ce8cfa0';

const generateKey = () => Math.random().toString(36).substring(2, 15);
const LOGISTICA_PADRAO = { weight: 0.3, width: 20, height: 5, length: 20 };

async function askForHelp(msg) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n\x1b[41m\x1b[37m%s\x1b[0m', ` 🚨 PARADA: ${msg} `);
    return new Promise(resolve => {
        rl.question('   ✅ Resolva e tecle ENTER...', () => {
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

            // -----------------------------------------------------------
            // 1. DADOS BÁSICOS + COR V71 (MANTIDO INTACTO)
            // -----------------------------------------------------------
            const basicData = await page.evaluate(async () => {
                let title = document.querySelector('h1.product-intro__head-name')?.innerText || 
                            document.querySelector('.detail-title')?.innerText || '';
                
                // === ALGORITMO COR V71 (Do arquivo COR OK) ===
                let detectedColor = "";
                let source = "N/A";

                const selectors = ['.product-intro__color-title-val', '.goods-color__title-val', '.color-title-val'];
                for (let sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el && el.innerText.trim().length > 1) {
                        detectedColor = el.innerText.trim();
                        source = "Seletor Direto";
                        break;
                    }
                }

                if (!detectedColor) {
                    const activeRadio = document.querySelector('.product-intro__color-radio.on, .j-item.on');
                    if (activeRadio) {
                        detectedColor = activeRadio.getAttribute('aria-label') || activeRadio.getAttribute('title');
                        if (detectedColor) source = "Bolinha Ativa";
                    }
                }

                if (!detectedColor) {
                    try {
                        const raw = window.gbRawData || window.productIntroData;
                        if (raw?.saleAttr?.mainSaleAttribute?.info) {
                            const info = raw.saleAttr.mainSaleAttribute.info;
                            const colorAttr = info.find(i => i.attr_name === 'Cor' || i.attr_name === 'Color');
                            if (colorAttr) { detectedColor = colorAttr.attr_value; source = "JSON"; }
                        }
                    } catch(e) {}
                }

                if (!detectedColor) {
                    const labels = Array.from(document.querySelectorAll('span, p, div'));
                    for (let el of labels) {
                        if (el.closest('.product-intro__description-table-item')) continue; 
                        const text = el.innerText || '';
                        const match = text.match(/^(?:Cor|Color)\s*[:：]\s*([^\n\r]+)/i);
                        if (match && match[1].length < 20) {
                            detectedColor = match[1];
                            source = "Texto Regex";
                            break;
                        }
                    }
                }

                if (detectedColor) {
                    detectedColor = detectedColor.split(/[\n\r]|Tamanho|Size/i)[0].trim().replace(/^[:：]\s*/, '');
                }
                if (!detectedColor || detectedColor.length < 2) detectedColor = "Padrão";

                // Preço e Imagens
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
                
                // === LIMPEZA DE TÍTULO AJUSTADA (REMOVIDO VENDEDOR INDICADO) ===
                if (title) {
                    const badWords = ['Vendedor Indicado', 'Mall', 'Flash Sale', 'Novo', 'Top', 'Shein', 'SHEIN', 'Brasil', 'Oferta'];
                    badWords.forEach(w => title = title.replace(new RegExp(w, 'gi'), ''));
                    title = title.replace(/^[\s\|\-\.]+/g, '').trim();
                }

                const imgEls = document.querySelectorAll('.product-intro__main img, .crop-image-container img');
                let images = [];
                imgEls.forEach(img => {
                    if(img.src && !img.src.includes('gif')) {
                        images.push(img.src.replace('_220x293', '').replace('_thumbnail', '').replace('_170x170', '').split('?')[0]);
                    }
                });

                return { title, rawPrice, images, detectedColor, colorSource: source };
            });

            if (!basicData.title || !basicData.rawPrice) {
                await askForHelp("Título ou Preço sumiram.");
                attempts++;
                continue; 
            }

            // -----------------------------------------------------------
            // 2. EXTRAÇÃO DE TABELA (CÓPIA EXATA DO ARQUIVO "TABELA OK.JS")
            // -----------------------------------------------------------
            let guideTextResult = "";
            try {
                // Scroll e Wait exatos do arquivo funcional
                await page.evaluate(() => window.scrollBy(0, 400));
                await new Promise(r => setTimeout(r, 1000));

                const clicked = await page.evaluate(() => {
                    const spans = document.getElementsByTagName('span');
                    for (let span of spans) {
                        if (span.innerText.trim() === 'Guia de tamanhos' || span.innerText.trim() === 'Size Guide') {
                            span.click(); return true;
                        }
                    }
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
                    // Delay exato do arquivo funcional (3500ms)
                    await new Promise(r => setTimeout(r, 3500)); 

                    guideTextResult = await page.evaluate(async () => {
                        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
                        let combinedText = "";

                        const scrapeVisibleFiltered = () => {
                            let txt = "";
                            const tables = document.querySelectorAll('table');
                            tables.forEach(table => {
                                if (table.offsetParent !== null && table.innerText.length > 10) {
                                    const rows = table.querySelectorAll('tr');
                                    rows.forEach(row => {
                                        const cells = Array.from(row.querySelectorAll('th, td')).map(c => c.innerText.replace(/\n/g, ' ').trim());
                                        const validCells = cells.filter(c => c.length > 0);
                                        if (validCells.length > 0) txt += validCells.join(' | ') + '\n';
                                    });
                                }
                            });
                            return txt;
                        };

                        const tabs = Array.from(document.querySelectorAll('.she-tabs-header-item, .common-tabs__tab'));
                        if (tabs.length === 0) return scrapeVisibleFiltered();

                        for (let tab of tabs) {
                            const tabName = tab.innerText.toUpperCase();
                            if (tabName.includes('PRODUTO') || tabName.includes('PRODUCT') || tabName.includes('CORPO') || tabName.includes('BODY')) {
                                tab.click();
                                await sleep(1000);
                                const tableContent = scrapeVisibleFiltered();
                                if (tableContent.match(/[a-zA-Z0-9]/)) {
                                    combinedText += `\n--- ${tab.innerText} ---\n${tableContent}`;
                                }
                            }
                        }
                        return combinedText;
                    });

                    await page.evaluate(() => { 
                        const b = document.querySelector('.she-modal-close, .j-close-btn'); 
                        if(b) b.click(); 
                    });
                }
            } catch(e) { console.log("   ⚠️ Erro tabela (Tabela OK Logic):", e.message); }

            // -----------------------------------------------------------
            // 3. VALIDAÇÃO DE ESTOQUE (INJETADO: VERSÃO SEGURA QUE CLICA)
            // -----------------------------------------------------------
            console.log("   🕵️ Validando estoque (Modo Seguro)...");
            
            const sizesFinal = await page.evaluate(async () => {
                const validSizes = [];
                const buttons = Array.from(document.querySelectorAll('.product-intro__size-radio, .size-item, .val'));
                const blockList = ['Internacional', 'Nacional', 'Envio', 'Ver tudo', 'Guia', 'Enviado'];

                if (buttons.length === 0) {
                    const buyBtn = document.querySelector('.product-intro__add-btn');
                    if (buyBtn && !buyBtn.innerText.toUpperCase().includes('ESGOTADO')) return ['Único'];
                    return [];
                }

                const wait = (ms) => new Promise(r => setTimeout(r, ms));

                for (const btn of buttons) {
                    let rawText = btn.innerText;
                    let cleanName = rawText.split('R$')[0].trim();
                    
                    if (cleanName.length > 25 || cleanName.length === 0) continue; 
                    if (cleanName.includes('Tamanho BR') || cleanName.includes('Cintura')) continue;
                    if (blockList.some(bad => cleanName.includes(bad))) continue;

                    if (btn.classList.contains('disabled') || btn.classList.contains('is-disabled')) continue;

                    try {
                        btn.click();
                        await wait(400); 
                        
                        const buyBtn = document.querySelector('.product-intro__add-btn, button.she-btn-black');
                        let isSoldOut = false;
                        
                        if (buyBtn) {
                            const btnText = buyBtn.innerText.toUpperCase();
                            if (btnText.includes('ESGOTADO') || btnText.includes('SOLD OUT')) isSoldOut = true;
                            if (buyBtn.disabled || buyBtn.classList.contains('disabled')) isSoldOut = true;
                        }
                        
                        if (!isSoldOut) validSizes.push(cleanName);
                    } catch(e) {
                        validSizes.push(cleanName);
                    }
                }
                return [...new Set(validSizes)];
            });

            // Descrição (Do Tabela OK original)
            const descriptionText = await page.evaluate(() => {
                const els = document.querySelectorAll('.product-intro__description-table-item');
                let txt = '';
                els.forEach(e => txt += e.innerText + '\n');
                return txt.trim();
            });

            return { 
                ...basicData, 
                descriptionText, 
                tableText: guideTextResult, 
                sizes: sizesFinal
            };

        } catch (e) {
            if (e.message.includes('detached') || e.message.includes('closed')) throw e;
            console.error(`   ❌ Erro: ${e.message}`);
            await askForHelp("Erro técnico.");
        }
    }
}

async function startSheinImport() {
    console.log('🚀 Iniciando SHEIN FINAL (Com filtro de título Vendedor Indicado)...');
    
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
            
            if (data.sizes.length === 0) {
                console.log(`   ⛔ Produto Esgotado. Pulando.`);
                continue;
            }

            const finalPrice = parseFloat((data.rawPrice * 1.30).toFixed(2));

            console.log(`   🏷️ ${data.title.substring(0, 40)}...`);
            console.log(`   🎨 Cor: ${data.detectedColor} (Via: ${data.colorSource})`); 
            console.log(`   📏 Tamanhos: ${data.sizes.join(', ')}`);
            
            if (data.tableText && data.tableText.length > 10) {
                console.log(`   ✅ Tabela Capturada! Preview: ${data.tableText.substring(0, 30)}...`);
            } else {
                console.log(`   ⚠️ Tabela VAZIA.`);
            }

            const imageAssets = [];
            for (const imgUrl of data.images.slice(0, 5)) {
                const asset = await uploadMediaToSanity(imgUrl);
                if (asset) imageAssets.push(asset);
            }
            if (imageAssets.length === 0) { console.log("   ⚠️ Sem imagens."); continue; }

            const skuBase = `SN-${slugify(data.title).substring(0,5)}-${Date.now().toString().slice(-4)}`.toUpperCase();

            // BLOCOS
            const descBlocks = [];
            if (data.descriptionText) {
                descBlocks.push({
                    _type: 'block', _key: generateKey(), style: 'normal',
                    children: [{ _type: 'span', text: "--- Detalhes ---\n" + data.descriptionText }]
                });
            }
            if (data.tableText && data.tableText.length > 10) {
                descBlocks.push({
                    _type: 'block', _key: generateKey(), style: 'normal',
                    children: [{ _type: 'span', text: "\n--- GUIA DE MEDIDAS (cm) ---\n" + data.tableText }]
                });
            } else {
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
                description: descBlocks,
                images: imageAssets,
                slug: { _type: 'slug', current: slugify(data.title, { lower: true, strict: true }) + `-${Date.now().toString().slice(-4)}` },
                // ALTERADO: Usando a nova constante ID_MODA_ACADEMIA
                categories: [{ _key: generateKey(), _type: 'reference', _ref: ID_MODA_ACADEMIA }],
                logistics: LOGISTICA_PADRAO,
                variants: [{
                    _key: generateKey(), _type: 'object', 
                    colorName: data.detectedColor, 
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
            if (err.message.includes('detached') || err.message.includes('closed')) {
                console.log(`\n   🔥 CRASH: Reiniciando...`);
                try { await page.close(); } catch(e) {}
                page = await browser.newPage();
                if(cookies.length > 0) await page.setCookie(...cookies);
            } else {
                console.error('   ❌ Erro fatal:', err.message);
            }
        }
    }
    console.log('\n🏁 Finalizado.');
    process.exit(0);
}

startSheinImport();