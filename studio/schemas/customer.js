// studio/schemas/customer.js

export default {
  name: 'customer',
  title: 'Clientes (Perfil)',
  type: 'document',
  fields: [
    {
      name: 'email',
      title: 'E-mail (Identificador)',
      type: 'string',
      readOnly: true
    },
    {
      name: 'name',
      title: 'Nome Completo',
      type: 'string'
    },
    {
      name: 'personType',
      title: 'Tipo de Pessoa',
      type: 'string',
      options: {
        list: [
          { title: 'Pessoa Física (CPF)', value: 'fisica' },
          { title: 'Pessoa Jurídica (CNPJ)', value: 'juridica' }
        ],
        layout: 'radio'
      },
      initialValue: 'fisica'
    },
    {
      name: 'cpf_cnpj',
      title: 'CPF ou CNPJ',
      type: 'string'
    },
    {
      name: 'addresses',
      title: 'Meus Endereços',
      type: 'array',
      of: [
        {
          type: 'object',
          title: 'Endereço',
          fields: [
            { name: 'alias', title: 'Apelido (Ex: Casa, Trabalho)', type: 'string' },
            { name: 'cep', title: 'CEP', type: 'string' },
            { name: 'street', title: 'Rua', type: 'string' },
            { name: 'number', title: 'Número', type: 'string' },
            { name: 'complement', title: 'Complemento', type: 'string' },
            { name: 'district', title: 'Bairro', type: 'string' },
            { name: 'city', title: 'Cidade', type: 'string' },
            { name: 'state', title: 'Estado (UF)', type: 'string' },
          ],
          preview: {
            select: {
              title: 'alias',
              subtitle: 'street'
            }
          }
        }
      ]
    }
  ]
}