const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const slugify = require('slugify');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// --- CONFIGURAÇÃO SANITY ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skfGCAjGr1FXataCezc2o3gqexiKZxQ3mNDdVQgstwhVG2oQOzze8ZQxkJMITNwyCtDOeZk3ntT39GRciuoZj2MHUmgWDwHpgwXoDBqnE1roEQKcheKcILHHzYQvzAzlPonCOaXAQvjmazR1DXsBWICy3LloyfFrq8VKHhQTd7Pf8nM86m0o' // <--- COLOQUE SEU TOKEN AQUI
});

const generateKey = () => Math.random().toString(36).substring(2, 15);

async function uploadMediaToSanity(mediaUrl) {
    if (!mediaUrl) return null;
    try {
        // Garante protocolo https
        if (mediaUrl.startsWith('//')) mediaUrl = 'https:' + mediaUrl;
        
        const response = await axios.get(mediaUrl, { 
            responseType: 'arraybuffer', 
            timeout: 30000, 
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        const buffer = Buffer.from(response.data, 'binary');
        const asset = await client.assets.upload('image', buffer, { filename: mediaUrl.split('/').pop() });
        return { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, _key: generateKey() };
    } catch (error) { 
        // console.log('Erro imagem (ignorado):', error.message);
        return null; 
    }
}

async function scrapeSheinData(page, url) {
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // EXTRAÇÃO DIRETA DO JSON DA SHEIN (Baseado no seu arquivo fonte)
        const sheinData = await page.evaluate(() => {
            try {
                // A Shein guarda tudo nesta variável global
                const data = window.gbProductIntroData || window.productIntroData;
                
                if (!data) return null;

                const detail = data.detail;
                
                // 1. Preço (Prioriza Sale, se não tiver usa Retail)
                const salePrice = detail.salePrice ? detail.salePrice.amount : detail.retailPrice.amount;
                
                // 2. Cores e Tamanhos
                // A Shein organiza variantes complexas. Vamos simplificar pegando os tamanhos da cor atual.
                // O array 'sale_attr_list' geralmente contém as opções de tamanho
                let sizes = [];
                if (data.oa_color_list && data.oa_color_list.length > 0) {
                     // Lógica para pegar tamanhos disponíveis da cor ativa
                     // Simplificação: Pega todos os tamanhos listados no produto
                     const sizeAttr = detail.sale_attr_list[Object.keys(detail.sale_attr_list).find(key => detail.sale_attr_list[key].attr_name === 'Tamanho' || detail.sale_attr_list[key].attr_name === 'Size')];
                     if(sizeAttr && sizeAttr.attr_value_list) {
                         sizes = sizeAttr.attr_value_list.map(s => s.attr_value_name);
                     }
                }
                
                // Fallback de tamanhos se a lógica acima falhar
                if (sizes.length === 0 && data.sku_list) {
                    sizes = data.sku_list.map(s => s.size_name || s.attr_value_name).filter(s => s);
                }
                sizes = [...new Set(sizes)]; // Remove duplicados
                if (sizes.length === 0) sizes = ['Único'];

                // 3. Imagens (Alta resolução)
                let images = [];
                if (data.goods_imgs && data.goods_imgs.detail_image) {
                    images = data.goods_imgs.detail_image.map(img => img.origin_image);
                } else if (detail.main_image) {
                    images = [detail.main_image.origin_image];
                }

                // 4. Descrição (Atributos)
                const specs = detail.attr_info_list 
                    ? detail.attr_info_list.map(a => `${a.attr_name}: ${a.attr_value}`).join('\n') 
                    : '';

                return {
                    title: detail.goods_name,
                    rawPrice: parseFloat(salePrice),
                    description: specs,
                    images: images,
                    sizes: sizes,
                    color: detail.color_top_name || 'Padrão', // Nome da cor principal
                    skuId: detail.goods_sn // Código original da Shein
                };
            } catch (e) { return null; }
        });

        if (!sheinData) throw new Error("Não foi possível ler o JSON oculto da Shein.");

        return sheinData;

    } catch (e) {
        console.error(`   ❌ Erro Scraping: ${e.message}`);
        return null;
    }
}

async function startSheinImport() {
    console.log('🚀 Iniciando Importador SHEIN -> SN (Via JSON)...');
    
    let links = [];
    try {
        links = fs.readFileSync('links.txt', 'utf-8').split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
    } catch (e) { console.log('❌ Crie o arquivo links.txt com as URLs.'); return; }

    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages())[0];

    for (const [index, link] of links.entries()) {
        console.log(`\n========================================`);
        console.log(`PRODUTO ${index + 1}/${links.length}`);
        console.log(`🔗 ${link}`);
        
        const data = await scrapeSheinData(page, link);

        if (!data) continue;

        // CÁLCULO DE PREÇO SN
        const finalPrice = parseFloat(((data.rawPrice * 1.6) + 20.00).toFixed(2));

        console.log(`   📦 ${data.title.substring(0, 50)}...`);
        console.log(`   💰 Custo: R$${data.rawPrice} -> Venda: R$${finalPrice}`);
        console.log(`   🎨 Cor: ${data.color} | 📏 Tamanhos: ${data.sizes.join(', ')}`);

        // Upload Imagens (Limitado a 6 para economizar tempo)
        const imageAssets = [];
        for (const imgUrl of data.images.slice(0, 6)) {
            const asset = await uploadMediaToSanity(imgUrl);
            if (asset) imageAssets.push(asset);
        }

        if (imageAssets.length === 0) { console.log('   ⚠️ Sem imagens. Pulando.'); continue; }

        // SKU Base (SN + Primeiros digitos do nome + Cor)
        const skuBase = `SN-${slugify(data.title).substring(0,5)}-${slugify(data.color)}`.toUpperCase();

        const doc = {
            _type: 'product',
            title: data.title,
            sourceUrl: link, // Importante para o atualizador
            brand: 'SN',     // Marca Fixa
            isActive: true,
            price: finalPrice,
            description: [{ 
                _type: 'block', 
                _key: generateKey(), 
                style: 'normal', 
                children: [{ _type: 'span', text: `Produto Importado SN.\n\n${data.description}` }] 
            }],
            images: imageAssets,
            slug: { _type: 'slug', current: slugify(data.title, { lower: true, strict: true }) + `-${Date.now().toString().slice(-4)}` },
            
            // VARIANTE ÚNICA (Representando a cor do link)
            variants: [{
                _key: generateKey(),
                _type: 'object',
                colorName: data.color,
                variantImage: imageAssets[0], // Usa a primeira imagem como capa da cor
                sizes: data.sizes.map(s => ({
                    _key: generateKey(),
                    size: s,
                    price: finalPrice,
                    stock: 10, // Estoque fictício inicial
                    sku: `${skuBase}-${s}`.toUpperCase()
                }))
            }],
            
            // Categorização Básica (Pode melhorar com seu mapa de categorias)
            productType: 'fashion',
            fashionSpecs: { gender: 'Fem', material: 'Outros', model: 'Outros' }
        };

        try {
            await client.create(doc);
            console.log('   ✅ Produto Criado no Sanity!');
        } catch (err) { console.error('   ❌ Erro ao salvar:', err.message); }
    }
    
    console.log('\n🏁 Importação finalizada.');
    process.exit(0);
}

startSheinImport();