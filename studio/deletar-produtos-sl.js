const { createClient } = require('@sanity/client');

// --- CONFIGURAÇÃO SANITY ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  // Mantive o token que você já estava utilizando nos outros scripts
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});

async function deletarProdutosSL() {
    console.log('🚀 Iniciando exclusão em massa de produtos SL...');

    // Busca apenas os IDs dos produtos onde a marca é SL
    const query = `*[_type == "product" && brand match "SL"]._id`;
    
    let produtosIds = [];
    try {
        produtosIds = await client.fetch(query);
        console.log(`📋 Encontrados ${produtosIds.length} produtos da marca SL para excluir.`);
    } catch (e) {
        console.error('❌ Erro ao buscar produtos:', e.message);
        return;
    }

    if (produtosIds.length === 0) {
        console.log('✅ Nenhum produto encontrado. O banco já está limpo.');
        process.exit(0);
    }

    // Itera sobre os IDs e deleta um por vez para evitar sobrecarga na API
    for (const [index, id] of produtosIds.entries()) {
        try {
            await client.delete(id);
            console.log(`   🗑️ [${index + 1}/${produtosIds.length}] Produto excluído com sucesso (ID: ${id})`);
            
            // Pausa de 200ms para evitar bater no limite da API do Sanity
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
            console.error(`   ❌ Erro ao excluir produto (ID: ${id}):`, err.message);
        }
    }

    console.log('\n🏁 Limpeza finalizada!');
    process.exit(0);
}

deletarProdutosSL();