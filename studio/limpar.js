const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});

async function nuke() {
  console.log("🗑️ Apagando produtos corrompidos...");
  // Busca todos os produtos da Quintess
  const query = '*[_type == "product" && slug.current match "quintess*"]';
  const products = await client.fetch(query);
  
  if (products.length === 0) {
      console.log("✅ Nada para apagar. Tudo limpo.");
      return;
  }

  for (const p of products) {
    await client.delete(p._id);
    console.log(`🔥 Deletado: ${p.title}`);
  }
  console.log("✨ Limpeza concluída! Agora pode rodar o importador V25.");
}

nuke();