import { createClient } from '@sanity/client';

const TOKEN_SANITY = 'sk3uozLq4sMLk4k5wAMY9QVLQHVHYEqNJzpF5t66U3jbmfW5BcdqI7OKt8H2KQ7WyjGoybxYMukfqtpSoRNhofZm0Ou7jdf8TMer0qiwasLRQ9HUtelf1m9jhE7sHVJgaT7xdQbT6TR1hMSFtyNnwZfVbaMxoP1qE9oxzqDb6rYRZfkLid2d';

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  token: TOKEN_SANITY,
  apiVersion: '2024-03-19'
});

async function desativarProdutosSN() {
  try {
    console.log("🚀 Buscando produtos da marca SN para desativação...");
    
    const query = '*[_type == "product" && brand == "SN" && (active == true || isActive == true)]';
    const produtos = await client.fetch(query);

    if (produtos.length === 0) {
      console.log("✨ Nenhum produto ativo da marca SN encontrado.");
      return;
    }

    console.log(`📦 Encontrados ${produtos.length} produtos. Processando...`);

    const transaction = client.transaction();
    
    produtos.forEach(p => {
      transaction.patch(p._id, {
        set: { 
          active: false,
          isActive: false, 
          status: "inactive" 
        }
      });
    });

    await transaction.commit();
    console.log(`✅ SUCESSO! ${produtos.length} produtos desativados.`);
  } catch (error) {
    console.error("❌ Erro fatal na execução:", error.message);
  }
}

desativarProdutosSN();