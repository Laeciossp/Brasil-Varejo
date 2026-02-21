const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const readline = require('readline');
const fs = require('fs');

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

// Função auxiliar para esperar
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randomSleep = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

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

// --- CHECAGEM COM RITMO DE 5 SEGUNDOS ---
async function checkSheinStock(page, url) {
    let attempts = 0;
    
    while (true) {
        try {
            if (attempts === 0) {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                // 🛑 LEVE PAUSA INICIAL: 2 a 4 segundos (Rápido, mas humano)
                const waitTime = randomSleep(2000, 4000);
                await sleep(waitTime);
            }

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

            // 🛑 LÓGICA DE ESGOTADO ADICIONADA AQUI 🛑
            if (!rawPrice || rawPrice === 0) {
                const is404 = await page.evaluate(() => document.body.innerText.includes('página não encontrada') || document.body.innerText.includes('This page was not found'));
                if (is404) return { active: false, reason: 'Página 404 (Produto Removido)' };

                // Verifica se está esgotado antes de assumir que é Captcha
                const isSoldOut = await page.evaluate(() => {
                    // Verifica o botão de compra
                    const buyBtn = document.querySelector('.product-intro__add-btn, button.she-btn-black');
                    if (buyBtn && (buyBtn.innerText.toUpperCase().includes('ESGOTADO') || buyBtn.innerText.toUpperCase().includes('SOLD OUT'))) return true;
                    
                    // Verifica a área principal do produto
                    const intro = document.querySelector('.product-intro');
                    if (intro && (intro.innerText.toUpperCase().includes('ESGOTADO') || intro.innerText.toUpperCase().includes('SOLD OUT'))) return true;

                    // Verifica classes específicas de esgotado da Shein
                    const soldOutTip = document.querySelector('.product-intro__soldout, .sold-out-tip, .goods-sold-out');
                    if (soldOutTip) return true;

                    return false;
                });

                if (isSoldOut) {
                    return { active: false, reason: 'Produto Totalmente Esgotado' };
                }

                // Se não é 404 e não está marcado como esgotado, aí sim pede ajuda (Captcha)
                await askForHelp("Preço sumiu (Provável Captcha)");
                attempts++;
                continue; 
            }

            // NOVA LÓGICA DE TAMANHOS E ENVIO NACIONAL
            const validSizes = await page.evaluate(async () => {
                const wait = (ms) => new Promise(r => setTimeout(r, ms));
                
                // --- PASSO 1: GARANTIR QUE ESTAMOS VENDO O ESTOQUE NACIONAL ---
                const variantButtons = Array.from(document.querySelectorAll('.product-intro__size-radio, .size-item, .val'));
                let btnNacional = null;
                let btnInternacional = null;

                for (const btn of variantButtons) {
                    const text = btn.innerText.toUpperCase();
                    if (text.includes('NACIONAL') && !text.includes('INTERNACIONAL')) btnNacional = btn;
                    else if (text.includes('INTERNACIONAL')) btnInternacional = btn;
                }

                if (btnNacional || btnInternacional) {
                    // Se existe a divisão mas não tem botão Nacional, só tem fora do BR
                    if (!btnNacional) return []; 
                    
                    // Se o botão Nacional existe mas está cinza/esgotado
                    if (btnNacional.classList.contains('disabled') || btnNacional.classList.contains('is-disabled')) return []; 
                    
                    // Força o clique no Nacional e espera a tela trocar a grade
                    btnNacional.click(); 
                    await wait(1000); 
                } else {
                    // Caso não tenha botões de envio, procura um aviso de texto solto na página
                    const bodyText = document.body.innerText.toUpperCase();
                    if (bodyText.includes('ENVIO INTERNACIONAL') && !bodyText.includes('ENVIO NACIONAL')) {
                        return []; // É 100% internacional
                    }
                }

                // --- PASSO 2: LER OS TAMANHOS ---
                const sizes = [];
                // Pega os botões novamente pois o clique no Nacional pode ter alterado o HTML
                const buttons = Array.from(document.querySelectorAll('.product-intro__size-radio, .size-item, .val'));
                const blockList = ['INTERNACIONAL', 'NACIONAL', 'ENVIO', 'VER TUDO', 'GUIA', 'ENVIADO'];

                if (buttons.length === 0) {
                    const buyBtn = document.querySelector('.product-intro__add-btn, button.she-btn-black');
                    if (buyBtn && !buyBtn.innerText.toUpperCase().includes('ESGOTADO') && !buyBtn.disabled) return ['Único'];
                    return [];
                }

                for (const btn of buttons) {
                    let rawText = btn.innerText;
                    let cleanName = rawText.split('R$')[0].trim();
                    let upperName = cleanName.toUpperCase();

                    if (cleanName.length > 25 || cleanName.length === 0) continue; 
                    if (upperName.includes('TAMANHO BR') || upperName.includes('CINTURA')) continue;
                    if (blockList.some(bad => upperName.includes(bad))) continue;
                    if (btn.classList.contains('disabled') || btn.classList.contains('is-disabled')) continue;

                    try {
                        btn.click();
                        await wait(Math.floor(Math.random() * 500) + 500); 
                        
                        const buyBtn = document.querySelector('.product-intro__add-btn, button.she-btn-black');
                        let isSoldOut = false;
                        if (buyBtn) {
                            const btnText = buyBtn.innerText.toUpperCase();
                            if (btnText.includes('ESGOTADO') || btnText.includes('SOLD OUT') || btnText.includes('OUT OF STOCK')) isSoldOut = true;
                            if (buyBtn.disabled || buyBtn.classList.contains('disabled')) isSoldOut = true;
                        }
                        if (!isSoldOut) sizes.push(cleanName);
                    } catch(e) { sizes.push(cleanName); }
                }
                return [...new Set(sizes)];
            });

            if (validSizes.length === 0) return { active: false, reason: 'Sem estoque Nacional' };

            return { active: true, rawPrice, sizes: validSizes };

        } catch (e) {
            console.log(`   ❌ Erro: ${e.message}`);
            await askForHelp("Erro de conexão ou crash");
        }
    }
}

async function startGuardian() {
    console.log('🛡️ Iniciando O GUARDIÃO (Ritmo Ajustado: ~5s)...');

    // --- 1. LER COOKIES ---
    let cookies = [];
    try {
        const fileContent = fs.readFileSync('cookies.json', 'utf-8');
        cookies = JSON.parse(fileContent);
        console.log(`🍪 Cookies carregados: ${cookies.length} encontrados.`);
    } catch (e) {
        console.log("⚠️ Aviso: Não encontrei 'cookies.json'.");
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
        const sheinCookies = cookies.filter(c => c.domain.includes('shein.com'));
        if(sheinCookies.length > 0) {
             console.log(`💉 Injetando ${sheinCookies.length} cookies da Shein na aba...`);
             await page.setCookie(...sheinCookies);
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

        // 🛑 FREIO 3: DESCANSO DE 5 a 7 SEGUNDOS
        const cooldown = randomSleep(5000, 7000);
        console.log(`   ☕ Aguardando ${Math.floor(cooldown/1000)}s...`);
        await sleep(cooldown);
    }

    console.log("\n🛡️ Auditoria Finalizada.");
}

startGuardian();