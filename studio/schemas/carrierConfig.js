// studio/schemas/carrierConfig.js

export default {
  name: 'carrierConfig',
  title: '⚙️ Config. Transportadoras',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Título Interno',
      type: 'string',
      initialValue: 'Gerenciador de Transportadoras',
      readOnly: true
    },
    {
      name: 'carriers',
      title: 'Lista de Transportadoras',
      type: 'array',
      of: [
        {
          type: 'object',
          title: 'Transportadora',
          fields: [
            {
              name: 'isActive',
              title: 'ATIVO?',
              type: 'boolean',
              initialValue: true,
              description: 'Desmarque para parar de oferecer esta opção.'
            },
            {
              name: 'name',
              title: 'Nome da Transportadora',
              type: 'string',
              description: 'Ex: Correios, Jadlog, Azul Cargo'
            },
            {
              name: 'serviceName',
              title: 'Nome do Serviço (Exibido no Checkout)',
              type: 'string',
              description: 'Ex: SEDEX Express, .Package, Amanhã'
            },
            {
              name: 'logoUrl',
              title: 'URL do Logo (PNG/JPG)',
              type: 'url',
              description: 'Copie o link da logo da internet.'
            },
            {
              name: 'trackingUrlTemplate',
              title: 'Modelo de Link de Rastreio',
              type: 'string',
              description: 'Use {CODE} onde vai o código. Ex: https://rastreio.com/{CODE}'
            },
            {
              name: 'additionalPrice',
              title: 'Taxa Extra (R$)',
              type: 'number',
              initialValue: 0
            },
            {
              name: 'additionalDays',
              title: 'Dias Extras de Prazo',
              type: 'number',
              initialValue: 0
            }
          ],
          preview: {
            select: {
              title: 'name',
              subtitle: 'serviceName',
              active: 'isActive'
            },
            prepare({title, subtitle, active}) {
              // REMOVEMOS O JSX (<img...>) PARA NÃO TRAVAR O DEPLOY
              const statusEmoji = active ? '🟢' : '🔴';
              return {
                title: `${statusEmoji} ${title}`,
                subtitle: subtitle
              }
            }
          }
        }
      ]
    }
  ]
}