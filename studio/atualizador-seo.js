const { createClient } = require('@sanity/client');
const fs = require('fs');

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

async function atualizarSEO() {
  console.log('Lendo o arquivo categorias_seo.json...');

  try {
    const data = fs.readFileSync('./categorias_seo.json', 'utf8');
    const categorias = JSON.parse(data);

    console.log(`Encontradas ${categorias.length} categorias. Iniciando o envio para o Sanity...`);

    for (const cat of categorias) {
      console.log(`Atualizando categoria: [${cat.title}]...`);

      await client.patch(cat._id)
        .set({
          seoTitle: cat.seoTitle,
          seoDescription: cat.seoDescription
        })
        .commit();
        
      console.log(`✅ SEO de "${cat.title}" atualizado com sucesso!`);
    }

    console.log('\n🎉 PRONTO! Todo o SEO das categorias foi atualizado com sucesso no painel!');

  } catch (error) {
    console.error('❌ Ocorreu um erro durante a execução:', error.message);
  }
}

atualizarSEO();