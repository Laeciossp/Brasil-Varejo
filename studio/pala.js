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

const products = [
  { title: "Apple iPhone 15 128GB - Azul", brand: "Apple", originalPrice: 4199.00, anatel: "13512-23-01068", specs: { processor: "A16 Bionic", screen: "6.1\" Super Retina XDR", camera: "48MP Fusion" }, description: "O novo iPhone 15 na cor Azul traz a Dynamic Island e a versatilidade do USB-C. Com vidro colorido por infusão e câmera de 48MP, ele é o smartphone mais desejado do varejo nacional com frete Full." },
  { title: "Samsung Galaxy S24 Ultra 5G 512GB - Titanium Violet", brand: "Samsung", originalPrice: 6299.00, anatel: "14502-24-00953", specs: { processor: "Snapdragon 8 Gen 3", screen: "6.8\" AMOLED 2X QHD+", camera: "200MP + 50MP + 12MP + 10MP" }, description: "Exclusividade na cor Titanium Violet. Inteligência artificial avançada, zoom de 100x e a S Pen integrada, agora com 512GB de espaço e o melhor preço de varejo com frete rápido." },
  { title: "Motorola Edge 50 Pro 5G 256GB - Black Beauty", brand: "Motorola", originalPrice: 2799.00, anatel: "03032-24-00330", specs: { processor: "Snapdragon 7 Gen 3", screen: "6.7\" pOLED 144Hz", camera: "50MP AI OIS" }, description: "Elegância absoluta em preto com cores validadas pela Pantone. O Edge 50 Pro oferece o carregamento TurboPower de 125W, atingindo 100% em minutos, pronto para a agilidade da Pala Store." },
  { title: "Xiaomi Redmi Note 13 Pro+ 5G 512GB - Midnight Black", brand: "Xiaomi", originalPrice: 2449.00, anatel: "13501-23-02120", specs: { processor: "Dimensity 7200-Ultra", screen: "6.67\" AMOLED Curva 1.5K", camera: "200MP OIS" }, description: "O Redmi mais sofisticado já feito. Com 512GB de armazenamento e carregamento HyperCharge de 120W, ele atinge 100% em 19 minutos. O sensor de 200MP traz a experiência premium com entrega amanhã." },
  { title: "Apple iPhone 14 Plus 128GB - Estelar", brand: "Apple", originalPrice: 3899.00, anatel: "10682-22-01068", specs: { processor: "A15 Bionic", screen: "6.7\" Super Retina XDR", camera: "Dupla 12MP" }, description: "A tela grande que você deseja com a bateria mais duradoura da categoria. O iPhone 14 Plus une o prestígio da Apple à imersão total para jogos e séries, garantido no frete Full." },
  { title: "Samsung Galaxy A35 5G 256GB - Awesome Navy", brand: "Samsung", originalPrice: 1699.00, anatel: "21650-23-00953", specs: { processor: "Exynos 1380", screen: "6.6\" Super AMOLED 120Hz", camera: "50MP OIS" }, description: "O dobro de espaço para suas memórias. O Galaxy A35 5G oferece resistência à água IP67 e uma tela Super AMOLED vibrante para a melhor experiência de consumo de mídia no varejo." },
  { title: "Xiaomi Poco X6 Pro 5G 512GB - Yellow", brand: "Xiaomi", originalPrice: 2249.00, anatel: "04512-23-05678", specs: { processor: "Dimensity 8300-Ultra", screen: "6.67\" Flow AMOLED", camera: "64MP OIS" }, description: "A fera da performance em couro vegano amarelo. O Poco X6 Pro entrega velocidade bruta para games pesados e multitarefa sem esforço, sendo um destaque absoluto do frete rápido." },
  { title: "Motorola Moto G54 5G 256GB - Azul", brand: "Motorola", originalPrice: 1149.00, anatel: "11713-23-00330", specs: { processor: "Dimensity 7020", screen: "6.5\" 120Hz", camera: "50MP OIS" }, description: "Conectividade 5G e fluidez de 120Hz. O Moto G54 Azul é o equilíbrio perfeito entre custo e tecnologia, com som Dolby Atmos e estabilização óptica na câmera." },
  { title: "Apple iPhone 13 128GB - Meia-noite", brand: "Apple", originalPrice: 3399.00, anatel: "11068-21-01068", specs: { processor: "A15 Bionic", screen: "6.1\" Super Retina XDR", camera: "Dupla 12MP" }, description: "O clássico que continua no topo. Performance rápida, fotos com Modo Cinema e a segurança do ecossistema Apple em um design que cabe na palma da mão com entrega em 24h." },
  { title: "Samsung Galaxy A15 4G 128GB - Prata", brand: "Samsung", originalPrice: 899.00, anatel: "21650-23-00953", specs: { processor: "Helio G99", screen: "6.5\" Super AMOLED", camera: "50MP" }, description: "Tela Super AMOLED por um preço acessível. O Galaxy A15 Prata oferece cores vivas e bateria de 5000mAh, sendo a escolha inteligente para o dia a dia no varejo nacional." },
  { title: "Xiaomi Redmi 13C 256GB - Clover Green", brand: "Xiaomi", originalPrice: 949.00, anatel: "13867-23-14501", specs: { processor: "Helio G85", screen: "6.74\" 90Hz", camera: "50MP AI Triple" }, description: "Visual refrescante e 256GB de espaço. O Redmi 13C Clover Green garante fluidez para seus apps favoritos e espaço de sobra para todas as suas fotos com frete Full." },
  { title: "Motorola Moto G24 Power 256GB - Azul", brand: "Motorola", originalPrice: 999.00, anatel: "06032-24-00330", specs: { processor: "Helio G85", screen: "6.6\" 90Hz", battery: "6000 mAh" }, description: "Bateria colossal de 6000mAh para não te deixar na mão. Com 256GB de armazenamento, o Moto G24 Power é o smartphone incansável da Pala Store." },
  { title: "Apple iPhone 15 Pro 128GB - Titânio Natural", brand: "Apple", originalPrice: 6599.00, anatel: "13512-23-01068", specs: { processor: "A17 Pro", screen: "6.1\" Super Retina XDR", camera: "48MP Fusion" }, description: "Forjado em titânio aeroespacial. O iPhone 15 Pro de 128GB traz o chip A17 Pro e o novo Botão de Ação, unindo leveza e performance extrema com entrega para amanhã." },
  { title: "Samsung Galaxy S23 FE 5G 128GB - Grafite", brand: "Samsung", originalPrice: 2399.00, anatel: "14502-23-00953", specs: { processor: "Exynos 2200", screen: "6.4\" Dynamic AMOLED 2X", camera: "50MP OIS + 12MP + 8MP" }, description: "O design da linha S com recursos premium acessíveis. Nightography para fotos noturnas impecáveis e a segurança do frete rápido para a sua Pala Store." }
];

async function importData() {
  for (const prod of products) {
    const finalPrice = prod.originalPrice * 1.25; 
    const slug = prod.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const doc = {
      _id: `prod-${slug}`,
      _type: 'product',
      isActive: true,
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
      customSpecs: [{ _key: genKey(), label: "Homologação Anatel", value: prod.anatel }],
      logistics: { weight: 0.5, width: 11, height: 6, length: 18 }
    };

    try {
      await client.createOrReplace(doc);
      console.log(`✅ [PALASTORE SUPER LOTE] ${prod.title} [R$ ${finalPrice.toFixed(2)}]`);
    } catch (err) {
      console.error(`❌ Erro em ${prod.title}:`, err.message);
    }
  }
}

importData();