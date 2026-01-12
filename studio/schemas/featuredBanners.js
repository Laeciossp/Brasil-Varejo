// schemas/featuredBanners.js
export default {
  name: 'featuredBanners',
  title: 'Trio de Banners (Destaque)',
  type: 'object',
  fields: [
    {
      name: 'banners',
      title: 'Banners',
      type: 'array',
      validation: Rule => Rule.max(3).warning('O layout ideal é de 3 banners'),
      of: [
        {
          type: 'object',
          fields: [
            { name: 'title', title: 'Título', type: 'string' },
            { name: 'image', title: 'Imagem', type: 'image', options: { hotspot: true } },
            { name: 'link', title: 'Link', type: 'string' }
          ]
        }
      ]
    }
  ],
  preview: {
    prepare() {
      return { title: 'Seção: Trio de Banners' }
    }
  }
}