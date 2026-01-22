// studio/schemas/product.js

export default {
  name: 'product',
  title: 'Produtos (Varejo Geral)',
  type: 'document',
  // Divisão visual em abas para organizar o cadastro
  groups: [
    { name: 'main', title: '📦 Principal', default: true },
    { name: 'variants', title: '🎨 Variações & Preço' },
    { name: 'specs', title: '📝 Ficha Técnica' },
    { name: 'shipping', title: '🚚 Frete & Entrega' },
    { name: 'seo', title: '🔍 SEO & Google' },
  ],
  fields: [
    // --- 1. IDENTIFICAÇÃO BÁSICA (ABA PRINCIPAL) ---
    
     // --- 0. CONTROLE DE EXIBIÇÃO ---
    {
      name: 'isActive',
      title: 'Produto Ativo no Site?',
      type: 'boolean',
      group: 'main',
      description: 'Se desligado, o produto fica oculto na loja (mesmo se estiver publicado).',
      initialValue: true, // Já nasce ativado por padrão
      validation: Rule => Rule.required()
    },
    // --- LOTE DE IMPORTAÇÃO ---
    {
      name: 'lote',
      title: 'Lote de Importação',
      type: 'string',
      group: 'main',
      description: 'Ex: "Super Lote 12", "Lote 40". Ajuda a filtrar e identificar a origem do produto.',
    },
    {
      name: 'title',
      title: 'Nome do Produto',
      type: 'string',
      group: 'main',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Link Amigável (Slug)',
      type: 'slug',
      group: 'main',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required()
    },
    {
      name: 'categories',
      title: 'Categorias / Departamentos',
      type: 'array',
      group: 'main',
      of: [{type: 'reference', to: {type: 'category'}}]
    },
    {
      name: 'brand',
      title: 'Marca / Fabricante',
      type: 'string',
      group: 'main',
    },
    {
      name: 'images',
      title: 'Galeria de Imagens (Geral)',
      type: 'array',
      group: 'main',
      of: [{ type: 'image', options: { hotspot: true } }]
    },
    // --- CAMPO DE VÍDEO ---
    {
      name: 'videoFile',
      title: 'Vídeo do Produto',
      description: 'Upload de arquivo de vídeo (MP4, WebM) vindo da importação.',
      type: 'file',
      group: 'main',
      options: {
        accept: 'video/*'
      }
    },
    {
      name: 'description',
      title: 'Descrição Completa',
      type: 'array', 
      group: 'main',
      of: [
        {type: 'block'}, // Mantém o editor de texto rico padrão
        {
          type: 'object',
          name: 'htmlBlock',
          title: 'Bloco HTML (Layout Customizado)',
          fields: [
            {
              name: 'html',
              title: 'Código HTML',
              type: 'text',
              description: 'Cole aqui o código HTML técnico com classes do Tailwind para renderizar layouts específicos.'
            }
          ]
        }
      ]
    },
    // --- PREÇO NA RAIZ ---
    {
      name: 'price',
      title: 'Preço Base (R$)',
      type: 'number',
      group: 'main',
      description: 'Preço principal se o produto não tiver variações.'
    },
    {
      name: 'oldPrice',
      title: 'Preço Antigo (De:)',
      type: 'number',
      group: 'main',
      description: 'Para promoções (Preço riscado).'
    },

    // --- 2. O SELETOR MÁGICO (DEFINE A FICHA TÉCNICA) ---
    {
      name: 'productType',
      title: 'Qual é o TIPO deste produto?',
      description: 'Escolha a categoria para liberar os campos técnicos corretos abaixo.',
      type: 'string',
      group: 'specs',
      initialValue: 'general',
      options: {
        list: [
          { title: '📱 Tech (Celulares, PCs, Tablets)', value: 'tech' },
          { title: '⚡ Energia & Solar (Placas, Inversores)', value: 'energy' },
          { title: '👗 Moda (Roupas, Calçados)', value: 'fashion' },
          { title: '🏠 Casa & Eletro (Móveis, Geladeiras)', value: 'home' },
          { title: '💄 Beleza & Saúde (Cosméticos)', value: 'beauty' },
          { title: '📦 Geral / Outros', value: 'general' }
        ],
        layout: 'radio'
      }
    },

 // --- 3. VARIAÇÕES (ESTRUTURA HIERÁRQUICA) ---
    {
      name: 'variants',
      title: 'Variações (Cores -> Tamanhos)',
      type: 'array',
      group: 'variants',
      of: [
        {
          type: 'object', // Cor (Pai)
          title: 'Grupo de Cor',
          fields: [
            { name: 'colorName', title: 'Nome da Cor', type: 'string' },
            { name: 'variantImage', title: 'Foto da Cor', type: 'image' },
            // NOVO CAMPO PARA ELETRO: Variante sem tamanho (Item Único)
            { name: 'variantName', title: 'Nome da Variante (Eletro)', type: 'string', description: 'Use este campo se não houver tamanhos (ex: 110V)' },
            { name: 'price', title: 'Preço (Item Único)', type: 'number' },
            { name: 'oldPrice', title: 'Preço Antigo (Item Único)', type: 'number' },
            { name: 'stock', title: 'Estoque (Item Único)', type: 'number' },
            { name: 'sku', title: 'SKU (Item Único)', type: 'string' },

            {
              name: 'sizes',
              title: 'Tamanhos desta Cor (Moda)',
              type: 'array', // Tamanhos (Filhos)
              of: [
                {
                  type: 'object',
                  title: 'Dados do Tamanho',
                  fields: [
                    { name: 'size', title: 'Tamanho', type: 'string' },
                    { name: 'price', title: 'Preço', type: 'number' },
                    { name: 'stock', title: 'Estoque', type: 'number' },
                    { name: 'sku', title: 'SKU', type: 'string' }
                  ],
                  preview: {
                    select: { title: 'size', subtitle: 'price' },
                    prepare({title, subtitle}) {
                        return { title: title, subtitle: subtitle ? `R$ ${subtitle}` : 'Sem preço' }
                    }
                  }
                }
              ]
            }
          ],
          preview: {
            select: { title: 'colorName', subtitle: 'variantName', media: 'variantImage' },
            prepare({ title, subtitle, media }) {
               return { 
                 title: title || subtitle || 'Variante',
                 media: media
               }
            }
          }
        }
      ]
    },

    // --- 4. FICHAS TÉCNICAS CONDICIONAIS ---

    // 📱 TECH
    {
      name: 'techSpecs',
      title: '📱 Ficha Técnica: Tecnologia',
      type: 'object',
      group: 'specs',
      hidden: ({ document }) => document?.productType !== 'tech',
      fields: [
        { name: 'processor', title: 'Processador', type: 'string' },
        { name: 'os', title: 'Sistema Operacional', type: 'string' },
        { name: 'screen', title: 'Tela (Pol/Resolução)', type: 'string' },
        { name: 'camera', title: 'Câmeras', type: 'string' },
        { name: 'battery', title: 'Bateria', type: 'string' },
      ]
    },

    // ⚡ ENERGIA SOLAR
    {
      name: 'energySpecs',
      title: '⚡ Ficha Técnica: Energia Solar',
      type: 'object',
      group: 'specs',
      hidden: ({ document }) => document?.productType !== 'energy',
      fields: [
        { name: 'power', title: 'Potência Nominal (W)', type: 'string' },
        { name: 'efficiency', title: 'Eficiência (%)', type: 'string' },
        { name: 'technology', title: 'Tecnologia (Mono/Poli)', type: 'string' },
        { name: 'inverterType', title: 'Tipo de Inversor', type: 'string' },
        { name: 'datasheet', title: 'PDF Técnico', type: 'file' },
      ]
    },

    // 👗 MODA
    {
      name: 'fashionSpecs',
      title: '👗 Ficha Técnica: Moda',
      type: 'object',
      group: 'specs',
      hidden: ({ document }) => document?.productType !== 'fashion',
      fields: [
        { name: 'gender', title: 'Gênero', type: 'string', options: {list: ['Unissex', 'Masc', 'Fem']} },
        { name: 'material', title: 'Material / Tecido', type: 'string' },
        { name: 'model', title: 'Modelagem', type: 'string' },
      ]
    },

    // 🏠 CASA
    {
      name: 'homeSpecs',
      title: '🏠 Ficha Técnica: Casa & Eletro',
      type: 'object',
      group: 'specs',
      hidden: ({ document }) => document?.productType !== 'home',
      fields: [
        { name: 'consumption', title: 'Consumo (kWh)', type: 'string' },
        { name: 'powerW', title: 'Potência Elétrica (W)', type: 'string' },
      ]
    },

    // --- CORREÇÃO AQUI: RENOMEADO DE customSpecs PARA specifications ---
    // 📋 GERAL / TABELA LIVRE
    {
      name: 'specifications', // <-- AGORA O NOME BATE COM O IMPORTADOR
      title: 'Especificações Técnicas (Lista)',
      type: 'array',
      group: 'specs',
      description: 'Use para características que não estão nos campos acima (Ex: Voltagem, Consumo, etc).',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'label', type: 'string', title: 'Característica (Ex: Potência)'},
            {name: 'value', type: 'string', title: 'Valor (Ex: 2000W)'}
          ],
          preview: { 
            select: { title: 'label', subtitle: 'value' } 
          }
        }
      ]
    },

    // --- 5. LOGÍSTICA & FRETE (ABA FRETE) ---
    {
      name: 'freeShipping',
      title: 'Frete Grátis?',
      type: 'boolean',
      group: 'shipping',
      initialValue: false,
    },
    {
      name: 'logistics',
      title: 'Dados Logísticos (Obrigatório Melhor Envio)',
      type: 'object',
      group: 'shipping',
      options: { collapsible: true, collapsed: false },
      fields: [
        { name: 'weight', title: 'Peso (kg)', type: 'number', initialValue: 0.5 },
        { name: 'width', title: 'Largura (cm)', type: 'number', initialValue: 15 },
        { name: 'height', title: 'Altura (cm)', type: 'number', initialValue: 5 },
        { name: 'length', title: 'Comprimento (cm)', type: 'number', initialValue: 20 },
      ]
    },
    {
      name: 'warranty',
      title: 'Informações de Garantia',
      type: 'string',
      group: 'shipping',
    }
  ],

  // --- VISUALIZAÇÃO ---
  preview: {
    select: {
      title: 'title',
      media: 'images.0',
      type: 'productType',
      active: 'isActive', 
      lote: 'lote',       
      price: 'price'      
    },
    prepare({ title, media, type, active, lote, price }) {
      const icons = {
        tech: '📱', energy: '⚡', fashion: '👗', home: '🏠', beauty: '💄', general: '📦'
      };
      
      const statusSymbol = active ? '🟢' : '🔴'; 
      const loteTag = lote ? `[${lote}]` : '[S/ LOTE]'; 
      const priceTag = price ? ` | R$ ${price.toFixed(2)}` : ''; 

      return {
        title: title,
        subtitle: `${statusSymbol} ${loteTag} | ${icons[type] || '📦'}${priceTag}`,
        media: media
      }
    }
  }
}