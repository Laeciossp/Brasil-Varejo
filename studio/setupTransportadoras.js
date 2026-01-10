// studio/setupTransportadoras.js
import { createClient } from '@sanity/client'

// --- CONFIGURAÇÃO ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'skEcUJ41lyHwOuSuRVnjiBKUnsV0Gnn7SQ0i2ZNKC4LqB1KkYo2vciiOrsjqmyUcvn8vLMTxp019hJRmR11iPV76mXVH7kK8PDLvxxjHHD4yw7R8eHfpNPkKcHruaVytVs58OaG6hjxTcXHSBpz0Fr2DTPck19F7oCo4NCku1o5VLi2f4wqY', // <--- COLOQUE SEU TOKEN AQUI (O MESMO DE ANTES)
  useCdn: false,
})

const transportadorasPadrao = [
  {
    _key: 'correios-sedex',
    isActive: true,
    name: 'Correios',
    serviceName: 'SEDEX (Expresso)',
    logoUrl: 'https://logodownload.org/wp-content/uploads/2014/05/correios-logo-0.png',
    trackingUrlTemplate: 'https://rastreamento.correios.com.br/app/index.php?objeto={CODE}',
    additionalPrice: 0,
    additionalDays: 0
  },
  {
    _key: 'correios-pac',
    isActive: true,
    name: 'Correios',
    serviceName: 'PAC (Econômico)',
    logoUrl: 'https://logodownload.org/wp-content/uploads/2014/05/correios-logo-0.png',
    trackingUrlTemplate: 'https://rastreamento.correios.com.br/app/index.php?objeto={CODE}',
    additionalPrice: 0,
    additionalDays: 0
  },
  {
    _key: 'jadlog',
    isActive: true,
    name: 'Jadlog',
    serviceName: '.Package (E-commerce)',
    logoUrl: 'https://logodownload.org/wp-content/uploads/2017/04/jadlog-logo.png',
    trackingUrlTemplate: 'https://www.jadlog.com.br/tracking?cod={CODE}',
    additionalPrice: 2.50,
    additionalDays: 1
  },
  {
    _key: 'azul',
    isActive: false, // Vem desativado por padrão
    name: 'Azul Cargo',
    serviceName: 'Azul Express (Aéreo)',
    logoUrl: 'https://logodownload.org/wp-content/uploads/2014/06/azul-cargo-express-logo.png',
    trackingUrlTemplate: 'https://www.azulcargoexpress.com.br/Rastreio/Rastreio?cod={CODE}',
    additionalPrice: 15.00,
    additionalDays: -2 // Chega antes
  },
  {
    _key: 'loggi',
    isActive: false,
    name: 'Loggi',
    serviceName: 'Loggi Express',
    logoUrl: 'https://assets.website-files.com/610c1440632833077e69f70d/610c1440632833503269f73d_loggi-logo.svg',
    trackingUrlTemplate: 'https://www.loggi.com/rastreador?cod={CODE}',
    additionalPrice: 0,
    additionalDays: 0
  },
  {
    _key: 'buslog',
    isActive: false,
    name: 'Buslog',
    serviceName: 'Rodoviário',
    logoUrl: 'https://logodownload.org/wp-content/uploads/2019/09/buslog-logo.png',
    trackingUrlTemplate: 'https://buslog.com.br/rastreamento?cod={CODE}',
    additionalPrice: 0,
    additionalDays: 1
  }
];

async function setup() {
  console.log('🚚 Configurando transportadoras profissionais...');

  try {
    // Cria ou atualiza o documento de configuração
    await client.createOrReplace({
      _id: 'config-carriers',
      _type: 'carrierConfig',
      title: 'Gerenciador de Transportadoras',
      carriers: transportadorasPadrao
    });

    console.log('✅ Sucesso! Agora vá no Painel > Config. Transportadoras e ative o que quiser.');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

setup();