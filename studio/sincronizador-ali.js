const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@sanity/client');
const slugify = require('slugify');

// --- 1. CONFIGURAÇÃO ---
const sanity = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  token: 'skfGCAjGr1FXataCezc2o3gqexiKZxQ3mNDdVQgstwhVG2oQOzze8ZQxkJMITNwyCtDOeZk3ntT39GRciuoZj2MHUmgWDwHpgwXoDBqnE1roEQKcheKcILHHzYQvzAzlPonCOaXAQvjmazR1DXsBWICy3LloyfFrq8VKHhQTd7Pf8nM86m0o',
  useCdn: false,
});

const APP_KEY = '526852';
const APP_SECRET = 'jA0YeLYWFu5zXmwm5KI9MVmPzscvQiss';
const ACCESS_TOKEN = '50000401105zHKbXz171b16aahYGIrhsRj8kiPdnxzdKHNLwlRyBfyAoQcWwFu6IPAov';
const BASE_URL = 'https://api-sg.aliexpress.com/sync';
const MARGEM_LUCRO = 1.5; 

const generateKey = () => Math.random().toString(36).substring(2, 15);

// --- FUNÇÕES ---
function gerarAssinatura(params, secret) {
    const sortedKeys = Object.keys(params).sort();
    let stringToSign = '';
    sortedKeys.forEach(key => stringToSign += key + params[key]);
    return crypto.createHmac('sha256', secret).update(stringToSign).digest('hex').toUpperCase();
}

async function uploadMediaToSanity(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        const buffer = Buffer.from(response.data, 'binary');
        const asset = await sanity.assets.upload('image', buffer, { filename: url.split('/').pop() });
        return { 
            _type: 'image', 
            asset: { _type: 'reference', _ref: asset._id }, 
            _key: generateKey() 
        };
    } catch (error) {
        return null;
    }
}

async function importarProduto(productId) {
    console.log(`🚀 IMPORTANDO ID: ${productId} (MODO ESTOQUE REAL)`);

    const params = {
        app_key: APP_KEY,
        access_token: ACCESS_TOKEN,
        method: 'aliexpress.ds.product.get',
        timestamp: Date.now(),
        format: 'json',
        v: '2.0',
        sign_method: 'sha256',
        product_id: productId,
        target_currency: 'BRL',
        ship_to_country: 'BR'
    };
    params.sign = gerarAssinatura(params, APP_SECRET);

    try {
        const query = new URLSearchParams(params).toString();
        const { data } = await axios.get(`${BASE_URL}?${query}`);
        const resultado = data.aliexpress_ds_product_get_response?.result;

        if (!resultado) { console.error("❌ Erro: Produto vazio."); return; }

        const titulo = resultado.ae_item_base_info_dto ? resultado.ae_item_base_info_dto.subject : "Produto Importado";
        const slug = slugify(titulo, { lower: true, strict: true }).slice(0, 90);
        
        // --- 1. IMAGENS ---
        console.log("📸 Baixando imagens...");
        let imageString = resultado.ae_multimedia_info_dto?.image_urls || "";
        const urlList = imageString.split(';').filter(u => u && u.length > 5);
        const uploadedImages = [];

        for (const url of urlList) {
            const imgAsset = await uploadMediaToSanity(url);
            if (imgAsset) uploadedImages.push(imgAsset);
        }

        // --- 2. VARIAÇÕES (COM FILTRO DE ESTOQUE) ---
        console.log("🎨 Analisando Variações e filtrando Sem Estoque...");
        const listaSkus = resultado.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o || [];
        const mapCores = {};
        let variantesValidas = 0;

        for (const sku of listaSkus) {
            // >>> O FILTRO MÁGICO AQUI <<<
            const estoqueReal = sku.sku_available_stock;
            
            // Se estoque for 0, pula para o próximo (não cria a variação)
            if (!estoqueReal || estoqueReal <= 0) {
                console.log(`   🚫 SKU Ignorado (Estoque Zero): ID ${sku.id}`);
                continue;
            }

            const custo = parseFloat(sku.offer_sale_price || 0);
            const venda = parseFloat((custo * MARGEM_LUCRO).toFixed(2));
            const props = sku.ae_sku_property_dtos?.ae_sku_property_d_t_o || [];
            
            let colorName = "Padrão";
            let sizeName = "Único";
            let imageUrl = null;

            props.forEach(p => {
                const nomeProp = p.sku_property_name.toLowerCase();
                const valorProp = p.property_value_definition_name || p.sku_property_value;

                if (nomeProp.includes('color') || nomeProp.includes('cor')) {
                    colorName = valorProp;
                    if (p.sku_image) imageUrl = p.sku_image;
                }
                else if (nomeProp.includes('bundle') || nomeProp.includes('capacity') || nomeProp.includes('storage') || nomeProp.includes('size')) {
                    sizeName = valorProp; 
                }
            });

            if (!mapCores[colorName]) {
                mapCores[colorName] = { image: imageUrl, sizes: [] };
            }

            mapCores[colorName].sizes.push({
                size: sizeName,
                price: venda,
                stock: estoqueReal, // Usa o estoque real da China
                sku: sku.id || generateKey()
            });
            variantesValidas++;
        }

        if (variantesValidas === 0) {
            console.error("❌ O produto existe, mas TODAS as variações estão sem estoque. Abortando criação.");
            return;
        }

        const sanityVariants = [];
        for (const [cor, dados] of Object.entries(mapCores)) {
            // Se baixamos a foto específica da cor, usamos ela. Se não, a primeira da galeria.
            let variantImageAsset = dados.image ? await uploadMediaToSanity(dados.image) : uploadedImages[0];

            sanityVariants.push({
                _key: generateKey(),
                _type: 'object',
                colorName: cor,
                variantImage: variantImageAsset,
                sizes: dados.sizes.map(s => ({
                    _key: generateKey(),
                    size: s.size,
                    price: s.price,
                    stock: s.stock,
                    sku: s.sku
                }))
            });
        }

        const precoBase = listaSkus.length > 0 
            ? parseFloat((parseFloat(listaSkus[0].offer_sale_price) * MARGEM_LUCRO).toFixed(2)) 
            : 0;

        // --- 3. CRIAÇÃO ---
        const doc = {
            _type: 'product',
            title: titulo,
            slug: { _type: 'slug', current: slug },
            price: precoBase,
            isActive: true,
            sourceUrl: `https://pt.aliexpress.com/item/${productId}.html`,
            description: [
                {
                    _type: 'block',
                    _key: generateKey(),
                    style: 'normal',
                    children: [{ _type: 'span', _key: generateKey(), text: 'Produto importado. Garantia de 90 dias.' }]
                }
            ],
            productType: 'tech',
            images: uploadedImages,
            variants: sanityVariants,
            logistics: { weight: 0.5, width: 20, height: 10, length: 15 }
        };

        const res = await sanity.create(doc);
        console.log(`✅ SUCESSO! Produto ID: ${res._id}`);
        console.log(`✨ Variações criadas (apenas com estoque): ${variantesValidas}`);

    } catch (error) {
        console.error("❌ Erro:", error.message);
    }
}

importarProduto('1005008840753738');