export default {
  name: 'ofertaMarketing',
  title: 'Cruzeiros Temáticos',
  type: 'document',
  fields: [
    {
      name: 'titulo',
      title: 'Título da Oferta',
      type: 'string',
    },
    {
      name: 'capa',
      title: 'Imagem de Capa (Thumb)',
      type: 'image',
      options: { hotspot: true }
    },
    {
      name: 'stories',
      title: 'Sequência de Stories (Fotos/Vídeos)',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'midiaStory',
          title: 'Mídia do Story',
          fields: [
            {
              name: 'tipo',
              title: 'Tipo de Mídia',
              type: 'string',
              options: { list: ['imagem', 'video'] }
            },
            {
              name: 'imagem',
              title: 'Upload da Imagem (se for foto)',
              type: 'image',
              hidden: ({ parent }) => parent?.tipo !== 'imagem'
            },
            {
              name: 'videoUrl',
              title: 'URL do Vídeo (se for vídeo)',
              type: 'url',
              hidden: ({ parent }) => parent?.tipo !== 'video',
              description: 'Para vídeos, guardamos apenas o link direto (.mp4) para economizar servidor e carregar rápido no app.'
            }
          ]
        }
      ]
    }
  ]
}