const { createClient } = require('@sanity/client');

// --- CONFIGURAÇÃO SANITY ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});

async function deletarPedidosPagos() {
    console.log('🚀 Iniciando exclusão de pedidos de teste (Status: Pago)...');

    // =========================================================================
    // ⚠️ ATENÇÃO AQUI: Ajuste o _type e o campo de status conforme o seu banco.
    // Se a sua tabela se chama "pedido", mude _type == "order" para "pedido".
    // Se o status estiver em maiúsculo, mude "pago" para "PAGO".
    // =========================================================================
    const query = `*[_type == "order" && status == "pago"]._id`;
    // const query = `*[_type == "pedido" && status == "PAGO"]._id`; // Exemplo alternativo
    
    let pedidosIds = [];
    try {
        pedidosIds = await client.fetch(query);
        console.log(`📋 Encontrados ${pedidosIds.length} pedidos com status "pago" para excluir.`);
    } catch (e) {
        console.error('❌ Erro ao buscar pedidos:', e.message);
        return;
    }

    if (pedidosIds.length === 0) {
        console.log('✅ Nenhum pedido "pago" encontrado. O banco já está limpo.');
        process.exit(0);
    }

    // Itera sobre os IDs e deleta um por vez (Evita limite de taxa da API)
    for (const [index, id] of pedidosIds.entries()) {
        try {
            await client.delete(id);
            console.log(`   🗑️ [${index + 1}/${pedidosIds.length}] Pedido excluído com sucesso (ID: ${id})`);
            
            // Pausa de 200ms para segurança da API do Sanity
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
            console.error(`   ❌ Erro ao excluir pedido (ID: ${id}):`, err.message);
        }
    }

    console.log('\n🏁 Limpeza de pedidos finalizada!');
    process.exit(0);
}

deletarPedidosPagos();