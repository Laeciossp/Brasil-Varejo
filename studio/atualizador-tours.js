// atualizador-tours.js
// FUNÇÃO: Varre o banco de dados atual, visita a URL original de cada roteiro,
// DELETA SCRIPTS, captura os textos limpos, LIMPA "MAIS IMAGENS", CORTA "ACOMODAÇÕES", e aplica +5%.

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
    console.log('🚀 Iniciando Atualizador Inteligente de Tours (Com Faxineiro Nível Máximo + Escudo de Acomodações)...');
    
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
            await new Promise(r => setTimeout(r, 2500)); 

            const scrapedData = await page.evaluate(() => {
                // 🔥 Remove todo o lixo de código Javascript e CSS da página antes de ler
                document.querySelectorAll('script, style, noscript').forEach(el => el.remove());

                // FAXINEIRO SUPREMO: Limpa textos residuais, botões com números dinâmicos, blocos de código e espaços vazios
                const cleanLixo = (str) => {
                    if (!str) return '';
                    
                    // CORTA O TEXTO: Joga fora tudo que vier depois de "Acomodações possíveis..."
                    let cleanedStr = str;
                    const stopIndex = cleanedStr.toUpperCase().indexOf('ACOMODAÇÕES POSSÍVEIS');
                    if (stopIndex !== -1) {
                        cleanedStr = cleanedStr.substring(0, stopIndex);
                    }

                    return cleanedStr
                        .replace(/Saiba maisLeia menos/gi, '')
                        .replace(/Saiba mais/gi, '')
                        .replace(/Leia menos/gi, '')
                        .replace(/Mais imagens \(\d+\)/gi, '') 
                        .replace(/^Circuitos/gi, '') 
                        .replace(/Serviços adicionais:[\s\S]*?Incluido/gi, '') 
                        .replace(/openHotelMap = function\(\) \{.*?\}/gis, '') // 👈 MATA O CÓDIGO JAVASCRIPT SOLTO
                        .replace(/\n{3,}/g, '\n\n') 
                        .trim();
                };

                // 1. Atualizar Preço (+5%)
                const priceEl = document.querySelector('.dev-price-per-person');
                let finalPrice = 0;
                if (priceEl) {
                    let priceText = priceEl.innerText.replace('R$', '').trim();
                    priceText = priceText.replace(/\./g, '').replace(',', '.'); 
                    let basePrice = parseFloat(priceText);
                    finalPrice = basePrice * 1.05; 
                }

                // 2. Extrair Textos
                let itinerarioText = '';
                let includedText = '';
                let excludedText = '';

                // FLAG DE FERRO: É Disney ou Ingresso?
                const tagsSite = Array.from(document.querySelectorAll('.dev-active-themes-item span')).map(s => s.textContent.toUpperCase());
                const isTicketOrDisney = tagsSite.some(t => t.includes('DISNEY') || t.includes('INGRESSO') || t.includes('TICKET')) || document.querySelector('.dev-ticket') !== null;

                if (isTicketOrDisney) {
                    const descGeral = document.querySelector('.description-brochure');
                    itinerarioText = descGeral ? descGeral.textContent.trim() : 'Atividade / Ingresso de Parque Temático.';
                    includedText = "Ingresso / Atividade confirmada. Os detalhes, acessos e regras específicas estão descritos na aba 'Dia a Dia' (Descrição Principal).";
                    excludedText = "Despesas pessoais, transporte até o parque/atração e alimentação não estão inclusos, salvo quando expressamente especificado na descrição.";
                
                } else {
                    const roteiroEl = document.querySelector('.dev-daytoday-closedtour');
                    const descResortEl = document.querySelector('.destination-brochure .js-readmore-element') || document.querySelector('.destination-brochure');

                    if (roteiroEl) {
                        itinerarioText = roteiroEl.textContent.trim();
                    } else if (descResortEl) {
                        itinerarioText = descResortEl.textContent.trim();
                    }

                    const blocosDeTexto = Array.from(document.querySelectorAll('.o-block__item, .dev-included, .dev-excluded, .js-readmore-element'));
                    
                    for (let bloco of blocosDeTexto) {
                        const txt = bloco.textContent.trim();
                        const txtUpper = txt.toUpperCase();

                        if (!itinerarioText && (txtUpper.includes('1º DIA') || txtUpper.includes('DAY BY DAY'))) {
                            itinerarioText = txt;
                        }
                        
                        if (txtUpper.includes('SERVIÇOS INCLUÍDOS') || txtUpper.includes('O QUE ESTÁ INCLUÍDO') || bloco.classList.contains('dev-included')) {
                            if (txt.length > includedText.length && txt.length > 30) includedText = txt;
                        }
                        if (txtUpper.includes('NÃO INCLUÍDOS') || txtUpper.includes('NÃO ESTÁ INCLUÍDO') || bloco.classList.contains('dev-excluded')) {
                            if (txt.length > excludedText.length && txt.length > 30) excludedText = txt;
                        }
                    }

                    // 🔥 INÍCIO DO NOVO ESCUDO E GUILHOTINA PARA INCLUSOS/NÃO INCLUSOS 🔥
                    // Expressão regular "pega-tudo" para variações de exclusão
                    const regexNaoIncluido = /NÃO INCLUÍDO|NÃO INCLUSOS|NÃO INCLUSO|NÃO ESTÁ INCLUÍDO|SERVIÇOS NÃO INCLUÍDOS/i;

                    // 1. Limpa o INCLUÍDO (Joga fora tudo que vier do "Não Incluído" para frente)
                    if (includedText.match(regexNaoIncluido)) {
                        includedText = includedText.split(regexNaoIncluido)[0].trim();
                    }

                    // 2. Limpa o NÃO INCLUÍDO (Joga fora a primeira metade que era o "Incluído")
                    if (excludedText.match(regexNaoIncluido)) {
                        const partes = excludedText.split(regexNaoIncluido);
                        if (partes.length > 1) {
                            // Pega apenas a última parte, que é o "Não Incluído" verdadeiro
                            excludedText = partes[partes.length - 1].trim(); 
                        }
                    }
                    // 🔥 FIM DA NOVA LÓGICA 🔥
                }

                return { 
                    finalPrice, 
                    itinerarioText: cleanLixo(itinerarioText), 
                    includedText: cleanLixo(includedText), 
                    excludedText: cleanLixo(excludedText) 
                };
            });

            console.log(`   💰 Novo Preço (+5%): R$ ${scrapedData.finalPrice.toFixed(2)}`);
            console.log(`   🧹 Lixos como "Mais imagens", "Acomodações" e códigos vazados removidos!`);

            // 3. Atualiza (PATCH) o documento existente no Sanity
            await client.patch(tour._id)
                .set({
                    price: scrapedData.finalPrice,
                    itinerary: toCleanSanityBlock(scrapedData.itinerarioText),
                    included: toCleanSanityBlock(scrapedData.includedText),
                    excluded: toCleanSanityBlock(scrapedData.excludedText)
                })
                .commit();

            console.log(`   ✅ Roteiro/Ingresso atualizado no Sanity!`);

        } catch (err) {
            console.error(`   ❌ ERRO ao atualizar ${tour.title}:`, err.message);
        }
    }

    console.log('\n🏁 Atualização 100% Finalizada!');
    process.exit(0);
}

startUpdater();