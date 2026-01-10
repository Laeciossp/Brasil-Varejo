import { createClient } from '@sanity/client'

// --- CONFIGURAÇÃO ---
// Configure aqui com o seu Token de Escrita (Editor)
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'skEcUJ41lyHwOuSuRVnjiBKUnsV0Gnn7SQ0i2ZNKC4LqB1KkYo2vciiOrsjqmyUcvn8vLMTxp019hJRmR11iPV76mXVH7kK8PDLvxxjHHD4yw7R8eHfpNPkKcHruaVytVs58OaG6hjxTcXHSBpz0Fr2DTPck19F7oCo4NCku1o5VLi2f4wqY', // <--- Verifique se o token ainda está aqui!
  useCdn: false,
})

const categorias = [
  // --- RAÍZES (NÍVEL 1) ---
  { title: 'Veículos', isRoot: true },
  { title: 'Supermercado', isRoot: true },
  { title: 'Casa e Móveis', isRoot: true },
  { title: 'Eletrodomésticos', isRoot: true },
  { title: 'Esportes e Fitness', isRoot: true },
  { title: 'Ferramentas', isRoot: true },
  { title: 'Construção', isRoot: true },
  { title: 'Indústria e Comércio', isRoot: true },
  { title: 'Saúde', isRoot: true },
  { title: 'Acessórios para Veículos', isRoot: true },
  { title: 'Beleza e Cuidado Pessoal', isRoot: true },
  { title: 'Moda', isRoot: true },
  { title: 'Bebês', isRoot: true },
  { title: 'Brinquedos', isRoot: true },
  { title: 'Imóveis', isRoot: true },
  { title: 'Internacional', isRoot: true },
  { title: 'Produtos Sustentaveis', isRoot: true },
  { title: 'Tecnologia', isRoot: true, _id: 'cat-tec' }, 

  // --- FILHOS DE TECNOLOGIA (NÍVEL 2) ---
  { title: 'Celulares e Telefones', parentId: 'cat-tec', _id: 'cat-cel' },
  { title: 'Informática', parentId: 'cat-tec', _id: 'cat-inf' },
  { title: 'Câmeras e Acessórios', parentId: 'cat-tec', _id: 'cat-cam' },
  { title: 'Eletrônicos, Áudio e Vídeo', parentId: 'cat-tec', _id: 'cat-eletro' },
  { title: 'Games', parentId: 'cat-tec', _id: 'cat-games' },
  { title: 'Televisores', parentId: 'cat-tec' },

  // --- NETOS (NÍVEL 3) ---
  // Celulares
  { title: 'Acessórios para Celulares', parentId: 'cat-cel' },
  { title: 'Peças para Celular', parentId: 'cat-cel' },

  // Informática
  { title: 'Componentes para PC', parentId: 'cat-inf' },
  { title: 'Impressão', parentId: 'cat-inf' },
  { title: 'Acessórios para Notebook', parentId: 'cat-inf' },
  { title: 'Conectividade e Redes', parentId: 'cat-inf' },
  { title: 'Software', parentId: 'cat-inf' },
  { title: 'Computadores', parentId: 'cat-inf' },
  { title: 'Tablets e Acessórios', parentId: 'cat-inf' },

  // Câmeras
  { title: 'Acessórios para Câmeras', parentId: 'cat-cam' },
  { title: 'Câmeras', parentId: 'cat-cam' },
  { title: 'Filmadoras', parentId: 'cat-cam' },

  // Eletrônicos
  { title: 'Acessórios para Áudio e Vídeo', parentId: 'cat-eletro' },
  { title: 'Áudio Portátil e Acessórios', parentId: 'cat-eletro' },
  { title: 'Componentes Eletrônicos', parentId: 'cat-eletro' },
  { title: 'Equipamento para DJs', parentId: 'cat-eletro' },
  { title: 'Som Automotivo', parentId: 'cat-eletro' },
  { title: 'Drones e Acessórios', parentId: 'cat-eletro' },
  { title: 'Acessórios para TV', parentId: 'cat-eletro' },
  { title: 'Fones de Ouvido', parentId: 'cat-eletro' },
  { title: 'Áudio', parentId: 'cat-eletro' },
  { title: 'Projetores e Telas', parentId: 'cat-eletro' },

  // Games
  { title: 'Video Games', parentId: 'cat-games' },
  { title: 'Fliperamas e Arcade', parentId: 'cat-games' },
  { title: 'Digitais', parentId: 'cat-games' },
];

async function importar() {
  console.log('🔄 Iniciando importação com correção de IDs...');

  for (const cat of categorias) {
    // GERA O SLUG
    const slugCurrent = cat.title.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');

    // GERA O ID AUTOMÁTICO SE NÃO EXISTIR
    // Se já tiver ID manual (ex: cat-tec), usa ele. Se não, cria 'cat-veiculos', etc.
    const docId = cat._id || `cat-${slugCurrent}`;

    const doc = {
      _type: 'category',
      _id: docId, 
      title: cat.title,
      slug: { current: slugCurrent },
      isRoot: cat.isRoot || false,
      isActive: true,
    };

    if (cat.parentId) {
      doc.parent = {
        _type: 'reference',
        _ref: cat.parentId
      };
    }

    try {
      await client.createOrReplace(doc);
      console.log(`✅ Criado/Atualizado: ${cat.title} [ID: ${docId}]`);
    } catch (err) {
      console.error(`❌ Erro ao criar ${cat.title}:`, err.message);
    }
  }
}

importar();