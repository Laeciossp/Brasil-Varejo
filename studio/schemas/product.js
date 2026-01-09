export default {
  name: 'product',
  title: 'Produtos',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Nome do Produto',
      type: 'string',
    },
    {
      name: 'ean',
      title: 'Código de Barras (EAN/GTIN)',
      type: 'string',
      description: 'Digite o EAN para buscar dados automaticamente no futuro.'
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 }
    },
    {
      name: 'price',
      title: 'Preço (R$)',
      type: 'number',
    },
    {
      name: 'oldPrice',
      title: 'Preço Antigo (De:)',
      type: 'number',
      description: 'Preencha para mostrar "De: R$ 100 Por: R$ 80"'
    },
    {
      name: 'images',
      title: 'Imagens',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }]
    },
    {
      name: 'categories',
      title: 'Categorias',
      type: 'array',
      of: [{type: 'reference', to: {type: 'category'}}]
    },
    // --- Logística Obrigatória para Melhor Envio ---
    {
      name: 'logistics',
      title: 'Dados Logísticos (Obrigatório p/ Frete)',
      type: 'object',
      options: { collapsible: true, collapsed: false },
      fields: [
        { name: 'weight', title: 'Peso (kg)', type: 'number', initialValue: 0.5 },
        { name: 'width', title: 'Largura (cm)', type: 'number', initialValue: 15 },
        { name: 'height', title: 'Altura (cm)', type: 'number', initialValue: 5 },
        { name: 'length', title: 'Comprimento (cm)', type: 'number', initialValue: 20 },
      ]
    },
    {
      name: 'description',
      title: 'Descrição Completa',
      type: 'array', 
      of: [{type: 'block'}]
    },
    {
      name: 'specifications',
      title: 'Especificações Técnicas (Tabela)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'label', type: 'string', title: 'Característica (Ex: Cor)'},
            {name: 'value', type: 'string', title: 'Valor (Ex: Preto)'}
          ]
        }
      ]
    }
  ]
}