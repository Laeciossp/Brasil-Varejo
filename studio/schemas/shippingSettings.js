export default {
  name: 'shippingSettings',
  title: '🚚 Config. Frete e API',
  type: 'document',
  fields: [
    {
      name: 'originCep',
      title: 'CEP de Origem (Estoque)', // Aqui é só o nome do campo
      type: 'string',
      description: 'De onde seus produtos saem. Ex: 01001-000'
    },
    {
      name: 'provider',
      title: 'Provedor de Frete Principal',
      type: 'string',
      options: {
        list: [
          { title: 'Melhor Envio (API)', value: 'melhor_envio' },
          { title: 'Tabela Manual / Fixa', value: 'manual' }
        ],
        layout: 'radio'
      },
      initialValue: 'melhor_envio'
    },
    {
      name: 'apiToken',
      title: 'Token de Integração (Melhor Envio)',
      type: 'string',
      description: 'Cole o Token Gerado no painel do Melhor Envio aqui.',
      hidden: ({document}) => document?.provider !== 'melhor_envio'
    },
    {
      name: 'handlingTime',
      title: 'Dias de Manuseio (Separação)',
      type: 'number',
      description: 'Dias adicionados ao prazo da transportadora.',
      initialValue: 1
    }
  ]
}