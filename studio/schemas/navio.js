export default {
  name: 'navio',
  title: '🚢 Navios e Cabines',
  type: 'document',
  fields: [
    {
      name: 'nome',
      title: 'Nome do Navio',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: { source: 'nome', maxLength: 96 }
    },
    {
      name: 'companhia',
      title: 'Companhia Marítima',
      type: 'string',
      options: {
        list: [
          { title: 'Royal Caribbean', value: 'Royal Caribbean' },
          { title: 'Celebrity Cruises', value: 'Celebrity Cruises' },
          { title: 'Azamara', value: 'Azamara' },
          { title: 'Costa Cruzeiros', value: 'Costa Cruzeiros' }
        ]
      }
    },

    {
      name: 'codigoOperadora',
      title: '🔑 Chave Mestra (Código da Operadora)',
      description: 'Código exato que a R11 envia (Ex: FR para Freedom, WY para Wonder)',
      type: 'string'
    },
    {
      name: 'imagemPrincipal',
      title: 'Foto Ampla do Navio (Capa)',
      type: 'image',
      options: { hotspot: true }
    },
    {
      name: 'decks',
      title: '🗺️ Plantas dos Decks',
      description: 'Mapeamento de cada andar do navio',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'numero', title: 'Número do Deck (Ex: Deck 7)', type: 'string' },
            { name: 'plantaImagem', title: 'Imagem da Planta', type: 'image' }
          ],
          preview: {
            select: { title: 'numero', media: 'plantaImagem' }
          }
        }
      ]
    },
    {
      name: 'categoriasCabine',
      title: '🛏️ Categorias de Cabines',
      description: 'Blocos principais de cabines e suas variações',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'metacategoria',
              title: 'Tipo Geral',
              type: 'string',
              options: {
                list: ['Interna', 'Externa (Vista Mar)', 'Varanda', 'Suíte']
              }
            },
            { name: 'nomeAmigavel', title: 'Nome Comercial (Ex: Com Vista para o Mar)', type: 'string' },
            { name: 'descricaoLimpa', title: 'Descrição Premium (Sem Lixo Técnico)', type: 'text' },
            { name: 'imagemHD', title: 'Foto da Cabine (HD)', type: 'image' },
            {
              name: 'variacoes',
              title: 'Variações Específicas (E1, B2, etc)',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    { name: 'codigo', title: 'Código da Tarifa (Ex: E1, I2)', type: 'string' },
                    { name: 'tamanho', title: 'Metragem (Ex: 16m²)', type: 'string' },
                    { name: 'ocupacao', title: 'Ocupação (Ex: Até 4 hóspedes)', type: 'string' },
                    { name: 'decksLocalizacao', title: 'Localização (Ex: Deck 2, Deck 1)', type: 'string' }
                  ],
                  preview: {
                    select: { title: 'codigo', subtitle: 'tamanho' }
                  }
                }
              ]
            }
          ],
          preview: {
            select: { title: 'nomeAmigavel', subtitle: 'metacategoria', media: 'imagemHD' }
          }
        }
      ]
    }
  ]
}