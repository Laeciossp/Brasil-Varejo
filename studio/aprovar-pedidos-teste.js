const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  // Usando o token que estava nos seus outros scripts
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

async function aprovarTudo() {
  console.log("🚀 INICIANDO APROVAÇÃO EM MASSA DE TODOS OS PEDIDOS...");

  // Busca TODOS os pedidos, sem filtro de e-mail
  const query = `*[_type == "order"] { _id, _createdAt, status, customer, totalPrice }`;

  try {
    const pedidos = await client.fetch(query);

    if (pedidos.length === 0) {
      console.log("❌ Nenhum pedido encontrado no sistema.");
      return;
    }

    console.log(`📋 Encontrados ${pedidos.length} pedidos no total.`);

    for (const [index, pedido] of pedidos.entries()) {
      const nomeCliente = pedido.customer?.name || "Desconhecido";
      console.log(`   [${index + 1}/${pedidos.length}] 🔄 Aprovando pedido de ${nomeCliente} (R$ ${pedido.totalPrice})...`);
      
      await client.patch(pedido._id)
        .set({ 
            status: 'paid',         // Status visual
            paymentStatus: 'paid',  // Status lógico
            isPaid: true            // Booleano de controle
        })
        .commit();
        
      console.log(`      ✅ Feito!`);
    }

    console.log("\n🏁 TODOS OS PEDIDOS FORAM MARCADOS COMO PAGOS!");

  } catch (error) {
    console.error("Erro fatal:", error.message);
  }
}

aprovarTudo();