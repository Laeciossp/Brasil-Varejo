// schemas/productCarousel.js
export default {
  name: 'productCarousel',
  title: 'Carrossel de Produtos',
  type: 'object',
  fields: [
    {
      name: 'title',
      title: 'Título da Vitrine',
      type: 'string',
      description: 'Ex: Ofertas da Semana, Mais Vendidos, Linha Solar'
    },
    {
      name: 'filterType',
      title: 'Como selecionar os produtos?',
      type: 'string',
      options: {
        list: [
          { title: 'Seleção Manual (Escolher um por um)', value: 'manual' },
          { title: 'Por Categoria (Automático)', value: 'category' },
          { title: 'Por Tag (Automático - Ex: "lancamento")', value: 'tag' }
        ],
        layout: 'radio'
      },
      initialValue: 'manual'
    },
    // Opção 1: Manual
    {
      name: 'manualProducts',
      title: 'Selecione os Produtos',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'product' }] }], // Certifique-se que seu schema de produto se chama 'product'
      hidden: ({ parent }) => parent?.filterType !== 'manual',
    },
    // Opção 2: Categoria
    {
      name: 'category',
      title: 'Escolha a Categoria',
      type: 'reference',
      to: [{ type: 'category' }], // Certifique-se que seu schema de categoria se chama 'category'
      hidden: ({ parent }) => parent?.filterType !== 'category',
    },
    // Opção 3: Tag
    {
      name: 'tag',
      title: 'Digite a Tag',
      type: 'string',
      description: 'Ex: promo-relampago',
      hidden: ({ parent }) => parent?.filterType !== 'tag',
    },
    {
      name: 'limit',
      title: 'Quantidade Máxima',
      type: 'number',
      initialValue: 10
    }
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'filterType'
    },
    prepare({ title, subtitle }) {
      const types = {
        manual: 'Seleção Manual',
        category: 'Por Categoria',
        tag: 'Por Tag'
      }
      return {
        title: title || 'Carrossel Sem Título',
        subtitle: `Tipo: ${types[subtitle] || subtitle}`
      }
    }
  }
}