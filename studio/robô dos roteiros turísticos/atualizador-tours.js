// atualizador-tours.js
// FUNÇÃO: Varre o banco de dados atual, visita a URL original de cada roteiro,
// captura os textos limpos (burlando o "Ver Mais"), aplica +5% no preço e ATUALIZA o Sanity.

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// ==========================================
// CONFIGURAÇÃO DO SEU BANCO DE DADOS (SANITY)
// ==========================================
const client = createClient({
  projectId: 'o4upb251', 
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});

const generateKey = () => Math.random().toString(36).substring(2, 15);

// Converte texto limpo para o formato de Bloco do Sanity
const toCleanSanityBlock = (textString) => {
    if (!textString) return [];
    return [{
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        children: [{ _type: 'span', _key: generateKey(), text: textString }] 
    }];
};

async function startUpdater() {
    console.log('🚀 Iniciando Atualizador Inteligente de Tours...');
    
    // 1. Puxa todos os tours do Sanity que precisam ser atualizados
    let tours;
    try {
        tours = await client.fetch('*[_type == "tour"]{_id, title, sourceUrl}');
        console.log(`📋 Encontrados ${tours.length} roteiros no banco de dados para atualizar.`);
    } catch (err) {
        console.error('❌ Erro ao conectar no Sanity:', err);
        return;
    }

    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages())[0];

    for (const [index, tour] of tours.entries()) {
        console.log(`\n========================================`);
        console.log(`🔄 ATUALIZANDO [${index + 1}/${tours.length}]: ${tour.title}`);
        
        if (!tour.sourceUrl) {
            console.log(`   ⏭️ Sem URL original salva. Pulando...`);
            continue;
        }

        try {
            await page.goto(tour.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise(r => setTimeout(r, 2500)); // Tempo para o site montar a tela

            const scrapedData = await page.evaluate(() => {
                // 1. Atualizar Preço (+5%)
                const priceEl = document.querySelector('.dev-price-per-person');
                let finalPrice = 0;
                if (priceEl) {
                    let priceText = priceEl.innerText.replace('R$', '').trim();
                    priceText = priceText.replace(/\./g, '').replace(',', '.'); 
                    let basePrice = parseFloat(priceText);
                    finalPrice = basePrice * 1.05; // 👈 O AUMENTO DE 5% ACONTECE AQUI
                }

                // 2. Extrair Textos (BURLANDO O VER MAIS COM textContent)
                let itinerarioText = '';
                let includedText = '';
                let excludedText = '';

                const roteiroEl = document.querySelector('.dev-daytoday-closedtour');
                const descResortEl = document.querySelector('.destination-brochure .js-readmore-element') || document.querySelector('.destination-brochure');
                
                if (roteiroEl) {
                    itinerarioText = roteiroEl.textContent.trim();
                } else if (descResortEl) {
                    itinerarioText = descResortEl.textContent.trim();
                }

                const blocosDeTexto = Array.from(document.querySelectorAll('.o-block__item'));
                for (let bloco of blocosDeTexto) {
                    const textoMaiusculo = bloco.textContent.toUpperCase();
                    if (textoMaiusculo.includes('SERVIÇOS INCLUÍDOS') || textoMaiusculo === 'INCLUÍDO') {
                        includedText = bloco.textContent.trim();
                    }
                    if (textoMaiusculo.includes('NÃO INCLUÍDOS') || textoMaiusculo === 'NÃO INCLUÍDO') {
                        excludedText = bloco.textContent.trim();
                    }
                }

                return { finalPrice, itinerarioText, includedText, excludedText };
            });

            console.log(`   💰 Novo Preço (+5%): R$ ${scrapedData.finalPrice.toFixed(2)}`);
            console.log(`   📝 Textos extraídos com sucesso!`);

            // 3. Atualiza (PATCH) o documento existente no Sanity
            await client.patch(tour._id)
                .set({
                    price: scrapedData.finalPrice,
                    itinerary: toCleanSanityBlock(scrapedData.itinerarioText),
                    included: toCleanSanityBlock(scrapedData.includedText),
                    excluded: toCleanSanityBlock(scrapedData.excludedText)
                })
                .commit();

            console.log(`   ✅ Roteiro atualizado no Sanity!`);

        } catch (err) {
            console.error(`   ❌ ERRO ao atualizar ${tour.title}:`, err.message);
        }
    }

    console.log('\n🏁 Atualização 100% Finalizada!');
    process.exit(0);
}

startUpdater();