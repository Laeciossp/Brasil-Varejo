const { createClient } = require('@sanity/client');

// Configuração (mesma do seu importador)
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false, // false para garantir dados frescos
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});

// ID da Categoria CALÇA (retirado do seu mapa fixo)
const ID_CATEGORIA_CALCA = '0b5f498b-3f74-4818-9f16-604b11e26f05';

async function deletarCalcasSL() {
  console.log('🔍 Buscando calças da marca SL para exclusão...');

  // QUERY: Produtos da marca SL que referenciam a categoria CALÇA
  const query = `*[_type == "product" && brand == "SL" && references($catId)] { _id, title }`;
  const params = { catId: ID_CATEGORIA_CALCA };

  try {
    const produtos = await client.fetch(query, params);

    if (produtos.length === 0) {
      console.log('✅ Nenhuma calça da marca SL encontrada para deletar.');
      return;
    }

    console.log(`⚠️  Encontrados ${produtos.length} produtos para deletar:`);
    produtos.forEach(p => console.log(`   - [${p._id}] ${p.title}`));

    console.log('\n🗑️  Iniciando exclusão em massa...');

    // Cria uma transação para deletar tudo de uma vez
    let transaction = client.transaction();
    
    produtos.forEach(p => {
      transaction.delete(p._id);
    });

    await transaction.commit();
    console.log(`🔥 SUCESSO! ${produtos.length} produtos foram excluídos.`);

  } catch (err) {
    console.error('❌ Erro ao deletar:', err.message);
  }
}

deletarCalcasSL();