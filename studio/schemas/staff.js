// schemas/staff.js
export default {
  name: 'staff',
  title: 'Equipe de Suporte',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nome do Atendente',
      type: 'string',
    },
    {
      name: 'role',
      title: 'Cargo / Função',
      type: 'string', // Ex: Gerente, Suporte N1
      initialValue: 'Suporte'
    },
    {
      name: 'avatar',
      title: 'Foto do Perfil',
      type: 'image',
      options: { hotspot: true }
    }
  ]
}