// studio/schemas/tour.js

export default {
  name: 'tour',
  title: '✈️ Tours & Roteiros',
  type: 'document',
  groups: [
    { name: 'main', title: '📦 Dados Principais', default: true },
    { name: 'itinerary', title: '🗺️ Roteiro & Inclusos' },
  ],
  fields: [
    {
      name: 'isActive',
      title: 'Tour Ativo no Site?',
      type: 'boolean',
      group: 'main',
      initialValue: true,
    },
    {
      name: 'title',
      title: 'Nome do Tour',
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
      description: 'Clique em "Generate" para criar o link da página baseada no título.'
    },
    {
      name: 'sourceUrl',
      title: 'Link Original (Queensberry)',
      type: 'url',
      group: 'main',
      readOnly: true,
    },
    {
      name: 'price',
      title: 'Preço a partir de (R$)',
      type: 'number',
      group: 'main',
    },
    {
      name: 'tags',
      title: 'Temáticas (Categorias da Operadora)',
      type: 'array',
      group: 'main',
      of: [{ type: 'string' }],
      description: 'Ex: Férias na Neve, Disney, Europa 2026'
    },
    {
      name: 'images',
      title: 'Galeria de Imagens (Alta Definição)',
      type: 'array',
      group: 'main',
      of: [{ type: 'image', options: { hotspot: true } }]
    },
    // --- ABA DE DETALHES ---
    {
      name: 'itinerary',
      title: 'Dia a Dia (Itinerário)',
      type: 'array',
      group: 'itinerary',
      of: [{ type: 'block' }]
    },
    {
      name: 'included',
      title: 'O que está incluído',
      type: 'array',
      group: 'itinerary',
      of: [{ type: 'block' }]
    },
    {
      name: 'excluded',
      title: 'O que NÃO está incluído',
      type: 'array',
      group: 'itinerary',
      of: [{ type: 'block' }]
    }
  ],
  preview: {
    select: {
      title: 'title',
      media: 'images.0',
      price: 'price',
      active: 'isActive'
    },
    prepare({ title, media, price, active }) {
      const statusSymbol = active ? '🟢' : '🔴';
      const priceTag = price ? `R$ ${price.toLocaleString('pt-BR')}` : 'Sob Consulta';
      return {
        title: title,
        subtitle: `${statusSymbol} | ${priceTag}`,
        media: media
      }
    }
  }
}