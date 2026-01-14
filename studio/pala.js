const { createClient } = require('@sanity/client');
const crypto = require('crypto');

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'skqLYvuUBBlgpeENYdVezGXq28cpZUWQf3tfy4N1rCZ336Q4sqEBDYPdV1DXKqMB1SKyzgoa0cU135LAgzHsqVxEj1azOYKnHoA6YAlF1MiZmbpNz19ZSHcboK9kkVrpeptiu5dEq9ZYT3YtNS3Y76vWtgeJfop3eUI2IXkIBMJaoJNnpceI', 
  useCdn: false,
});

const genKey = () => crypto.randomBytes(6).toString('hex');

// DADOS COPIADOS DA SUA LISTA (LOTE 19)
const products = [
  { 
    title: "Smartphone Motorola Moto G06 4G 256GB - Bege", 
    brand: "Motorola", 
    originalPrice: 887.67, 
    ean: "7892597356005",
    specs: { screen: "6.9\"", camera: "50MP", storage: "256GB", connection: "4G" }, 
    description: "Tela gigante de 6.9\" e muito espaço. O Moto G06 Bege de 256GB é a escolha para quem consome muita mídia." 
  },
  { 
    title: "Celular Samsung Galaxy A06 128GB - Branco", 
    brand: "Samsung", 
    originalPrice: 776.67, 
    ean: "7892509138015",
    specs: { screen: "6.7\"", camera: "50MP", storage: "128GB", processor: "Octa-Core" }, 
    description: "O básico eficiente. Galaxy A06 Branco entrega tela grande e câmera de 50MP para o dia a dia." 
  },
  { 
    title: "Smartphone Samsung Galaxy A26 5G 256GB - Verde", 
    brand: "Samsung", 
    originalPrice: 1665.56, 
    ean: "7892509138022",
    specs: { screen: "6.7\"", camera: "Tripla 50MP", storage: "256GB", connection: "5G" }, 
    description: "Conectividade 5G e cor Verde. O Galaxy A26 de 256GB é o intermediário moderno da Samsung." 
  },
  { 
    title: "Smartphone Motorola Moto G55 5G 256GB - Rosa", 
    brand: "Motorola", 
    originalPrice: 1499.00, 
    ean: "7892597356036",
    specs: { screen: "6.5\" Superbrilho", ram: "8GB + 8GB Boost", camera: "50MP AI", connection: "5G" }, 
    description: "Rosa vibrante com Superbrilho. O Moto G55 oferece 16GB de RAM (Boost) e desempenho ágil." 
  },
  { 
    title: "Smartphone Motorola Moto G06 4G 256GB - Verde", 
    brand: "Motorola", 
    originalPrice: 887.67, 
    ean: "7892597356043",
    specs: { screen: "6.9\"", camera: "50MP", storage: "256GB", connection: "4G" }, 
    description: "Mais armazenamento na cor Verde. O Moto G06 de 256GB garante espaço para todas as suas fotos." 
  },
  { 
    title: "Smartphone OPPO A60 4G 256GB - Vermelho", 
    brand: "OPPO", 
    originalPrice: 1498.78, 
    ean: "6932169300102",
    specs: { screen: "6.67\" 90Hz", ram: "8GB", storage: "256GB", connection: "4G" }, 
    description: "Vermelho intenso. O OPPO A60 combina 8GB de RAM e 256GB de espaço com design elegante." 
  },
  { 
    title: "Smartphone Motorola Moto G04s 128GB - Coral", 
    brand: "Motorola", 
    originalPrice: 618.89, 
    ean: "7892597356067",
    specs: { ram: "4GB + 4GB Boost", camera: "16MP AI", storage: "128GB", features: "Sensor FPS Lateral" }, 
    description: "O custo-benefício Coral. Moto G04s é perfeito para quem busca o essencial com segurança." 
  },
  { 
    title: "Smartphone Xiaomi Redmi 14C 256GB - Preto", 
    brand: "Xiaomi", 
    originalPrice: 1373.33, 
    ean: "6941812765003",
    specs: { screen: "6.8\"", processor: "Helio G81 Ultra", ram: "4GB+4GB", camera: "Dupla 50MP" }, 
    description: "Tela imersiva de 6.8\". O Redmi 14C Preto traz o novo processador Helio G81 Ultra e muito espaço." 
  },
  { 
    title: "Smartphone OPPO A60 4G 256GB - Lilás", 
    brand: "OPPO", 
    originalPrice: 1498.78, 
    ean: "6932169300119",
    specs: { screen: "6.67\" 90Hz", ram: "8GB", storage: "256GB", connection: "4G" }, 
    description: "Delicadeza em Lilás. OPPO A60 oferece performance fluida com 90Hz e 8GB de RAM." 
  },
  { 
    title: "Smartphone Motorola Moto G34 5G 128GB - Preto", 
    brand: "Motorola", 
    originalPrice: 832.22, 
    ean: "7892597356098",
    specs: { ram: "4GB + 4GB Boost", camera: "16MP AI", storage: "128GB", connection: "5G" }, 
    description: "5G acessível. O Moto G34 Preto entrega velocidade de conexão e recursos de IA." 
  },
  { 
    title: "Smartphone Xiaomi Redmi 14C 256GB - Azul", 
    brand: "Xiaomi", 
    originalPrice: 1373.33, 
    ean: "6941812765010",
    specs: { screen: "6.8\"", processor: "Helio G81 Ultra", ram: "4GB+4GB", camera: "Dupla 50MP" }, 
    description: "Visual moderno em Azul. Redmi 14C é robusto, com câmera de 50MP e bateria durável." 
  },
  { 
    title: "Smartphone Samsung Galaxy A17 5G 128GB - Preto", 
    brand: "Samsung", 
    originalPrice: 1325.56, 
    ean: "7892509138121",
    specs: { screen: "6.7\" Super AMOLED", camera: "Tripla 50MP IA Gemini", storage: "128GB", connection: "5G" }, 
    description: "IA Gemini integrada. Galaxy A17 5G Preto de 128GB é o futuro da tecnologia acessível." 
  },
  { 
    title: "Smartphone OPPO A5 5G 256GB - Branco", 
    brand: "OPPO", 
    originalPrice: 2068.89, 
    ean: "6932169300133",
    specs: { screen: "6.67\"", ram: "8GB", camera: "50MP", storage: "256GB" }, 
    description: "Performance 5G em Branco. O OPPO A5 combina elegância e potência com 8GB de RAM." 
  },
  { 
    title: "Celular Samsung Galaxy A17 4G 128GB - Cinza", 
    brand: "Samsung", 
    originalPrice: 1204.44, 
    ean: "7892509138145",
    specs: { screen: "6.7\" Super AMOLED", camera: "Tripla 50MP", storage: "128GB", connection: "4G" }, 
    description: "Tela Super AMOLED incrível. O Galaxy A17 4G Cinza oferece cores vivas e nitidez superior." 
  },
  { 
    title: "Smartphone Motorola Moto G75 5G 256GB - Cinza", 
    brand: "Motorola", 
    originalPrice: 1999.00, 
    ean: "7892597356159",
    specs: { features: "Ultrarresistência Militar", camera: "50MP Sony Lytia 600", ram: "8GB + 8GB Boost" }, 
    description: "Ultrarresistência Militar. O Moto G75 Cinza é feito para durar, com câmera Sony avançada." 
  },
  { 
    title: "Smartphone Samsung Galaxy A17 5G 128GB - Cinza", 
    brand: "Samsung", 
    originalPrice: 1325.56, 
    ean: "7892509138169",
    specs: { screen: "6.7\" Super AMOLED", camera: "Tripla 50MP IA Gemini", storage: "128GB", connection: "5G" }, 
    description: "Versão Cinza com IA Gemini. O Galaxy A17 5G une design sóbrio e inteligência artificial." 
  },
  { 
    title: "Smartphone OPPO A5 5G 256GB - Verde", 
    brand: "OPPO", 
    originalPrice: 2068.89, 
    ean: "6932169300171",
    specs: { screen: "6.67\"", ram: "8GB", camera: "50MP", storage: "256GB" }, 
    description: "Estilo único em Verde. O OPPO A5 5G oferece muito armazenamento e câmeras de alta resolução." 
  },
  { 
    title: "Smartphone Motorola Moto G35 5G 128GB - Verde", 
    brand: "Motorola", 
    originalPrice: 1164.44, 
    ean: "7892597356188",
    specs: { screen: "6.7\" Superbrilho", ram: "4GB + 8GB Boost", camera: "50MP AI", connection: "NFC" }, 
    description: "Tela Superbrilho na cor Verde. O Moto G35 5G é perfeito para uso ao ar livre com NFC." 
  },
  { 
    title: "Smartphone Motorola Moto G84 5G 256GB - Azul", 
    brand: "Motorola", 
    originalPrice: 1376.67, 
    ean: "7892597356195",
    specs: { screen: "pOLED", camera: "50MP Ultra-Pixel", ram: "8GB + 8GB Boost", connection: "5G" }, 
    description: "Sucesso de vendas Azul. O Moto G84 com tela pOLED continua sendo uma das melhores opções do mercado." 
  },
  { 
    title: "Smartphone Samsung Galaxy A17 5G 128GB - Azul", 
    brand: "Samsung", 
    originalPrice: 1325.56, 
    ean: "7892509138201",
    specs: { screen: "6.7\" Super AMOLED", camera: "Tripla 50MP IA Gemini", storage: "128GB", connection: "5G" }, 
    description: "Galaxy A17 5G Azul. A combinação perfeita de tela AMOLED, 5G e inteligência artificial Gemini." 
  }
];

