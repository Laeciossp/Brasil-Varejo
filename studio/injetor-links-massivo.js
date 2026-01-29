// injetor-links-massivo.js
// FUNÇÃO: Lê mapa-links.json e atualiza o Sanity comparando NOMES.

const { createClient } = require('@sanity/client');
const fs = require('fs');

// --- CONFIGURAÇÃO SANITY ---
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false, // Importante: False para pegar dados frescos
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO' 
});

async function iniciarInjecao() {
    console.log('🚀 Iniciando Injetor de Links por Nome...');

    // 1. Carrega o mapa JSON
    let mapaLinks = [];
    try {
        const raw = fs.readFileSync('mapa-links.json', 'utf-8');
        mapaLinks = JSON.parse(raw);
        console.log(`📂 Mapa carregado com ${mapaLinks.length} produtos do fornecedor.`);
    } catch (e) {
        console.error("❌ Erro: Arquivo 'mapa-links.json' não encontrado. Rode o capturador primeiro.");
        return;
    }

    // 2. Busca TODOS os produtos do Sanity (só ID, Título e sourceUrl)
    console.log('☁️  Baixando lista de produtos do Sanity...');
    const query = `*[_type == "product"]{ _id, title, sourceUrl }`;
    const produtosSanity = await client.fetch(query);
    console.log(`📋 Sanity possui ${produtosSanity.length} produtos cadastrados.`);

    // 3. Cruzamento de Dados (Matching)
    console.log('🔄 Cruzando nomes e preparando atualizações...');
    
    // Cria uma transação para ser rápido e seguro
    let transaction = client.transaction();
    let updatesCount = 0;
    let ignoredCount = 0;
    
    // Normalizador de texto (remove espaços extras, deixa maiúsculo)
    const normalizar = (texto) => texto ? texto.trim().toUpperCase() : '';

    mapaLinks.forEach(itemMapa => {
        const nomeSite = normalizar(itemMapa.name);
        
        // Procura no Sanity alguém com esse nome exato
        const match = produtosSanity.find(p => normalizar(p.title) === nomeSite);

        if (match) {
            // Se já tem link igual, ignora
            if (match.sourceUrl === itemMapa.url) {
                return;
            }

            // Adiciona atualização na fila
            transaction.patch(match._id, p => p.set({ sourceUrl: itemMapa.url }));
            console.log(`   ✅ MATCH: "${itemMapa.name}" -> Link Vinculado!`);
            updatesCount++;
        } else {
            console.log(`   ⚠️ SEM MATCH: "${itemMapa.name}" (Não achei no Sanity)`);
            ignoredCount++;
        }
    });

    // 4. Commit (Salvar no Banco)
    if (updatesCount > 0) {
        console.log(`\n💾 Salvando ${updatesCount} alterações no Sanity...`);
        try {
            await transaction.commit();
            console.log(`✅ SUCESSO! Todos os links foram injetados.`);
        } catch (err) {
            console.error(`❌ Erro ao salvar:`, err.message);
        }
    } else {
        console.log(`\nzzz Nenhuma atualização necessária (tudo já estava atualizado ou sem match).`);
    }
}

iniciarInjecao();