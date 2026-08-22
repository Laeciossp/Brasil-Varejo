// atualizador-tours.js
// FUNÇÃO: Varre o banco de dados atual, visita a URL original de cada roteiro,
// DELETA SCRIPTS, captura os textos limpos, LÊ LINHA DO TEMPO, LIMPA "MAIS IMAGENS" E "FECHAR", CORTA "ACOMODAÇÕES", e aplica +5%.

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
    console.log('🚀 Iniciando Atualizador Inteligente de Tours (Com Guilhotina Blindada)...');
    
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
                // 🔥 Remove lixo de código Javascript e CSS da página
                document.querySelectorAll('script, style, noscript').forEach(el => el.remove());

                // FAXINEIRO SUPREMO
                const cleanLixo = (str) => {
                    if (!str) return '';
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
                        .replace(/Fechar/gi, '') // 🔥 NOVO: Remove a palavra Fechar capturada do botão
                        .replace(/^Circuitos/gi, '') 
                        .replace(/Serviços adicionais:[\s\S]*?Incluido/gi, '') 
                        .replace(/openHotelMap = function\(\) \{.*?\}/gis, '') 
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

                // Elementos da página
                const roteiroEl = document.querySelector('.dev-daytoday-closedtour');
                const timelineHeaders = document.querySelectorAll('.c-service-heading');
                const descResortEl = document.querySelector('.destination-brochure .js-readmore-element') || document.querySelector('.destination-brochure');
                
                // Se tiver qualquer uma dessas estruturas, É UM PACOTE (mesmo que tenha ingresso dentro)
                const isPackage = roteiroEl || timelineHeaders.length > 0 || descResortEl;

                // FLAG DE FERRO CORRIGIDA: É Disney ou Ingresso solto?
                const tagsSite = Array.from(document.querySelectorAll('.dev-active-themes-item span')).map(s => s.textContent.toUpperCase());
                const hasTicketTheme = tagsSite.some(t => t.includes('DISNEY') || t.includes('INGRESSO') || t.includes('TICKET'));
                
                // Só assume que é ingresso genérico se tiver a tag OU (se tiver a classe ticket MAS NÃO for um pacote)
                const isTicketOrDisney = hasTicketTheme || (document.querySelector('.dev-ticket') !== null && !isPackage);

                if (isTicketOrDisney) {
                    const descGeral = document.querySelector('.description-brochure');
                    itinerarioText = descGeral ? descGeral.textContent.trim() : 'Atividade / Ingresso de Parque Temático.';
                    includedText = "Ingresso / Atividade confirmada. Os detalhes, acessos e regras específicas estão descritos na aba 'Dia a Dia'.";
                    excludedText = "Despesas pessoais, transporte até o parque/atração e alimentação não estão inclusos, salvo quando expressamente especificado na descrição.";
                
                } else {
                    // LÓGICA DE CAPTURA INTELIGENTE (DIA A DIA)
                    if (roteiroEl) {
                        itinerarioText = roteiroEl.textContent.trim();
                    } else if (timelineHeaders.length > 0) {
                        // 🔥 LEITOR DE LINHA DO TEMPO 🔥
                        let timelineText = '';
                        
                        timelineHeaders.forEach(header => {
                            const dataEl = header.querySelector('.c-route-date');
                            const dataTxt = dataEl ? dataEl.textContent.replace(/\s+/g, ' ').trim() : '';

                            const tituloEl = header.querySelector('.c-title--main');
                            const tituloTxt = tituloEl ? tituloEl.textContent.trim() : '';

                            const blocoPai = header.closest('.o-block__item.destination-block, .o-block.o-block--small, .destino.o-block');
                            let detalhesTxt = '';
                            
                            if (blocoPai) {
                                const desc = blocoPai.querySelector('.destination-description');
                                const hotel = blocoPai.querySelector('.dev-hotelName');
                                const ticket = blocoPai.querySelector('.dev-ticket-details-title');
                                const transferFrom = blocoPai.querySelector('.dev-from');
                                const transferTo = blocoPai.querySelector('.dev-to');
                                const transport = blocoPai.querySelector('.c-transport-journey__name-company');

                                if (desc) detalhesTxt = desc.textContent.replace('Sobre o destino:', '').trim();
                                else if (hotel) detalhesTxt = `🏨 Hospedagem: ${hotel.textContent.trim()}`;
                                else if (ticket) detalhesTxt = `🎟️ Atividade: ${ticket.textContent.trim()}`;
                                else if (transferFrom && transferTo) detalhesTxt = `🚗 De: ${transferFrom.textContent.trim()} \n📍 Para: ${transferTo.textContent.trim()}`;
                                else if (transport) detalhesTxt = `🚌 Transporte: ${transport.textContent.trim()}`;
                            }

                            if (tituloTxt) {
                                timelineText += `[${dataTxt}] ${tituloTxt}\n`;
                                if (detalhesTxt) timelineText += `${detalhesTxt}\n`;
                                timelineText += '\n';
                            }
                        });
                        itinerarioText = timelineText.trim();
                    } else if (descResortEl) {
                        itinerarioText = descResortEl.textContent.trim();
                    }

                    // 🔥 LÓGICA DE INCLUSOS BLINDADA 🔥
                    const incNode = document.querySelector('.dev-included');
                    const excNode = document.querySelector('.dev-excluded');
                    
                    if (incNode) includedText = incNode.textContent;
                    if (excNode) excludedText = excNode.textContent;

                    // Fallback apenas em blocos curtos, rejeitando roteiros
                    if (!includedText || !excludedText) {
                        const blocosDeTexto = Array.from(document.querySelectorAll('.o-block__item'));
                        for (let bloco of blocosDeTexto) {
                            const txt = bloco.textContent.trim();
                            const txtUpper = txt.toUpperCase();
                            
                            if ((txtUpper.startsWith('SERVIÇOS INCLUÍDOS') || txtUpper.startsWith('O QUE ESTÁ INCLUÍDO')) && !txtUpper.includes('1º DIA')) {
                                includedText = txt;
                            }
                            if ((txtUpper.startsWith('NÃO INCLUÍDOS') || txtUpper.startsWith('NÃO ESTÁ INCLUÍDO')) && !txtUpper.includes('1º DIA')) {
                                excludedText = txt;
                            }
                        }
                    }

                    // 🔥 GUILHOTINA INTELIGENTE 🔥
                    const regexNaoIncluido = /NÃO INCLUÍDO|NÃO INCLUSOS|NÃO INCLUSO|NÃO ESTÁ INCLUÍDO|SERVIÇOS NÃO INCLUÍDOS/i;
                    
                    if (includedText && includedText.match(regexNaoIncluido)) {
                        includedText = includedText.split(regexNaoIncluido)[0].trim();
                    }
                    if (excludedText && excludedText.match(regexNaoIncluido)) {
                        const partes = excludedText.split(regexNaoIncluido);
                        if (partes.length > 1) {
                            const sobra = partes[partes.length - 1].trim();
                            // Só aciona a guilhotina se a sobra for pequena. Se for um roteiro gigante, ele ignora.
                            if(sobra.length < 1500) {
                                excludedText = sobra; 
                            }
                        }
                    }
                }

                return { 
                    finalPrice, 
                    itinerarioText: cleanLixo(itinerarioText), 
                    includedText: cleanLixo(includedText), 
                    excludedText: cleanLixo(excludedText) 
                };
            });

            console.log(`   💰 Novo Preço (+5%): R$ ${scrapedData.finalPrice.toFixed(2)}`);
            console.log(`   🧹 Dia a dia formatado! Lixos e códigos residuais removidos.`);

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