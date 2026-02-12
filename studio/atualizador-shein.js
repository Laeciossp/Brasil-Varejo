const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const readline = require('readline');
const fs = require('fs'); // Necessário para ler o arquivo

puppeteer.use(StealthPlugin());

// --- CONFIGURAÇÃO ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

const MARKUP = 1.30; 

// --- FUNÇÃO DE PARADA ---
async function askForHelp(msg) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n\x1b[41m\x1b[37m%s\x1b[0m', ` 🚨 PARADA: ${msg} `);
    console.log('   (O robô detectou um bloqueio ou erro de leitura)');
    return new Promise(resolve => {
        rl.question('   ✅ Resolva o Captcha na aba atual e tecle ENTER...', () => {
            rl.close();
            resolve();
        });
    });
}

// --- CHECAGEM COM LOOP DE SEGURANÇA ---
async function checkSheinStock(page, url) {
    let attempts = 0;
    
    while (true) {
        try {
            if (attempts === 0) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            try { 
                await page.evaluate(() => {
                    document.querySelectorAll('.close-btn, .she-close, .svgicon-close, .j-close-btn').forEach(b => b.click());
                });
            } catch(e) {}

            const rawPrice = await page.evaluate(() => {
                const idPrice = document.getElementById('productMainPriceId');
                if (idPrice) {
                    return parseFloat(idPrice.innerText.replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.'));
                }
                const text = document.body.innerText || '';
                const matches = text.match(/R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/g);
                if (matches) {
                    let prices = matches.map(m => parseFloat(m.replace(/[^\d.,]/g, '').replace(',', '.')));
                    prices = prices.filter(p => p > 15 && p < 10000);
                    if (prices.length > 0) return prices[0]; 
                }
                return 0;
            });

            if (!rawPrice || rawPrice === 0) {
                const is404 = await page.evaluate(() => document.body.innerText.includes('página não encontrada') || document.body.innerText.includes('This page was not found'));
                if (is404) return { active: false, reason: 'Página 404 (Produto Removido)' };

                await askForHelp("Preço sumiu (Provável Captcha)");
                attempts++;
                continue; 
            }

            const validSizes = await page.evaluate(async () => {
                const sizes = [];
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
                        if (!isSoldOut) sizes.push(cleanName);
                    } catch(e) { sizes.push(cleanName); }
                }
                return [...new Set(sizes)];
            });

            if (validSizes.length === 0) return { active: false, reason: 'Sem estoque real' };

            return { active: true, rawPrice, sizes: validSizes };

        } catch (e) {
            console.log(`   ❌ Erro: ${e.message}`);
            await askForHelp("Erro de conexão ou crash");
        }
    }
}

async function startGuardian() {
    console.log('🛡️ Iniciando O GUARDIÃO (Modo Conexão + Cookies)...');

    // --- 1. LER COOKIES ---
    let cookies = [];
    try {
        const fileContent = fs.readFileSync('cookies.json', 'utf-8');
        cookies = JSON.parse(fileContent);
        console.log(`🍪 Cookies carregados: ${cookies.length} encontrados.`);
    } catch (e) {
        console.log("⚠️ Aviso: Não encontrei 'cookies.json' ou ele está inválido.");
        console.log("   (O robô vai tentar sem cookies extras, usando apenas a sessão aberta)");
    }

    const query = `*[_type == "product" && brand == "SN"] {
        _id, title, isActive, price, sourceUrl, 
        "currentSizes": variants[0].sizes[].size,
        "skuExample": variants[0].sizes[0].sku
    }`;

    const products = await client.fetch(query);
    console.log(`📦 Auditando ${products.length} produtos 'SN'...`);

    // --- 2. CONECTAR ---
    let browser;
    try {
        browser = await puppeteer.connect({ 
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null 
        });
        console.log("✅ Conectado ao Chrome existente!");
    } catch (e) {
        console.log("\n❌ ERRO: Chrome fechado ou sem porta 9222.");
        process.exit(1);
    }

    // --- 3. PEGAR ABA E INJETAR ---
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    
    if (cookies.length > 0) {
        // Filtra cookies para garantir que são apenas do domínio certo (segurança extra)
        const sheinCookies = cookies.filter(c => c.domain.includes('shein.com'));
        if(sheinCookies.length > 0) {
             console.log(`💉 Injetando ${sheinCookies.length} cookies da Shein na aba...`);
             await page.setCookie(...sheinCookies);
             // Dá um refresh para os cookies pegarem
             await page.reload({ waitUntil: 'domcontentloaded' });
        }
    }
    
    console.log("   👉 Tudo pronto. Não feche a aba.");

    for (const [index, product] of products.entries()) {
        console.log(`\n🔍 [${index + 1}/${products.length}] ${product.title.substring(0, 30)}...`);
        
        if (!product.sourceUrl) {
            console.log("   ⚠️ Sem link. Pulando.");
            continue;
        }

        const status = await checkSheinStock(page, product.sourceUrl);
        const updates = {};
        let needsCommit = false;

        // LÓGICA DE ATUALIZAÇÃO
        if (!status.active) {
            if (product.isActive) {
                console.log(`   💀 DESATIVANDO: ${status.reason}`);
                updates.isActive = false;
                needsCommit = true;
            } else {
                console.log(`   💤 Já estava inativo.`);
            }
        } else {
            if (!product.isActive) {
                console.log(`   ✨ RESSUSCITANDO!`);
                updates.isActive = true;
                needsCommit = true;
            }

            const newFinalPrice = parseFloat((status.rawPrice * MARKUP).toFixed(2));
            if (Math.abs(newFinalPrice - product.price) > 1) {
                console.log(`   💰 Ajuste de Preço: R$${product.price} -> R$${newFinalPrice}`);
                updates.price = newFinalPrice;
                needsCommit = true;
            }

            const oldSizes = (product.currentSizes || []).sort();
            const newSizes = status.sizes.sort();
            const hasChanged = JSON.stringify(oldSizes) !== JSON.stringify(newSizes);

            if (hasChanged || updates.price) {
                if(hasChanged) console.log(`   📏 Grade alterada: [${oldSizes}] -> [${newSizes}]`);
                
                let skuBase = product.skuExample ? product.skuExample.split('-').slice(0, -1).join('-') : `SN-${Date.now()}`;
                
                const newVariantSizes = status.sizes.map(sizeName => ({
                    _key: Math.random().toString(36).substring(7),
                    size: sizeName,
                    stock: 10,
                    price: newFinalPrice, 
                    sku: `${skuBase}-${sizeName}`.toUpperCase()
                }));

                updates['variants[0].sizes'] = newVariantSizes;
                needsCommit = true;
            }
        }

        if (needsCommit) {
            try {
                await client.patch(product._id).set(updates).commit();
                console.log("   ✅ Salvo no Sanity.");
            } catch(e) {
                console.log("   ❌ Erro ao salvar:", e.message);
            }
        } else {
            console.log("   👍 Sincronizado.");
        }
    }

    console.log("\n🛡️ Auditoria Finalizada.");
}

startGuardian();