// studio/schemas/homePage.js
export default {
  name: 'homePage',
  title: 'Configuração da Home',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Título Interno',
      type: 'string',
      initialValue: 'Página Inicial'
    },
    {
      name: 'pageBuilder',
      title: 'Construtor de Página',
      type: 'array',
      of: [
        { type: 'hero' },
        { type: 'featuredBanners' },
        { type: 'departmentsSection' },
        // AQUI ESTÁ A MÁGICA DO CARROSSEL HÍBRIDO:
        {
          type: 'object',
          name: 'productCarousel',
          title: 'Carrossel de Produtos',
          fields: [
            {
              name: 'title',
              title: 'Título do Carrossel (Ex: Mais Vendidos)',
              type: 'string'
            },
            {
              name: 'listingType',
              title: 'Como preencher este carrossel?',
              type: 'string',
              options: {
                list: [
                  { title: '⚡ Automático (Por Categoria)', value: 'category' },
                  { title: '🖐 Manual (Escolher um por um)', value: 'manual' }
                ],
                layout: 'radio'
              },
              initialValue: 'category'
            },
            {
              name: 'selectedCategory',
              title: 'Escolha a Categoria',
              type: 'reference',
              to: [{ type: 'category' }],
              hidden: ({ parent }) => parent?.listingType !== 'category'
            },
            {
              name: 'manualProducts',
              title: 'Selecionar Produtos Manualmente',
              type: 'array',
              of: [{ type: 'reference', to: [{ type: 'product' }] }],
              hidden: ({ parent }) => parent?.listingType !== 'manual'
            }
          ],
          preview: {
            select: { title: 'title', type: 'listingType' },
            prepare({ title, type }) {
              return {
                title: title || 'Carrossel',
                subtitle: type === 'category' ? 'Modo: Automático' : 'Modo: Manual'
              }
            }
          }
        }
      ]
    }
  ]
}