async function importData() {
  for (const prod of products) {
    const finalPrice = prod.originalPrice * 1.25; 
    const slug = prod.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const doc = {
      _id: `prod-${slug}`,
      _type: 'product',
      isActive: true,
      lote: "Lote 19 - Manual",
      title: prod.title,
      brand: prod.brand,
      slug: { _type: 'slug', current: slug },
      productType: 'tech',
      price: finalPrice,
      warranty: "12 meses pelo fabricante",
      techSpecs: prod.specs,
      description: [
        {
          _key: genKey(),
          _type: 'block',
          children: [{ _key: genKey(), _type: 'span', text: prod.description }],
          style: 'normal',
          markDefs: []
        }
      ],
      variants: [
        {
            _key: genKey(),
            variantName: "Padrão",
            price: finalPrice,
            ean: prod.ean, 
            stock: 10
        }
      ],
      customSpecs: [{ _key: genKey(), label: "Homologação Anatel", value: "Homologado" }],
      logistics: { weight: 0.5, width: 11, height: 6, length: 18 }
    };

    try {
      await client.createOrReplace(doc);
      console.log(`✅ [LOTE 19 MANUAL] ${prod.title} [R$ ${finalPrice.toFixed(2)}]`);
    } catch (err) {
      console.error(`❌ Erro em ${prod.title}:`, err.message);
    }
  }
}

importData();