// corrigir-precos.js
// FUNÇÃO: Varre a tabela 'tour' no Sanity e aplica +5% no preço de todos eles.

const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

async function corrigirPrecosTours() {
    console.log('🔍 Buscando tours já importados no Sanity...');
    
    try {
        // Pega APENAS documentos da tabela 'tour' que tenham preço definido
        const query = `*[_type == "tour" && defined(price)]{ _id, title, price }`;
        const tours = await client.fetch(query);
        
        console.log(`📋 Encontrados ${tours.length} roteiros para ajustar.`);

        for (const tour of tours) {
            // Aplica a matemática cravada para cobrir os 5% do MP
            const novoPreco = parseFloat((tour.price / 0.95).toFixed(2));
            
            // Se o preço for muito diferente, ele aplica o remendo (patch)
            if (novoPreco > tour.price) {
                await client.patch(tour._id)
                    .set({ price: novoPreco })
                    .commit();
                
                console.log(`✅ Ajustado: ${tour.title} | De R$ ${tour.price} -> Para R$ ${novoPreco}`);
            }
        }

        console.log('\n🏁 Correção Finalizada com sucesso!');
    } catch (err) {
        console.error('❌ Erro na correção:', err.message);
    }
}

corrigirPrecosTours();