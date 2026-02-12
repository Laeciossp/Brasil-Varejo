const { createClient } = require('@sanity/client');

// Configuração (Mesmas credenciais dos seus outros scripts)
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

async function reativarTudoSN() {
  console.log("🚀 Iniciando Reativação Forçada da Marca SN...");

  // Busca apenas os produtos SN que estão inativos
  const query = `*[_type == "product" && brand == "SN" && isActive != true] { _id, title }`;
  
  try {
      const products = await client.fetch(query);
      console.log(`📋 Encontrados ${products.length} produtos SN inativos.`);

      if (products.length === 0) {
          console.log("✅ Todos os produtos SN já estão ativos! Nada a fazer.");
          return;
      }

      console.log("⚡ Reativando um por um...");

      for (const [index, product] of products.entries()) {
          try {
              // Apenas vira a chave para TRUE
              await client.patch(product._id)
                  .set({ isActive: true })
                  .commit();
              
              console.log(`   [${index + 1}/${products.length}] ✅ Ativado: ${product.title}`);
          } catch (err) {
              console.error(`   ❌ Erro no produto ${product._id}: ${err.message}`);
          }
      }

      console.log("\n🏁 REATIVAÇÃO CONCLUÍDA!");
      console.log("⚠️ ATENÇÃO: Agora rode o 'atualizador-shein.js' para recuperar os tamanhos (P, M, G) que foram apagados.");

  } catch (error) {
      console.error("Erro fatal na busca:", error.message);
  }
}

reativarTudoSN();