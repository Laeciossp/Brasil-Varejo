export default {
  name: 'shippingSettings',
  title: 'Configuração de Frete (API)',
  type: 'document',
  fields: [
    {
      name: 'activeProvider',
      title: 'Quem calcula o frete?',
      type: 'string',
      options: {
        list: [
          { title: '📦 Melhor Envio', value: 'melhor_envio' },
          { title: '🚛 Frenet', value: 'frenet' },
          { title: '📮 Correios Direto', value: 'correios' },
        ],
        layout: 'radio'
      }
    },
    {
      name: 'melhorEnvioToken',
      title: 'Token Melhor Envio',
      type: 'string',
      hidden: ({document}) => document?.activeProvider !== 'melhor_envio'
    },
    {
      name: 'originCep',
      title: 'CEP de Origem (Estoque)',
      type: 'string'
    }
  ]
}