// capturador.js
// FUNÇÃO: Pega links da página aberta no Chrome (Nuvemshop) e salva no links.txt

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// --- CONFIGURAÇÃO DE FILTRO (OPCIONAL) ---
const FILTRO_PALAVRAS = []; 

async function capturarLinks() {
    console.log('🕵️ Conectando ao Chrome aberto...');
    
    let browser;
    try {
        browser = await puppeteer.connect({ 
            browserURL: 'http://127.0.0.1:9222', 
            defaultViewport: null 
        });
    } catch (e) {
        console.error("❌ Erro: O Chrome não está aberto em modo debug ou a porta 9222 está fechada.");
        return;
    }

    const page = (await browser.pages())[0];
    const urlAtual = page.url();
    console.log(`📍 Página Atual: ${urlAtual}`);

    // Extrai os links usando seletores da Nuvemshop
    const linksEncontrados = await page.evaluate((filtros) => {
        // Seletores comuns de grade de produtos da Nuvemshop (Tema Rio/Padrão)
        const seletores = [
            '.js-item-product a',
            '.item-link',
            '[data-store="product-item-link"]'
        ];

        let elementos = [];
        seletores.forEach(sel => {
            elementos = [...elementos, ...Array.from(document.querySelectorAll(sel))];
        });

        // Extrai o href
        let urls = elementos.map(a => a.href);

        // Remove duplicados da página e garante que seja um link de produto
        urls = [...new Set(urls)].filter(url => url.includes('/produtos/'));

        // Aplica filtro de palavras (se houver)
        if (filtros && filtros.length > 0) {
            urls = urls.filter(url => {
                return filtros.some(palavra => url.toLowerCase().includes(palavra.toLowerCase()));
            });
        }

        return urls;
    }, FILTRO_PALAVRAS);

    if (linksEncontrados.length > 0) {
        const conteudo = linksEncontrados.join('\n') + '\n';

        try {
            fs.appendFileSync('links.txt', conteudo);
            console.log(`✅ SUCESSO! ${linksEncontrados.length} links adicionados ao 'links.txt'.`);
            console.log(`   (Último capturado: ...${linksEncontrados[linksEncontrados.length-1].slice(-20)})`);
        } catch (err) {
            console.error('❌ Erro ao salvar arquivo:', err.message);
        }
    } else {
        console.log('⚠️ Nenhum produto encontrado nesta página. Verifique se a grade de produtos carregou.');
    }

    console.log('🔌 Desconectando capturador...');
    browser.disconnect();
}

capturarLinks();