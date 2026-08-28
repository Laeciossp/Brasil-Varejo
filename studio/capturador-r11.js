// capturador-r11.js
// V25 (ESTÁVEL) + EXTRAÇÃO REAL DA TABELA DE CÓDIGOS DE CABINE

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');

puppeteer.use(StealthPlugin());

const client = createClient({
  projectId: 'o4upb251', 
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

const delay = ms => new Promise(res => setTimeout(res, ms));

async function uploadMediaToSanity(mediaUrl) {
    if (!mediaUrl) return null;
    const urlLower = mediaUrl.toLowerCase();
    if (urlLower.includes('logo') || urlLower.includes('palastore') || urlLower.includes('brand') || urlLower.includes('icon') || urlLower.includes('thumb')) return null;
    
    try {
        let hdUrl = mediaUrl.replace(/\?w=\d+/, '').replace('-thumb', '').replace('_thumb', '');
        const response = await axios.get(hdUrl, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const buffer = Buffer.from(response.data, 'binary');
        const filename = hdUrl.split('/').pop().split('?')[0] || 'navio-capa.jpg';
        const asset = await client.assets.upload('image', buffer, { filename });
        return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
    } catch (error) { 
        return null; 
    }
}

async function startScraper() {
    console.log('🚢 Iniciando Capturador R11 (V25 Estável + Tabela de Códigos/Variações)...');
    
    let browser;
    try {
        browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    } catch (e) {
        console.error("❌ Erro: O Chrome não está aberto em modo debug na porta 9222.");
        return;
    }

    const pages = await browser.pages();
    let targetPage = null;

    console.log('🔍 Procurando a aba correta com o cruzeiro aberto...');
    for (const p of pages) {
        try {
            const hasCruiseData = await p.evaluate(() => {
                return !!document.querySelector('.cruiseShipInfo') || document.body.innerText.includes('Navio:');
            });
            if (hasCruiseData) {
                targetPage = p;
                break;
            }
        } catch (err) {}
    }

    if (!targetPage) {
        console.log("❌ ERRO: Nenhuma aba com os dados do cruzeiro foi encontrada.");
        process.exit(1);
    }

    await targetPage.bringToFront();
    console.log(`🔗 Conectado na aba: ${await targetPage.title()}`);

    // ==========================================
    // 1. CAPTURA DAS 23 CABINES + NOME DO NAVIO
    // ==========================================
    console.log('📍 Extraindo nome do navio e as 23 cabines...');
    const navioData = await targetPage.evaluate(() => {
        let nomeNavio = 'Navio Desconhecido';
        const shipInfoSpan = document.querySelector('.cruiseShipInfo');
        if (shipInfoSpan && shipInfoSpan.innerText.trim()) {
            nomeNavio = shipInfoSpan.innerText.trim();
        } else {
            const matchNavio = document.body.innerText.match(/Navio:\s*([^\n]+)/i);
            if (matchNavio && matchNavio[1]) nomeNavio = matchNavio[1].trim();
        }

        let companhiaRaw = 'Royal Caribbean';
        const textoTela = document.body.innerText;
        const linhasTexto = textoTela.split('\n');
        
        for (let linha of linhasTexto) {
            if (linha.toLowerCase().includes('companhia:')) {
                companhiaRaw = linha.split(/companhia:/i)[1].trim();
            }
        }

        let categoriasCabine = [];
        const todosOsBlocos = Array.from(document.querySelectorAll('tr, div, article, section'));

        todosOsBlocos.forEach(bloco => {
            const txt = bloco.innerText ? bloco.innerText.trim() : '';
            
            if ((txt.includes('m²') || txt.includes('m2') || txt.toLowerCase().includes('camas')) && txt.length < 600 && txt.length > 15) {
                const img = bloco.querySelector('img') || bloco.parentElement?.querySelector('img');
                
                if (img && img.src) {
                    const u = img.src.toLowerCase();
                    if (u.includes('logo') || u.includes('palastore') || u.includes('brand')) return;

                    let partes = txt.split('\n').filter(p => p.trim() !== '');
                    let titulo = partes[0] || 'Cabine';
                    
                    if (titulo.toUpperCase().includes('TAMANHO') || titulo.toUpperCase().includes('OCUPAÇÃO')) return;

                    let descricaoLimpas = partes.slice(1).filter(linhaTexto => {
                        const l = linhaTexto.toUpperCase();
                        return !l.includes('BRL') && !l.includes('R$') && !l.includes('MENOR PREÇO') && !l.includes('LISTA DE ESPERA') && !l.includes('GARANTIDA') && !l.includes('SAVINGS');
                    });

                    let descricao = descricaoLimpas.join(' ').split('A imagem é ilustrativa')[0].trim();
                    if (!descricao) descricao = titulo;

                    descricao = descricao.replace(/BRL[\d.,\s]+/gi, '').replace(/R\$[\d.,\s]+/gi, '').trim();

                    if (!categoriasCabine.some(c => c.nomeAmigavel === titulo)) {
                        
                        // ==========================================
                        // INJEÇÃO DA TABELA DE VARIAÇÕES (O SEGREDO DO HTML)
                        // ==========================================
                        let variacoesReais = [];
                        
                        // 1. Tenta achar as variações dentro do próprio bloco
                        let linhasVar = Array.from(bloco.querySelectorAll('.cruiseTable_MorePrices_Values'));

                        // 2. Se não estiverem dentro, procura nos blocos "irmãos" logo abaixo da cabine
                        if (linhasVar.length === 0) {
                            let proximo = bloco.nextElementSibling;
                            let limit = 0;
                            while (proximo && limit < 15) { // Desce no máximo 15 linhas para não invadir outra cabine
                                // Se bater em outra foto de cabine, para de descer
                                if (proximo.querySelector('img') && (proximo.innerText.includes('m²') || proximo.innerText.includes('m2'))) break;

                                if (proximo.classList && proximo.classList.contains('cruiseTable_MorePrices_Values')) {
                                    linhasVar.push(proximo);
                                } else {
                                    let sub = proximo.querySelectorAll('.cruiseTable_MorePrices_Values');
                                    if (sub.length > 0) linhasVar.push(...Array.from(sub));
                                }
                                proximo = proximo.nextElementSibling;
                                limit++;
                            }
                        }

                        // Processa as linhas encontradas mapeando conforme seu HTML
                        linhasVar.forEach(linha => {
                            const divs = Array.from(linha.children);
                            // O HTML da R11 tem as divs na ordem: [0] Tamanho, [1] Ocupação, [2] Código, [3] Localização
                            if (divs.length >= 4) {
                                let tam = divs[0].innerText.trim();
                                let ocu = divs[1].innerText.trim();
                                let cod = divs[2].innerText.trim();
                                let loc = divs[3].innerText.trim();

                                // Só insere se não for vazio e não for repetido (evita 2V duas vezes)
                                if (cod && tam && !variacoesReais.some(v => v.codigo === cod)) {
                                    variacoesReais.push({
                                        codigo: cod,
                                        tamanho: tam,
                                        ocupacao: ocu,
                                        decksLocalizacao: loc
                                    });
                                }
                            }
                        });

                        // Fallback de Segurança da V25 (Se o site não renderizar a tabela, não dá erro, usa o antigo)
                        if (variacoesReais.length === 0) {
                            variacoesReais.push({
                                codigo: "Standard",
                                tamanho: txt.match(/\d+[\s]*m[²2]/)?.[0] || "14m²",
                                ocupacao: txt.match(/(Até\s*\d+\s*hóspedes|Até\s*\d+\s*pessoas)/i)?.[0] || "Até 2 hóspedes",
                                decksLocalizacao: "Consulte o Deck"
                            });
                        }
                        // ==========================================
                        // FIM DA INJEÇÃO DA TABELA
                        // ==========================================

                        categoriasCabine.push({
                            nomeAmigavel: titulo,
                            descricaoLimpa: descricao,
                            imagemRaw: img.src,
                            variacoes: variacoesReais // <--- Array populado real entra aqui
                        });
                    }
                }
            }
        });
        
        return { nomeNavio, companhiaRaw, categoriasCabine };
    });

    // ==========================================
    // 2. CLIQUE NO MODAL PARA CAPTURAR A FOTO DE CAPA EM HD
    // ==========================================
    console.log('📍 Abrindo o modal de detalhes do navio para resgatar a foto de capa...');
    let shipPhotoUrl = null;
    try {
        const clicked = await targetPage.evaluate(() => {
            const shipSpan = document.querySelector('.cruiseShipInfo');
            if (shipSpan) { shipSpan.click(); return true; }
            return false;
        });

        if (clicked) {
            await delay(3000); // Aguarda o modal abrir na tela

            shipPhotoUrl = await targetPage.evaluate(() => {
                const modalImgs = Array.from(document.querySelectorAll('.modal img, .ui-dialog img, div[id*="modal"] img, .popup img')).filter(img => {
                    const src = img.src.toLowerCase();
                    return img.clientWidth > 200 && !src.includes('logo') && !src.includes('palastore') && !src.includes('thumb');
                });
                return modalImgs.length > 0 ? modalImgs[0].src : null;
            });

            // Fecha o modal suavemente
            await targetPage.evaluate(() => {
                const btnClose = document.querySelectorAll('.modal .close, .ui-dialog-titlebar-close, .close-modal, [class*="close"]');
                btnClose.forEach(b => b.click());
            });
            await delay(1000);
        }
    } catch (err) {
        console.log('⚠️ Aviso ao buscar foto de capa no modal:', err.message);
    }

    let companhiaSanity = "Royal Caribbean";
    const compLower = navioData.companhiaRaw.toLowerCase();
    if (compLower.includes('costa')) companhiaSanity = "Costa Cruzeiros";
    else if (compLower.includes('celebrity')) companhiaSanity = "Celebrity Cruises";
    else if (compLower.includes('azamara')) companhiaSanity = "Azamara";
    else if (compLower.includes('royal')) companhiaSanity = "Royal Caribbean";

    console.log(`\n🛳️  Navio Identificado: ${navioData.nomeNavio} (${companhiaSanity})`);
    console.log(`🛏️  Categorias Mapeadas: ${navioData.categoriasCabine.length}`);
    console.log(`🖼️  Foto de Capa: ${shipPhotoUrl ? 'Encontrada com Sucesso!' : 'Não encontrada'}`);

    // ==========================================
    // 3. UPLOAD PARA O SANITY
    // ==========================================
    console.log('\n☁️  Enviando dados limpos para o Sanity...');
    let imagemPrincipalSanity = await uploadMediaToSanity(shipPhotoUrl);

    let cabinesProcessadas = [];
    for (const cab of navioData.categoriasCabine) {
        const imagemSanity = await uploadMediaToSanity(cab.imagemRaw);
        
        let meta = 'Interna';
        const nomeUpper = cab.nomeAmigavel.toUpperCase();
        if (nomeUpper.includes('MAR') || nomeUpper.includes('EXTERNA') || nomeUpper.includes('OUTSIDE')) meta = 'Externa (Vista Mar)';
        if (nomeUpper.includes('VARANDA') || nomeUpper.includes('BALCONY')) meta = 'Varanda';
        if (nomeUpper.includes('SUÍTE') || nomeUpper.includes('SUITE') || nomeUpper.includes('DELUXE')) meta = 'Suíte';

        let objVariacoes = {
            _key: Date.now().toString(36) + Math.random().toString(36).substr(2),
            metacategoria: meta,
            nomeAmigavel: cab.nomeAmigavel,
            descricaoLimpa: cab.descricaoLimpa,
            variacoes: cab.variacoes.map(v => ({
                _key: Date.now().toString(36) + Math.random().toString(36).substr(2),
                ...v
            }))
        };
        
        if (imagemSanity) objVariacoes.imagemHD = imagemSanity;
        cabinesProcessadas.push(objVariacoes);
    }

    const documentoNavio = {
        _type: 'navio',
        nome: navioData.nomeNavio,
        companhia: companhiaSanity,
        categoriasCabine: cabinesProcessadas
    };

    if (imagemPrincipalSanity) {
        documentoNavio.imagemPrincipal = imagemPrincipalSanity;
    }

    try {
        console.log('\n💾 Salvando navio no Sanity...');
        const res = await client.create(documentoNavio);
        console.log(`✅ SUCESSO ABSOLUTO! Navio "${navioData.nomeNavio}" gravado com sucesso. ID: ${res._id}`);
    } catch (err) { 
        console.error("❌ Erro ao salvar no Sanity:", err.message);
    }

    console.log('\n🏁 Processo Finalizado!');
    process.exit(0);
}

startScraper();