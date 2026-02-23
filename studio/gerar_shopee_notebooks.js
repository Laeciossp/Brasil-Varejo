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

  console.log('Buscando apenas NOTEBOOKS ativos de TODAS AS MARCAS no Sanity...');

  const query = `*[_type == "product" && isActive == true && categories[0]->title match "Notebook*"] {
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
    if (produtos.length === 0) return console.log('Nenhum Notebook encontrado.');

    const TAMANHO_LOTE = 40; 
    
    // ID da categoria correta para Notebooks na Shopee
    const mapaCategoriasShopee = { 
        "Notebooks": "101957", 
        "Notebook": "101957"
    };

    for (let i = 0; i < produtos.length; i += TAMANHO_LOTE) {
      const lote = produtos.slice(i, i + TAMANHO_LOTE);
      const numeroLote = Math.floor(i / TAMANHO_LOTE) + 1;
      const dadosLote = [];

      lote.forEach(prod => {
        // CORREÇÃO: Limite de Caracteres na Descrição (Max 5000 exigido pela Shopee)
        let descricao = Array.isArray(prod.descricao) ? prod.descricao.map(b => b.children?.map(c => c.text).join('') || '').join('\n') : (prod.descricao || '');
        if (descricao.length < 20) descricao += '\n\nProduto de excelente qualidade, alta performance e ideal para o seu dia a dia.';
        
        // Corte reduzido para 4800 para que a soma com o texto adicional não passe de 5000
        if (descricao.length > 4950) {
            descricao = descricao.substring(0, 4800) + '\n\n[Descrição encurtada devido ao limite da plataforma]';
        }
        
        // CORREÇÃO: Limite de Caracteres no Título (Max 120 exigido pela Shopee)
        let tituloLimpo = prod.nome || '';
        if (tituloLimpo.length > 120) {
            tituloLimpo = tituloLimpo.substring(0, 120);
        }

        const categoryToUse = mapaCategoriasShopee[prod.categoria_nome] || '101957';
        const idLimpo = prod.id.replace('drafts.', '');
        const numeroIntegracaoUnico = idLimpo.slice(-15);
        const skuBase = prod.sku_principal || numeroIntegracaoUnico;

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

        cores.forEach((corObj, cIndex) => {
            tamanhos.forEach((tamNome, sIndex) => {
                const chave = `${corObj.nome}-${tamNome}`;
                const dadosReais = combinacoes[chave]; 

                const linha = new Array(51).fill('');
                
                linha[0] = categoryToUse; linha[1] = tituloLimpo; linha[2] = descricao;
                linha[3] = skuBase; linha[4] = numeroIntegracaoUnico; 
                
                for(let imgIdx = 0; imgIdx < 9; imgIdx++) {
                    linha[17 + imgIdx] = prod.imagens?.[imgIdx] || '';
                }
                
                linha[26] = 0.3; linha[27] = 20; linha[28] = 15; linha[29] = 5; linha[30] = ''; 
                
                linha[5] = 'Cor'; linha[6] = corObj.nome; 
                if (sIndex === 0) linha[7] = corObj.imagem || ''; 
                
                linha[8] = 'Tamanho'; linha[9] = tamNome; 
                
                const precoFinal = dadosReais?.price ? dadosReais.price : precoPadrao;
                linha[10] = (precoFinal * 1.30).toFixed(2);
                
                linha[11] = dadosReais?.stock !== undefined ? dadosReais.stock : 0;
                
                let varSku = dadosReais?.sku ? dadosReais.sku : `${skuBase}-${corObj.nome}-${tamNome}`;
                if (varSku.length > 20) {
                    const idCurto = numeroIntegracaoUnico.slice(-6); 
                    const corCurta = corObj.nome.replace(/\s/g, '').substring(0, 4);
                    const tamCurto = tamNome.replace(/\s/g, '').substring(0, 4);
                    varSku = `${idCurto}-${corCurta}-${tamCurto}`; 
                }
                linha[12] = varSku.substring(0, 20);
                
                dadosLote.push(linha);
            });
        });
      });

      const workbook = XLSX.readFile(nomeTemplateOriginal);
      let abaCorreta = workbook.SheetNames.find(nome => nome.trim() === 'Modelo');
      if (!abaCorreta) abaCorreta = workbook.SheetNames[1]; 
      const worksheet = workbook.Sheets[abaCorreta];

      XLSX.utils.sheet_add_aoa(worksheet, dadosLote, { origin: "A5" });

      const nomeArquivo = `Carga_Shopee_Notebooks_Lote_${numeroLote}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);
      console.log(`✅ Lote ${numeroLote} gerado com sucesso! Limites de texto validados.`);
    }

  } catch (e) { console.error('❌ Erro:', e.message); }
}

gerarPlanilhaShopee();