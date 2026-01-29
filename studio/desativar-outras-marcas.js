const { createClient } = require('@sanity/client');

// --- CONFIGURAÇÃO ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});

const MARCA_PERMITIDA = 'SL'; // A única que vai sobreviver

// Lista de Categorias que serão LIMPAS (se não for SL, tchau!)
const CATEGORIAS_ALVO = [
    'Moda Feminina',
    'Bermudas e Shorts',
    'Blusas',
    'Calçados',
    'Calças',
    'Camisas',
    'Conjuntos Calças',
    'Conjuntos Saias',
    'Conjuntos Shorts',
    'Macacão',
    'Saias',
    'Vestidos'
];

async function limparOutrasMarcas() {
    console.log(`🚀 Iniciando Limpeza Cirúrgica...`);
    console.log(`🛡️  Marca Protegida: ${MARCA_PERMITIDA}`);
    console.log(`🎯 Categorias Alvo: ${CATEGORIAS_ALVO.length} categorias listadas.`);

    // 1. Busca TODOS os produtos que NÃO são SL e estão Ativos
    const query = `*[_type == "product" && brand != "${MARCA_PERMITIDA}" && isActive == true]{
        _id, 
        title, 
        brand, 
        "categorias": categories[]->title
    }`;

    let produtos = [];
    try {
        produtos = await client.fetch(query);
        console.log(`📋 Analisando ${produtos.length} produtos de outras marcas...`);
    } catch (e) {
        console.error("❌ Erro ao buscar:", e.message);
        return;
    }

    // 2. Filtra e Prepara Desativação
    let transaction = client.transaction();
    let count = 0;

    for (const produto of produtos) {
        if (!produto.categorias) continue;

        // Verifica se o produto tem ALGUMA das categorias da nossa lista
        const ehDaCategoriaAlvo = produto.categorias.some(catProduto => 
            CATEGORIAS_ALVO.some(alvo => catProduto.toLowerCase().includes(alvo.toLowerCase()))
        );

        if (ehDaCategoriaAlvo) {
            console.log(`   🚫 Desativando: [${produto.brand}] ${produto.title}`);
            transaction.patch(produto._id, p => p.set({ isActive: false }));
            count++;
        }
    }

    // 3. Executa
    if (count > 0) {
        console.log(`\n💾 Salvando alterações em ${count} produtos...`);
        try {
            await transaction.commit();
            console.log(`✅ SUCESSO! Limpeza concluída.`);
        } catch (err) {
            console.error(`❌ Erro ao salvar:`, err.message);
        }
    } else {
        console.log(`\n✨ Nenhum produto precisou ser desativado (tudo limpo).`);
    }
}

limparOutrasMarcas();