// schemas/departments.js
export default {
  name: 'departmentsSection', // Mudei o nome para não conflitar se você já tiver um schema 'department'
  title: 'Carrossel de Departamentos',
  type: 'object',
  fields: [
    {
      name: 'title',
      title: 'Título da Seção',
      type: 'string',
      initialValue: 'Navegue por Departamentos'
    },
    {
      name: 'items',
      title: 'Departamentos',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', title: 'Nome', type: 'string' },
            { name: 'image', title: 'Ícone/Foto', type: 'image' },
            { name: 'link', title: 'Link da Categoria', type: 'string' }
          ]
        }
      ]
    }
  ],
  preview: {
    prepare() {
      return { title: 'Seção: Departamentos' }
    }
  }
}