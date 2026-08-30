export default {
  name: 'customer',
  title: 'Clientes (Perfil)',
  type: 'document',
  groups: [
    { name: 'profile', title: '👤 Dados Pessoais', default: true },
    { name: 'passengers', title: '👥 Viajantes Salvos' },
    { name: 'addresses', title: '📍 Endereços' }
  ],
  fields: [
    { name: 'email', title: 'E-mail (Identificador)', type: 'string', readOnly: true, group: 'profile' },
    { name: 'name', title: 'Nome Completo', type: 'string', group: 'profile' },
    {
      name: 'personType', title: 'Tipo de Pessoa', type: 'string', group: 'profile',
      options: { list: [ { title: 'Pessoa Física (CPF)', value: 'fisica' }, { title: 'Pessoa Jurídica (CNPJ)', value: 'juridica' } ], layout: 'radio' },
      initialValue: 'fisica'
    },
    { name: 'cpf_cnpj', title: 'CPF ou CNPJ', type: 'string', group: 'profile' },
    
    {
      name: 'passengers',
      title: 'Viajantes Salvos',
      type: 'array',
      group: 'passengers',
      of: [
        {
          type: 'object',
          title: 'Viajante',
          fields: [
            { name: 'id', type: 'string', hidden: true },
            { name: 'name', title: 'Nome Completo', type: 'string' },
            { name: 'relationship', title: 'Parentesco', type: 'string' },
            { name: 'dob', title: 'Data de Nascimento', type: 'string' },
            { name: 'gender', title: 'Gênero', type: 'string' },
            { name: 'cpf', title: 'CPF', type: 'string' },
            { name: 'rg', title: 'RG', type: 'string' },
            { name: 'rgIssuer', title: 'Órgão Emissor', type: 'string' },
            { name: 'nationality', title: 'Nacionalidade', type: 'string' },
            { name: 'passport', title: 'Passaporte', type: 'string' },
            { name: 'passportExpiry', title: 'Validade do Passaporte', type: 'string' },
            { name: 'email', title: 'E-mail', type: 'string' },
            { name: 'phone', title: 'Telefone', type: 'string' },
            { name: 'seatPreference', title: 'Preferência de Assento', type: 'string' }
          ],
          preview: { select: { title: 'name', subtitle: 'cpf' } }
        }
      ]
    },

    {
      name: 'addresses',
      title: 'Meus Endereços',
      type: 'array',
      group: 'addresses',
      of: [
        {
          type: 'object',
          title: 'Endereço',
          fields: [
            { name: 'alias', title: 'Apelido', type: 'string' },
            { name: 'cep', title: 'CEP', type: 'string' },
            { name: 'street', title: 'Rua', type: 'string' },
            { name: 'number', title: 'Número', type: 'string' },
            { name: 'complement', title: 'Complemento', type: 'string' },
            { name: 'district', title: 'Bairro', type: 'string' },
            { name: 'city', title: 'Cidade', type: 'string' },
            { name: 'state', title: 'Estado (UF)', type: 'string' },
          ],
          preview: { select: { title: 'alias', subtitle: 'street' } }
        }
      ]
    }
  ]
}