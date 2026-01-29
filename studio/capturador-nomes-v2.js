// capturador-nomes-v2.js
// FUNÇÃO: Cria um mapa { Nome: Link } da página aberta e salva em JSON

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function capturarMapaLinks() {
    console.log('🕵️ Conectando ao Chrome...');
    
    let browser;
    try {
        browser = await puppeteer.connect({ 
            browserURL: 'http://127.0.0.1:9222', 
            defaultViewport: null 
        });
    } catch (e) {
        console.error("❌ Erro: Chrome debug não detectado (Porta 9222).");
        return;
    }

    const page = (await browser.pages())[0];
    const urlAtual = page.url();
    console.log(`📍 Lendo página: ${urlAtual}`);

    // Extrai pares de Nome e Link
    const produtosEncontrados = await page.evaluate(() => {
        const resultados = [];
        
        // Seleciona todos os blocos de produtos (Grade ou Lista)
        const itens = document.querySelectorAll('.products-grid .item, .products-list .item');

        itens.forEach(item => {
            // Tenta achar o Link
            const linkEl = item.querySelector('a.product-image');
            
            // Tenta achar o Nome (geralmente em h2.product-name a, ou title do link)
            let nomeEl = item.querySelector('.product-name a');
            if (!nomeEl) nomeEl = item.querySelector('.product-name'); // Tenta direto no h2/div
            
            // Fallback: Se não achar o nome no texto, tenta o title da imagem
            const nomeTexto = nomeEl ? nomeEl.innerText.trim() : linkEl?.getAttribute('title');

            if (linkEl && nomeTexto) {
                resultados.push({
                    name: nomeTexto,
                    url: linkEl.href
                });
            }
        });

        return resultados;
    });

    if (produtosEncontrados.length > 0) {
        // Lógica para JUNTAR com o arquivo existente (Append inteligente)
        const arquivo = 'mapa-links.json';
        let dadosAtuais = [];

        // Se o arquivo já existe, carrega ele para não perder o que já capturou
        if (fs.existsSync(arquivo)) {
            const raw = fs.readFileSync(arquivo, 'utf-8');
            try { dadosAtuais = JSON.parse(raw); } catch(e) {}
        }

        // Adiciona novos (evitando duplicatas exatas de URL)
        let novosCount = 0;
        produtosEncontrados.forEach(novo => {
            const existe = dadosAtuais.some(antigo => antigo.url === novo.url);
            if (!existe) {
                dadosAtuais.push(novo);
                novosCount++;
            }
        });

        // Salva tudo de volta
        fs.writeFileSync(arquivo, JSON.stringify(dadosAtuais, null, 2));
        
        console.log(`✅ SUCESSO!`);
        console.log(`   Itens nesta página: ${produtosEncontrados.length}`);
        console.log(`   Novos adicionados ao JSON: ${novosCount}`);
        console.log(`   Total acumulado no arquivo: ${dadosAtuais.length}`);
    } else {
        console.log('⚠️ Nenhum produto encontrado. Verifique se a página carregou.');
    }

    console.log('🔌 Desconectando...');
    browser.disconnect();
}

capturarMapaLinks();