const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: 'o4upb251', 
  dataset: 'production', 
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skN6ywZve7FYg0WySobhXlLdTse4b7m6UG6LkBgKiEBHcb0Z8NFxWOQg98glPi7fh4ICCtNr3qTQ0jOpDKDteCQeuf6Jysp5kS1ntPcauI3sC0dojdB00MUuVNNuE1qz1b8lVbJGJ2xwMWyKPUeLh1CcwMxdbMFFvCPkCN4q0NPIJuDHuWhM' 
});

async function retomarAumentoPrecosSN() {
  console.log('🔍 Buscando os produtos restantes da marca SN...');
  
  // TRAVAS DE SEGURANÇA:
  // 1. !(_id in path('drafts.**')) -> Pula os rascunhos fantasma que causaram o erro.
  // 2. _updatedAt < "2026-02-21T01:00:00Z" -> Só atualiza o que não foi tocado pelo robô de hoje.
  const query = `*[_type == "product" && brand == "SN" && !(_id in path('drafts.**')) && _updatedAt < "2026-02-21T01:00:00Z"]{
    _id, 
    title, 
    variants
  }`;
  
  try {
    const produtos = await client.fetch(query);
    
    if (produtos.length === 0) {
      return console.log('🎉 TODOS os produtos já foram atualizados com sucesso! Nenhum pendente.');
    }

    console.log(`Encontrados ${produtos.length} produtos que faltavam. Retomando o robô (+50%)...\n`);

    for (const prod of produtos) {
      if (!prod.variants || prod.variants.length === 0) {
        continue; // Pula os que não tem variação para não dar erro
      }

      let variantsAtualizadas = prod.variants.map(vari => {
        if (!vari.sizes) return vari;
        
        let sizesAtualizados = vari.sizes.map(sizeObj => {
          if (sizeObj.price) {
            const novoPreco = parseFloat((sizeObj.price * 1.50).toFixed(2));
            sizeObj.price = novoPreco;
          }
          return sizeObj;
        });
        
        vari.sizes = sizesAtualizados;
        return vari;
      });

      // Aplica a modificação no Sanity
      await client.patch(prod._id)
        .set({ variants: variantsAtualizadas })
        .commit();
        
      console.log(`✅ "${prod.title}" atualizado com sucesso!`);
    }
    
    console.log('\n🚀 PARTE 2 CONCLUÍDA! Todo o catálogo da SN foi reajustado em 50%.');
    
  } catch (error) {
    console.error('❌ Erro de execução:', error.message);
  }
}

retomarAumentoPrecosSN();