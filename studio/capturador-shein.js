const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function capturarLinksShein() {
    console.log('🕵️ Conectando ao Chrome (Modo Ilimitado)...');
    
    let browser;
    try {
        browser = await puppeteer.connect({ 
            browserURL: 'http://127.0.0.1:9222', 
            defaultViewport: null 
        });
    } catch (e) {
        console.error("❌ Erro: Chrome não detectado na porta 9222.");
        return;
    }

    const page = (await browser.pages())[0];
    console.log(`📍 Lendo página atual...`);

    // --- ROLAGEM INTELIGENTE ATÉ O FIM ---
    console.log('⬇️ Rolando até o fim da página (pode demorar)...');
    
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400; // Distância de cada rolada
            let noChangeCount = 0; // Contador de tentativas sem mudança

            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                // Verifica se chegou no fim (altura não aumenta mais)
                if ((window.innerHeight + window.scrollY) >= scrollHeight - 100) {
                    noChangeCount++;
                    // Espera 3 tentativas (300ms) para ter certeza que não carregou mais nada
                    if (noChangeCount > 15) { 
                        clearInterval(timer);
                        resolve();
                    }
                } else {
                    noChangeCount = 0; // Reset se a página cresceu (carregou mais itens)
                }
            }, 100);
        });
    });

    // --- CAPTURA ---
    const resultado = await page.evaluate(() => {
        const allAnchors = Array.from(document.querySelectorAll('a'));
        
        // Pega TUDO
        const rawLinks = allAnchors
            .map(a => a.href)
            .filter(href => href && href.includes('-p-') && href.includes('.html') && !href.includes('javascript'))
            .map(url => url.split('?')[0].split('#')[0]); // Limpa a URL

        return rawLinks;
    });

    // Remove duplicados via JS (Node) para contagem exata
    const linksUnicos = [...new Set(resultado)];
    const duplicados = resultado.length - linksUnicos.length;

    console.log(`\n📊 RELATÓRIO:`);
    console.log(`   Links encontrados na página: ${resultado.length}`);
    console.log(`   Duplicados removidos:        ${duplicados}`);
    console.log(`   ✅ LINKS FINAIS ÚNICOS:      ${linksUnicos.length}`);

    if (linksUnicos.length > 0) {
        fs.appendFileSync('links.txt', linksUnicos.join('\n') + '\n');
        console.log(`📝 Salvos em links.txt`);
    } else {
        console.log('⚠️ Nenhum link encontrado.');
    }

    browser.disconnect();
}

capturarLinksShein();