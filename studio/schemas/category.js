// studio/schemas/category.js

export default {
  name: 'category',
  title: 'Categorias',
  type: 'document',
  fields: [
    {
      name: 'isActive',
      title: 'ATIVO NO SITE?',
      type: 'boolean',
      initialValue: true,
      description: 'Se desligar, essa categoria some do menu e a página dela para de funcionar.'
    },
    {
      name: 'title',
      title: 'Nome da Categoria',
      type: 'string',
    },
    {
      name: 'slug',
      title: 'Link (Slug)',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
    },
    {
      name: 'isRoot',
      title: 'É Departamento Principal?',
      type: 'boolean',
      initialValue: false,
      description: 'Marque se for um departamento raiz (Ex: Tecnologia, Moda, Casa).'
    },
    {
      name: 'parent',
      title: 'Categoria Mãe (Opcional)',
      type: 'reference',
      to: [{type: 'category'}],
      description: 'Se esta for uma subcategoria, escolha a quem ela pertence.'
    },
    {
      name: 'description',
      title: 'Descrição (SEO)',
      type: 'text',
      rows: 3
    }
  ],
  // --- AQUI ESTÁ A MÁGICA VISUAL ---
  preview: {
    select: {
      title: 'title',
      active: 'isActive',
      isRoot: 'isRoot',
      parentName: 'parent.title'
    },
    prepare({ title, active, isRoot, parentName }) {
      const statusEmoji = active ? '🟢' : '🔴 [OFF]';
      const typeEmoji = isRoot ? '🏢 Dep.' : '📂 Cat.';
      const subtitle = parentName ? `Filho de: ${parentName}` : (isRoot ? 'Departamento Principal' : 'Categoria Solta');

      return {
        title: `${statusEmoji} ${title}`,
        subtitle: `${typeEmoji} | ${subtitle}`
      }
    }
  }
}