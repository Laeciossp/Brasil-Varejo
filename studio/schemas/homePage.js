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
        // --- BLOCO HERO ---
        { 
          type: 'object',
          name: 'hero',
          title: 'Banner Principal (Hero)',
          fields: [
            {
              name: 'slides',
              title: 'Slides do Banner',
              type: 'array',
              of: [
                {
                  type: 'object',
                  title: 'Slide',
                  fields: [
                    { 
                      name: 'image', 
                      title: 'Imagem de Fundo', 
                      type: 'image',
                      options: { hotspot: true }
                    },
                    {
                      name: 'mediaType',
                      title: 'Tipo de Mídia',
                      type: 'string',
                      options: { list: [{title: 'Imagem', value: 'image'}, {title: 'Vídeo', value: 'video'}] },
                      initialValue: 'image'
                    },
                    {
                      name: 'videoFile',
                      title: 'Arquivo de Vídeo',
                      type: 'file',
                      hidden: ({parent}) => parent?.mediaType !== 'video'
                    },
                    {
                      name: 'headline',
                      title: 'Título Principal',
                      type: 'string',
                    },
                    {
                      name: 'subheadline',
                      title: 'Subtítulo',
                      type: 'text',
                      rows: 2,
                    },
                    {
                      name: 'buttonText',
                      title: 'Texto do Botão',
                      type: 'string',
                    },
                    { 
                      name: 'link', 
                      title: 'Link do Banner', 
                      type: 'url',
                    },
                    {
                      name: 'layoutStyle',
                      title: 'Estilo do Layout',
                      type: 'string',
                      options: {
                        list: [
                          { title: 'Texto Sobreposto', value: 'overlay' },
                          { title: 'Caixa Separada (Texto Esq / Img Dir)', value: 'split-left' },
                          { title: 'Caixa Separada (Img Esq / Texto Dir)', value: 'split-right' }
                        ],
                        layout: 'radio'
                      },
                      initialValue: 'overlay'
                    },
                    {
                      name: 'textPosition',
                      title: 'Posição do Texto (Sobreposto)',
                      type: 'string',
                      options: {
                        list: [
                          { title: 'Centro', value: 'center' },
                          { title: 'Esquerda', value: 'left' },
                          { title: 'Direita', value: 'right' },
                          { title: 'Inferior (Baixo)', value: 'bottom' },
                          { title: 'Superior (Topo)', value: 'top' } // <--- AQUI ESTÁ A OPÇÃO
                        ]
                      },
                      initialValue: 'left',
                      hidden: ({parent}) => parent?.layoutStyle !== 'overlay'
                    },
                    {
                      name: 'textColor',
                      title: 'Cor do Texto',
                      type: 'string',
                      options: { list: [{title: 'Branco', value: 'white'}, {title: 'Preto', value: 'black'}] },
                      initialValue: 'white'
                    }
                  ]
                }
              ]
            }
          ]
        },
        { type: 'featuredBanners' },
        { type: 'departmentsSection' },
        {
          type: 'object',
          name: 'productCarousel',
          title: 'Carrossel de Produtos',
          fields: [
            { name: 'title', title: 'Título do Carrossel', type: 'string' },
            {
              name: 'listingType',
              title: 'Tipo de Listagem',
              type: 'string',
              options: {
                list: [
                  { title: 'Automático', value: 'category' },
                  { title: 'Manual', value: 'manual' }
                ],
                layout: 'radio'
              },
              initialValue: 'category'
            },
            {
              name: 'selectedCategory',
              title: 'Categoria',
              type: 'reference',
              to: [{ type: 'category' }],
              hidden: ({ parent }) => parent?.listingType !== 'category'
            },
            {
              name: 'manualProducts',
              title: 'Produtos Manuais',
              type: 'array',
              of: [{ type: 'reference', to: [{ type: 'product' }] }],
              hidden: ({ parent }) => parent?.listingType !== 'manual'
            }
          ]
        }
      ]
    }
  ]
}