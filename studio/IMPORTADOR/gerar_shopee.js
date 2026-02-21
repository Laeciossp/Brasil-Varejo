const { createClient } = require('@sanity/client');
const XLSX = require('xlsx');
const fs = require('fs');

const client = createClient({
  projectId: 'o4upb251', 
  dataset: 'production', 
  apiVersion: '2023-05-03',
  useCdn: false,
  token: 'skN6ywZve7FYg0WySobhXlLdTse4b7m6UG6LkBgKiEBHcb0Z8NFxWOQg98glPi7fh4ICCtNr3qTQ0jOpDKDteCQeuf6Jysp5kS1ntPcauI3sC0dojdB00MUuVNNuE1qz1b8lVbJGJ2xwMWyKPUeLh1CcwMxdbMFFvCPkCN4q0NPIJuDHuWhM' 
});

async function gerarPlanilhaShopee() {
  const nomeTemplateOriginal = 'Shopee_mass_upload_2026-02-21_basic_template (1).xlsx';

  if (!fs.existsSync(nomeTemplateOriginal)) {
    return console.error(`❌ ERRO: O arquivo '${nomeTemplateOriginal}' não está na pasta.`);
  }

  console.log('Buscando produtos ativos da marca SL no Sanity...');

  const query = `*[_type == "product" && brand == "SL" && isActive == true] {
    "id": _id,
    "nome": title,
    "descricao": description,
    "sku_principal": sku,
    "categoria_nome": categories[0]->title,
    "imagens": images[].asset->url,
    "variants": variants[] {
      colorName,
      "variantImageUrl": variantImage.asset->url,
      sizes[] { size, price, stock, sku }
    }
  }`;

  try {
    const produtos = await client.fetch(query);
    if (produtos.length === 0) return console.log('Nenhum produto encontrado com a marca SL.');

    const TAMANHO_LOTE = 40; 
    const mapaCategoriasShopee = { 
        "Vestidos": "100104",  
        "Blusas": "100353",    
        "Conjuntos": "100104", 
        "Calças": "100104"     
    };

    for (let i = 0; i < produtos.length; i += TAMANHO_LOTE) {
      const lote = produtos.slice(i, i + TAMANHO_LOTE);
      const numeroLote = Math.floor(i / TAMANHO_LOTE) + 1;
      const dadosLote = [];

      lote.forEach(prod => {
        let descricao = Array.isArray(prod.descricao) ? prod.descricao.map(b => b.children?.map(c => c.text).join('') || '').join('\n') : (prod.descricao || '');
        if (descricao.length < 20) descricao += '\n\nProduto de excelente qualidade, confortável e ideal para qualquer ocasião do seu dia a dia.';
        
        const categoryToUse = mapaCategoriasShopee[prod.categoria_nome] || '100104';
        const idLimpo = prod.id.replace('drafts.', '');
        const numeroIntegracaoUnico = idLimpo.slice(-15);
        const skuBase = prod.sku_principal || numeroIntegracaoUnico;

        // ==============================================================
        // MÁGICA DA MATRIZ: Coletar todas as Cores e Tamanhos
        // ==============================================================
        const cores = [];
        const tamanhosSet = new Set();
        const combinacoes = {}; 
        let precoPadrao = 0;

        if (prod.variants && prod.variants.length > 0) {
            prod.variants.forEach(vari => {
                const corNome = vari.colorName || 'Padrão';
                const imgUrl = vari.variantImageUrl || '';
                
                if (!cores.some(c => c.nome === corNome)) {
                    cores.push({ nome: corNome, imagem: imgUrl });
                }

                if (vari.sizes && vari.sizes.length > 0) {
                    vari.sizes.forEach(sz => {
                        const tamNome = sz.size || 'Único';
                        tamanhosSet.add(tamNome);
                        combinacoes[`${corNome}-${tamNome}`] = sz;
                        if (sz.price && sz.price > 0 && precoPadrao === 0) precoPadrao = sz.price;
                    });
                } else {
                    tamanhosSet.add('Único');
                }
            });
        } else {
            cores.push({ nome: 'Padrão', imagem: '' });
            tamanhosSet.add('Único');
        }

        const tamanhos = Array.from(tamanhosSet);
        if (precoPadrao === 0) precoPadrao = 50; 

        // ==============================================================
        // GERAR TODAS AS LINHAS DA MATRIZ PERFEITA (Obrigatório Shopee)
        // ==============================================================
        cores.forEach((corObj, cIndex) => {
            tamanhos.forEach((tamNome, sIndex) => {
                const chave = `${corObj.nome}-${tamNome}`;
                const dadosReais = combinacoes[chave]; // Verifica se existe no Sanity

                const linha = new Array(51).fill('');
                
                // Dados Base
                linha[0] = categoryToUse; linha[1] = prod.nome; linha[2] = descricao;
                linha[3] = skuBase; linha[4] = numeroIntegracaoUnico; 
                
                for(let imgIdx = 0; imgIdx < 9; imgIdx++) {
                    linha[17 + imgIdx] = prod.imagens?.[imgIdx] || '';
                }
                
                linha[26] = 0.3; linha[27] = 20; linha[28] = 15; linha[29] = 5; linha[30] = ''; 
                
                // Variação 1 (Cor)
                linha[5] = 'Cor'; linha[6] = corObj.nome; 
                if (sIndex === 0) linha[7] = corObj.imagem || ''; // Imagem só na 1ª vez
                
                // Variação 2 (Tamanho)
                linha[8] = 'Tamanho'; linha[9] = tamNome; 
                
                // PREÇO E ESTOQUE
                const precoFinal = dadosReais?.price ? dadosReais.price : precoPadrao;
                linha[10] = (precoFinal * 1.30).toFixed(2);
                
                // O SEGREDO: Se não houver no Sanity, mete o stock a 0 e passa na aprovação!
                linha[11] = dadosReais?.stock !== undefined ? dadosReais.stock : 0;
                
                linha[12] = dadosReais?.sku ? dadosReais.sku : `${skuBase}-${corObj.nome}-${tamNome}`.substring(0, 20);
                
                dadosLote.push(linha);
            });
        });
      });

      const workbook = XLSX.readFile(nomeTemplateOriginal);
      let abaCorreta = workbook.SheetNames.find(nome => nome.trim() === 'Modelo');
      if (!abaCorreta) abaCorreta = workbook.SheetNames[1]; 
      const worksheet = workbook.Sheets[abaCorreta];

      XLSX.utils.sheet_add_aoa(worksheet, dadosLote, { origin: "A5" });

      const nomeArquivo = `Carga_Shopee_SL_Lote_${numeroLote}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);
      console.log(`✅ Lote ${numeroLote} gerado com sucesso! Matriz Perfeita injetada.`);
    }

  } catch (e) { console.error('❌ Erro:', e.message); }
}

gerarPlanilhaShopee();