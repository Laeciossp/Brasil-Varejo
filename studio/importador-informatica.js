// importador-informatica.js
// VERSÃO: TI & Hardware Profissional (+25% Margem, Logística Padrão)
// CATEGORIA ALVO: cat-informatica

const { createClient } = require('@sanity/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const path = require('path');
const slugify = require('slugify');

puppeteer.use(StealthPlugin());

// Configuração do Sanity (Mantenha suas credenciais seguras)
const SANITY_CONFIG = {
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
};

// ✅ CATEGORIA PROFISSIONAL DE INFORMÁTICA
const CATEGORY_ID = 'cat-informatica'; 

const client = createClient(SANITY_CONFIG);
const generateKey = () => Math.random().toString(36).substring(2, 15);

/**
 * Detecta marcas líderes no segmento de Tecnologia e Informática.
 * Abrange notebooks, componentes, periféricos e armazenamento.
 */
function getBrand(title) {
    const brands = [
        // Laptops & Desktops
        'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Apple', 'Microsoft', 'MSI', 'Gigabyte',
        // Componentes Principais (CPU/GPU/Mobo)
        'Intel', 'AMD', 'Nvidia', 'ASRock', 'Sapphire', 'Zotac',
        // Periféricos & Acessórios Gamer
        'Logitech', 'Razer', 'Corsair', 'HyperX', 'SteelSeries', 'Redragon', 'Glorious',
        // Armazenamento & Memória
        'Samsung', 'Kingston', 'SanDisk', 'WD', 'Western Digital', 'Seagate', 'Crucial', 'Adata',
        // Outros
        'NZXT', 'Cooler Master', 'Thermaltake'
    ];
    const titleUpper = title.toUpperCase();
    
    for (const brand of brands) {
        if (titleUpper.includes(brand.toUpperCase())) {
            // Normalizações para manter o padrão profissional
            if (brand.toUpperCase() === 'WD') return 'Western Digital';
            return brand;
        }
    }
    return 'OEM/Genérica'; // "OEM" soa mais técnico para peças sem marca forte
}

async function uploadMediaToSanity(mediaUrl) {
  try {
    const cleanUrl = mediaUrl.split('?')[0];
    // Filtra apenas extensões de imagem e vídeo de alta qualidade
    if (cleanUrl.match(/\.(svg|gif)$/i)) return null;

    const isVideo = cleanUrl.match(/\.(mp4|webm|mov|mkv)$/i);
    const assetType = isVideo ? 'file' : 'image';
    
    console.log(`   ⬇️ Sync Mídia [${assetType.toUpperCase()}]: ${cleanUrl.substring(0, 35)}...`);
    
    const response = await axios.get(cleanUrl, { 
        responseType: 'arraybuffer',
        timeout: 25000, 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const buffer = Buffer.from(response.data, 'binary');
    const asset = await client.assets.upload(assetType, buffer, { filename: path.basename(cleanUrl) });
    return { id: asset._id, type: assetType };
  } catch (error) {
    console.warn(`   ⚠️ Falha no Sync (Pular): ${error.message}`);
    return null; 
  }
}

async function startScraper() {
  console.log('🖥️ Inicializando Engine de Importação (Modo: IT Professional)...');
  let browser;
  try {
      // Conecta à sessão de debug do Chrome existente
      browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
      console.error("❌ Erro Crítico: Sessão de debug do Chrome não detectada.");
      console.error("   👉 Execute: chrome.exe --remote-debugging-port=9222");
      return;
  }
  
  const pages = await browser.pages();
  const page = pages[0]; 
  
  console.log('🔗 Conexão estabelecida. Iniciando varredura de dados...');

  // Scroll Suave para carregar elementos dinâmicos
  try {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 150;
            let ticks = 0;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                ticks++;
                if(totalHeight >= scrollHeight || ticks >= 80){ 
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
  } catch (e) {}

  // Extração de Dados (Agnóstica à plataforma)
  const rawData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1') || document.querySelector('.product-title-text');
        
        // Tentativa 1: Meta Tags (Mais confiável)
        const metaPrice = document.querySelector('meta[property="product:price:amount"]') || 
                          document.querySelector('meta[property="og:price:amount"]');
        
        let rawPrice = 0;
        
        if (metaPrice && metaPrice.content) {
            rawPrice = parseFloat(metaPrice.content);
        } else {
            // Tentativa 2: Seletores Visuais Comuns
            const priceEl = document.querySelector('[data-testid="product-price-value"]') || 
                            document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction') || 
                            document.querySelector('.price') || 
                            document.querySelector('.sale-price') ||
                            document.querySelector('.a-price-whole'); // Amazon
            
            if (priceEl) {
                const cleanText = priceEl.innerText.replace(/[^\d,.]/g, '').replace(',', '.');
                rawPrice = parseFloat(cleanText);
            }
        }

        const data = {
            title: titleEl ? titleEl.innerText.trim() : 'Hardware Importado Noname',
            originalPrice: rawPrice || 0,
            medias: []
        };

        // Coleta de Mídia via JSON-LD (Structured Data)
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(s => {
            try {
                const json = JSON.parse(s.innerText);
                if (json.image) {
                    const imgs = Array.isArray(json.image) ? json.image : [json.image];
                    data.medias.push(...imgs);
                }
                if (json.video && json.video.contentUrl) {
                      data.medias.push(json.video.contentUrl);
                }
            } catch(e){}
        });

        // Coleta de Mídia via Seletores de Galeria Comuns
        const gallerySelectors = [
            '.ui-pdp-gallery__figure img', 
            '.ui-pdp-image-gallery__figure img', 
            '#gallery img', 
            '.product-gallery img',
            '#imgTagWrapperId img', // Amazon
            '.a-dynamic-image' // Amazon
        ];
        gallerySelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(img => {
                // Prioriza imagens de alta resolução (data-zoom ou src direto)
                let src = img.getAttribute('data-zoom-image') || img.getAttribute('data-zoom') || img.getAttribute('src');
                if(src) data.medias.push(src);
            });
        });

        // Coleta de Vídeos HTML5
        document.querySelectorAll('video source, video').forEach(v => {
            const src = v.src || v.getAttribute('src');
            if (src && src.startsWith('http') && (src.includes('.mp4') || src.includes('.webm'))) {
                data.medias.push(src);
            }
        });

        return data;
    });

    console.log(`📦 Produto Detectado: ${rawData.title}`);

    // --- CÁLCULO ESTRATÉGICO DE PREÇO (+25% Margem IT) ---
    const costPrice = Number(rawData.originalPrice);
    // Informática tem margens mais apertadas, 25% é profissional e competitivo
    const salePrice = costPrice > 0 ? (costPrice * 1.25) : 0; 
    
    console.log(`💰 Custo Base: R$ ${costPrice.toFixed(2)}`);
    console.log(`📈 Preço Final (+25%): R$ ${salePrice.toFixed(2)}`);

    // Limpeza e Deduplicação de URLs de Mídia
    const uniqueMedias = [...new Set(rawData.medias.map(u => u ? u.split('?')[0] : null))]
        .filter(u => u && u.startsWith('http') && !u.match(/\.(svg|gif|webp)$/i));
    
    const uploadedAssets = [];
    // Limita a 10 mídias para não sobrecarregar o produto
    for (const url of uniqueMedias.slice(0, 10)) {
        const result = await uploadMediaToSanity(url);
        if (result) uploadedAssets.push(result);
    }

    const imageAssets = uploadedAssets.filter(a => a.type === 'image');
    const videoAssets = uploadedAssets.filter(a => a.type === 'file');

    if (imageAssets.length === 0) {
        console.error("❌ Erro: Falha crítica. Nenhuma imagem de produto recuperada.");
        browser.disconnect(); return;
    }

    const detectedBrand = getBrand(rawData.title);
    // SKU: Prefixo 'IT' para Informática Technology
    const skuCode = `IT-${Math.random().toString(36).substring(7).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    // Montagem do Documento Sanity (Schema Profissional)
    const doc = {
      _type: 'product',
      title: rawData.title,
      slug: { 
        _type: 'slug', 
        // Slug limpo e otimizado para SEO
        current: slugify(`${detectedBrand}-${rawData.title}`, { lower: true, strict: true, trim: true }).slice(0, 100)
      },
      isActive: true,
      lote: 'Estoque TI Global',
      productType: 'tech',
      brand: detectedBrand,
      warranty: '12 meses', // Padrão de mercado para hardware novo
      
      categories: [{ 
          _type: 'reference', 
          _ref: CATEGORY_ID, // Aponta para cat-informatica
          _key: generateKey() 
      }],
      
      price: parseFloat(salePrice.toFixed(2)),
      oldPrice: parseFloat(costPrice.toFixed(2)),

      images: imageAssets.map(item => ({ 
        _type: 'image', 
        _key: item.id, 
        asset: { _type: 'reference', _ref: item.id } 
      })),

      // Adiciona vídeo se disponível
      ...(videoAssets.length > 0 && {
        videoFile: {
            _type: 'file',
            asset: { _type: 'reference', _ref: videoAssets[0].id }
        }
      }),

      description: [ 
          { 
            _type: 'block', 
            _key: generateKey(),
            style: 'normal',
            children: [{ 
                _type: 'span', 
                _key: generateKey(),
                // Descrição genérica premium para TI
                text: 'Equipamento de alta performance, selecionado para garantir máxima eficiência, durabilidade e compatibilidade em setups profissionais ou gamers exigentes.' 
            }] 
          } 
      ],

      variants: [
        {
            _key: skuCode,
            variantName: 'Versão Global/Padrão',
            price: parseFloat(salePrice.toFixed(2)),
            oldPrice: parseFloat(costPrice.toFixed(2)),
            stock: 5, // Estoque inicial conservador
            variantImage: imageAssets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssets[0].id } } : null
        }
      ],
      
      // Specs Técnicas (Template Profissional - Ajustar no Painel)
      // Usamos termos genéricos pois a categoria é muito ampla
      techSpecs: { 
          processor: 'Especificação Principal (Ex: CPU/Sensor)', 
          screen: 'Resolução/Tamanho (se aplicável)', 
          battery: 'Alimentação/Energia', // Serve para fonte ou bateria
          os: 'Compatibilidade (Win/Mac/Linux)', 
          camera: null // Menos comum em hardware geral
      },
      
      // LOGÍSTICA PADRÃO PARA HARDWARE/NOTEBOOKS
      // Média segura para uma caixa de notebook ou componente médio
      logistics: { 
          weight: 2.5, // kg 
          width: 45,   // cm
          height: 10,  // cm
          length: 35   // cm
      },
      freeShipping: true // Frete grátis é comum em tickets médios de TI
    };

    try {
        const result = await client.create(doc);
        console.log(`✅ SUCESSO! Produto de Informática indexado.`);
        console.log(`📄 SKU: ${skuCode}`);
        console.log(`🏷️  Marca: ${detectedBrand} | Categoria: ${CATEGORY_ID}`);
    } catch (err) {
        console.error(`❌ Erro ao salvar no Sanity: ${err.message}`);
    }
    
    browser.disconnect();
    console.log('🔌 Sessão encerrada.');
}

startScraper();