const { createClient } = require('@sanity/client');
const fs = require('fs');

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false
});

async function gerarSitemap() {
  console.log('Buscando categorias e produtos no Sanity...');
  
  try {
    const query = `{
      "categorias": *[_type == "category" && isActive == true].slug.current,
      "produtos": *[_type == "product" && isActive == true].slug.current
    }`;

    const { categorias, produtos } = await client.fetch(query);
    const baseUrl = 'https://www.palastore.com.br'; // Seu domínio oficial

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Adiciona a Página Inicial (Home)
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    // 2. Adiciona todas as Categorias
    categorias.forEach(slug => {
      if(slug) {
        xml += `  <url>\n    <loc>${baseUrl}/category/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
    });

    // 3. Adiciona todos os Produtos
    produtos.forEach(slug => {
      if(slug) {
        xml += `  <url>\n    <loc>${baseUrl}/product/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
      }
    });

    xml += `</urlset>`;

    // Salva o arquivo no seu computador
    fs.writeFileSync('sitemap.xml', xml);
    console.log(`✅ SUCESSO! sitemap.xml gerado com ${categorias.length} categorias e ${produtos.length} produtos.`);

  } catch (error) {
    console.error('❌ Erro ao gerar sitemap:', error.message);
  }
}

gerarSitemap();