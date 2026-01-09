// studio/schemas/carrierConfig.js

export default {
  name: 'carrierConfig',
  title: 'Gerenciador de Transportadoras',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Título da Configuração',
      type: 'string',
      initialValue: 'Filtro de Transportadoras',
      readOnly: true
    },
    {
      name: 'carriers',
      title: 'Regras por Transportadora',
      type: 'array',
      description: 'Configure quais serviços aparecem para o cliente.',
      of: [
        {
          type: 'object',
          title: 'Transportadora',
          fields: [
            {
              name: 'serviceCode',
              title: 'Código do Serviço (API)',
              type: 'string',
              description: 'Ex: "04014" (Sedex), "1" (PAC), "3" (Jadlog Package). Se deixar vazio, aplica a todas desta empresa.',
            },
            {
              name: 'carrierName',
              title: 'Nome Original (Referência)',
              type: 'string',
              description: 'Apenas para sua organização. Ex: Jadlog.'
            },
            {
              name: 'label',
              title: 'Nome para o Cliente',
              type: 'string',
              description: 'Como aparece no site. Ex: "Entrega Expressa" em vez de "Sedex".'
            },
            {
              name: 'isActive',
              title: 'Ativo?',
              type: 'boolean',
              initialValue: true
            },
            {
              name: 'additionalPrice',
              title: 'Taxa Extra (R$)',
              type: 'number',
              description: 'Valor a ser somado ao frete (embalagem, manuseio).',
              initialValue: 0
            },
            {
              name: 'additionalDays',
              title: 'Margem de Prazo (Dias)',
              type: 'number',
              description: 'Dias a somar na estimativa de entrega.',
              initialValue: 0
            }
          ],
          preview: {
            select: {
              title: 'carrierName',
              subtitle: 'label',
              active: 'isActive',
              code: 'serviceCode'
            },
            prepare({title, subtitle, active, code}) {
              const status = active ? '🟢' : '🔴';
              return {
                title: `${status} ${title || 'Nova Regra'}`,
                subtitle: `${subtitle || ''} [Cód: ${code || 'Todos'}]`
              }
            }
          }
        }
      ]
    }
  ]
}