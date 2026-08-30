const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fetch = require('node-fetch');

puppeteer.use(StealthPlugin());
const delay = ms => new Promise(res => setTimeout(res, ms));

// ==========================================
// CONFIGURAÇÃO DO SEU SANITY
// ==========================================
const sanityClient = createClient({
  projectId: 'o4upb251', 
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

async function capturarMarketing() {
    console.log('🧹 1. Apagando ofertas antigas no Sanity...');
    const oldDocs = await sanityClient.fetch('*[_type == "ofertaMarketing"]{_id}');
    if (oldDocs.length > 0) {
        const transaction = sanityClient.transaction();
        oldDocs.forEach(doc => transaction.delete(doc._id));
        await transaction.commit();
    }

    console.log('🕵️ 2. Conectando ao Chrome (Porta 9222)...');
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages())[0];

    console.log('   🔄 Rolando carrossel lateralmente...');
    await page.evaluate(async () => {
        const carousel = document.querySelector('.scroll-carousel-container');
        if (carousel) {
            let previous = -1; let tentativas = 0;
            while (carousel.scrollLeft !== previous && tentativas < 50) {
                previous = carousel.scrollLeft;
                carousel.scrollBy({ left: 600, behavior: 'smooth' });
                await new Promise(r => setTimeout(r, 800)); tentativas++;
            }
        }
    });

    console.log('\n📸 3. Iniciando captura profunda dos Stories (AMP)...');
    const cards = await page.$$('.story');
    const ofertasProcessadas = [];

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const titulo = await card.$eval('.description strong', el => el.innerText.replace(/\u00A0/g, ' ').trim()).catch(() => 'Oferta Sem Título');
        
        // Capa de fallback (baixa qualidade)
        const capaUrl = await card.$eval('.image', el => {
            const bg = el.style.backgroundImage;
            return bg && bg !== 'none' ? bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '') : null;
        }).catch(() => null);

        console.log(`\n   👉 Explorando: ${titulo}`);

        let midiasDoStory = [];
        const btn = await card.$('.button-story');
        
        if (btn) {
            await btn.click();
            
            // AGUARDA ATÉ 5 SEGUNDOS PARA O IFRAME APARECER NA TELA
            await page.waitForSelector('iframe[src*="stories"]', { timeout: 5000 }).catch(() => null);

            const iframeUrl = await page.evaluate(() => {
                // SELETOR CORRIGIDO: Pega qualquer iframe que o link tenha a palavra "stories"
                const iframe = document.querySelector('iframe[src*="stories"]');
                return iframe ? iframe.src : null;
            });

            if (iframeUrl) {
                console.log(`      🔗 Link do Story encontrado: ${iframeUrl}`);
                const storyPage = await browser.newPage();
                
                // Aguarda a aba carregar completamente para garantir que o AMP renderize
                await storyPage.goto(iframeUrl, { waitUntil: 'networkidle2' }); 
                
                midiasDoStory = await storyPage.evaluate(() => {
                    const pages = document.querySelectorAll('amp-story-page');
                    let midias = [];
                    
                    pages.forEach(p => {
                        // Tenta achar o vídeo
                        const videoSource = p.querySelector('amp-video source');
                        const video = p.querySelector('amp-video');
                        let videoUrl = null;
                        
                        if (videoSource && videoSource.src) videoUrl = videoSource.src;
                        else if (video && video.getAttribute('src')) videoUrl = video.getAttribute('src');

                        if (videoUrl) {
                            midias.push({ tipo: 'video', url: videoUrl });
                        } else {
                            // Se não achar vídeo, procura a imagem de alta definição
                            const img = p.querySelector('amp-img');
                            if (img && img.getAttribute('src')) {
                                midias.push({ tipo: 'imagem', url: img.getAttribute('src') });
                            }
                        }
                    });
                    return midias;
                });
                
                await storyPage.close();
                console.log(`      ✅ Encontradas ${midiasDoStory.length} mídias em ALTA QUALIDADE!`);
            } else {
                console.log(`      ⚠️ Iframe do Story não encontrado.`);
            }

            // Fecha a janela
            await page.keyboard.press('Escape');
            await delay(500);
            
            // Fechador de segurança caso o ESC falhe
            await page.evaluate(() => {
                const closeBtn = document.querySelector('.icon-close, .close, .btn-close, [aria-label="Close"]');
                if (closeBtn) closeBtn.click();
                const backdrop = document.querySelector('.cdk-overlay-backdrop');
                if (backdrop) backdrop.click();
            });
            await delay(500);
        }

        ofertasProcessadas.push({ titulo, capaUrl, midiasDoStory });
    }

    console.log('\n🚀 4. Fazendo Upload das Mídias para o Sanity...');
    for (const [index, oferta] of ofertasProcessadas.entries()) {
        console.log(`\n   ⚙️ Salvando [${index + 1}/${ofertasProcessadas.length}]: ${oferta.titulo}`);

        try {
            let assetCapaId = null;
            if (oferta.capaUrl) {
                const resCapa = await fetch(oferta.capaUrl);
                const bufCapa = await resCapa.buffer();
                const assetCapa = await sanityClient.assets.upload('image', bufCapa, { filename: 'capa_baixa.jpg' });
                assetCapaId = assetCapa._id;
            }

            const storiesSanity = [];
            for (let j = 0; j < oferta.midiasDoStory.length; j++) {
                const m = oferta.midiasDoStory[j];
                
                if (m.tipo === 'video') {
                    storiesSanity.push({
                        _key: `midia_${j}`,
                        tipo: 'video',
                        videoUrl: m.url
                    });
                } else if (m.tipo === 'imagem') {
                    const resImg = await fetch(m.url);
                    const bufImg = await resImg.buffer();
                    const assetImg = await sanityClient.assets.upload('image', bufImg, { filename: `story_alta_${j}.jpg` });
                    storiesSanity.push({
                        _key: `midia_${j}`,
                        tipo: 'imagem',
                        imagem: { _type: 'image', asset: { _type: 'reference', _ref: assetImg._id } }
                    });
                }
            }

            const doc = {
                _type: 'ofertaMarketing', 
                titulo: oferta.titulo,
                capa: assetCapaId ? { _type: 'image', asset: { _type: 'reference', _ref: assetCapaId } } : undefined,
                stories: storiesSanity
            };

            await sanityClient.create(doc);
            console.log(`      ✅ Sucesso! (${storiesSanity.length} stories anexados)`);

        } catch (err) {
            console.error(`      ❌ Erro:`, err.message);
        }
    }

    console.log('\n🏁 TUDO PRONTO!');
    browser.disconnect();
}

capturarMarketing();