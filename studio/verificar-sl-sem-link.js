const { createClient } = require('@sanity/client');

// --- CONFIGURAÇÃO ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});

async function buscarSemLink() {
    console.log("🕵️  Procurando produtos SL sem link de fornecedor (sourceUrl)...");

    // Busca produtos SL que NÃO tem o campo sourceUrl preenchido
    const query = `*[_type == "product" && brand == "SL" && !defined(sourceUrl)]{
        _id,
        title,
        isActive
    }`;

    try {
        const produtos = await client.fetch(query);

        if (produtos.length === 0) {
            console.log("✅ Tudo certo! Todos os produtos SL têm link de fornecedor.");
        } else {
            console.log(`⚠️  Encontrados ${produtos.length} produtos SL sem link (O Robô não atualiza estes):`);
            produtos.forEach(p => {
                const status = p.isActive ? "🟢 Ativo" : "🔴 Inativo";
                console.log(`   - [${status}] ${p.title}`);
            });
            console.log("\n💡 Dica: Copie o ID ou Nome e adicione o 'sourceUrl' no Sanity para o robô funcionar neles.");
        }

    } catch (err) {
        console.error("❌ Erro:", err.message);
    }
}

buscarSemLink();