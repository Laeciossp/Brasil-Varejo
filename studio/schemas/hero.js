// schemas/hero.js
export default {
  name: 'hero',
  title: 'Banner Principal (Hero)',
  type: 'object',
  fields: [
    {
      name: 'slides',
      title: 'Slides',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'title',
              title: 'Título do Slide (Para referência)',
              type: 'string',
            },
            {
              name: 'mediaType',
              title: 'Tipo de Mídia',
              type: 'string',
              options: {
                list: [
                  { title: 'Imagem', value: 'image' },
                  { title: 'Vídeo (Upload)', value: 'video' },
                ],
                layout: 'radio'
              },
              initialValue: 'image'
            },
            {
              name: 'image',
              title: 'Imagem',
              type: 'image',
              options: { hotspot: true },
              hidden: ({ parent }) => parent?.mediaType !== 'image',
            },
            {
              name: 'videoFile',
              title: 'Arquivo de Vídeo (MP4/WebM)',
              type: 'file',
              hidden: ({ parent }) => parent?.mediaType !== 'video',
            },
            {
              name: 'link',
              title: 'Link de Destino',
              type: 'string',
              description: 'Ex: /produtos/painel-solar ou https://google.com'
            },
            {
              name: 'mobileImage',
              title: 'Imagem para Celular (Opcional)',
              type: 'image',
              description: 'Se quiser uma versão diferente para telas pequenas',
              hidden: ({ parent }) => parent?.mediaType !== 'image',
            }
          ],
          preview: {
            select: {
              title: 'title',
              media: 'image'
            }
          }
        }
      ]
    }
  ],
  preview: {
    select: {
      slides: 'slides'
    },
    prepare(selection) {
      const { slides } = selection;
      return {
        title: `Banner Principal (${slides ? slides.length : 0} slides)`,
        subtitle: 'Carrossel do Topo'
      }
    }
  }
}