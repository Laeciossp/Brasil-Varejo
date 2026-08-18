// capturador-tours.js
// FUNÇÃO: Mapeia as temáticas da Queensberry, clica em cada uma, 
// passa pelas páginas e extrai todos os links dos roteiros.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const delay = ms => new Promise(res => setTimeout(res, ms));

async function capturarTours() {
    console.log('🕵️ Conectando ao Chrome aberto...');
    let browser;
    try {
        browser = await puppeteer.connect({ 
            browserURL: 'http://127.0.0.1:9222', 
            defaultViewport: null 
        });
    } catch (e) {
        console.error("❌ Erro: O Chrome não está aberto em modo debug (porta 9222).");
        return;
    }

    const page = (await browser.pages())[0];
    
    // 1. Extrai todos os links do Carrossel de Temáticas
    console.log('📍 Lendo as temáticas na página atual...');
    const tematicas = await page.evaluate(() => {
        // Pega todos os links dentro do filtro de temas
        const links = Array.from(document.querySelectorAll('.c-theme-filter__link'));
        return links.map(a => ({
            nome: a.querySelector('.c-theme-filter__name')?.innerText.trim() || 'Desconhecida',
            url: a.href
        })).filter(t => t.url && t.url.includes('moreideas'));
    });

    console.log(`✅ Encontradas ${tematicas.length} temáticas.`);
    let todosLinksTours = new Set(); // Set evita links duplicados

    // 2. O robô vai navegar temática por temática
    for (const tema of tematicas) {
        console.log(`\n🔎 Explorando temática: [${tema.nome}]`);
        
        try {
            await page.goto(tema.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await delay(4000); // Espera o conteúdo principal carregar
            
            let temProximaPagina = true;
            let paginaAtual = 1;

            while (temProximaPagina) {
                console.log(`   📄 Lendo página ${paginaAtual}...`);
                
                // Pega os links dos cards dos tours na página atual
                const linksNaPagina = await page.evaluate(() => {
                    const cards = Array.from(document.querySelectorAll('a.c-idea-card__main'));
                    return cards.map(a => a.href).filter(href => href.includes('/idea/'));
                });

                linksNaPagina.forEach(link => todosLinksTours.add(link));
                console.log(`   Capturados ${linksNaPagina.length} roteiros nesta página.`);

                // Verifica se o botão "Próximo" da paginação está ativo e clica
                const temProximo = await page.evaluate(() => {
                    const btnNext = document.querySelector('.ui-paginator-next');
                    if (btnNext && !btnNext.classList.contains('ui-state-disabled')) {
                        btnNext.click(); // Dispara o Ajax do PrimeFaces
                        return true;
                    }
                    return false;
                });

                if (temProximo) {
                    paginaAtual++;
                    console.log(`   ⏳ Carregando próxima página...`);
                    await delay(4000); // Tempo necessário para o PrimeFaces trocar os itens da tela
                } else {
                    temProximaPagina = false; // Acabaram as páginas desta temática
                }
            }
        } catch (err) {
            console.error(`   ❌ Erro ao ler a temática ${tema.nome}:`, err.message);
        }
    }

    // 3. Salvar tudo no arquivo links_tours.txt
    const arrayLinks = Array.from(todosLinksTours);
    if (arrayLinks.length > 0) {
        fs.writeFileSync('links_tours.txt', arrayLinks.join('\n') + '\n');
        console.log(`\n🎉 SUCESSO ABSOLUTO! ${arrayLinks.length} roteiros únicos foram salvos no 'links_tours.txt'.`);
    } else {
        console.log('\n⚠️ Nenhum roteiro encontrado.');
    }

    console.log('🔌 Desconectando capturador...');
    browser.disconnect();
}

capturarTours();