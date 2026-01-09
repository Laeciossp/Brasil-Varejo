export default {
  name: 'category',
  title: 'Departamentos e Categorias',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Nome da Categoria',
      type: 'string', // Ex: "Celulares"
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Link Amigável',
      type: 'slug',
      options: { source: 'title', maxLength: 96 }
    },
    {
      name: 'isActive',
      title: 'Visível no Site?',
      type: 'boolean',
      initialValue: true,
      description: 'Desmarque para ocultar esta categoria do menu temporariamente.'
    },
    {
      name: 'isRoot',
      title: 'É Departamento Principal?',
      type: 'boolean',
      initialValue: false,
      description: 'Marque SIM se deve aparecer na primeira lista (Ex: Informática, Móveis).'
    },
    {
      name: 'parent',
      title: 'Categoria Mãe (Opcional)',
      type: 'reference',
      to: [{type: 'category'}],
      description: 'Se esta for uma subcategoria, selecione a mãe aqui (Ex: Selecione "Informática" se esta for "Notebooks").'
    },
    {
      name: 'icon',
      title: 'Ícone (Opcional)',
      type: 'image',
      description: 'Ícone para o menu (estilo Mercado Livre/Magalu)'
    }
  ]
}