export default {
  name: 'category',
  title: 'Categorias (Árvore de Produtos)',
  type: 'document',
  icon: () => '🌳', 
  fields: [
    {
      name: 'isActive',
      title: 'ATIVO NO SITE?',
      type: 'boolean',
      initialValue: false,
      description: 'Ligue esta chave apenas quando quiser que esta categoria apareça no site.'
    },
    // --- NOVO CAMPO: DESTAQUE ---
    {
      name: 'isHighlighted',
      title: 'DESTAQUE NO MENU PRINCIPAL?',
      type: 'boolean',
      initialValue: false,
      description: 'Ligue se quiser que esta categoria apareça na barra branca do topo (ao lado do botão Departamentos).'
    },
    // ----------------------------
    {
      name: 'title',
      title: 'Nome da Categoria',
      type: 'string',
      validation: Rule => Rule.required().error('O nome da categoria é obrigatório.')
    },
    {
      name: 'slug',
      title: 'Link (Slug)',
      type: 'slug',
      description: 'Este é o endereço que aparecerá na URL do site.',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'parent',
      title: 'Esta categoria pertence a quem? (Categoria Pai)',
      type: 'reference',
      to: [{type: 'category'}],
      description: 'Deixe EM BRANCO se for um Departamento Principal (Nível 1). Se for subcategoria, selecione o pai aqui.'
    },
    {
      name: 'description',
      title: 'Descrição (SEO & Google)',
      type: 'text',
      rows: 3,
      description: 'Breve descrição para aparecer nos resultados do Google.'
    }
  ],
  preview: {
    select: {
      title: 'title',
      active: 'isActive',
      highlight: 'isHighlighted', // Adicionei para visualização
      parentTitle: 'parent.title'
    },
    prepare({ title, active, highlight, parentTitle }) {
      const statusEmoji = active ? '🟢' : '🔴';
      const star = highlight ? '⭐ ' : ''; // Estrela se for destaque
      
      let typeEmoji = '';
      let subtitle = '';

      if (!parentTitle) {
        typeEmoji = '🏢 DEPARTAMENTO';
        subtitle = 'Topo da Árvore';
      } else {
        typeEmoji = '📂 SUBCATEGORIA';
        subtitle = `Dentro de: ${parentTitle}`;
      }

      return {
        title: `${statusEmoji} ${star}${title}`,
        subtitle: `${typeEmoji} | ${subtitle}`
      }
    }
  },
  orderings: [
    {
      title: 'Nome (A-Z)',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}]
    }
  ]
}