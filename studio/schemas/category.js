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
    // --- CAMPO: DESTAQUE ---
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

    // ============================================================
    // INÍCIO DA CONFIGURAÇÃO DO BANNER (HERO)
    // ============================================================
    {
      name: 'heroBanner',
      title: 'Banner de Topo (Hero)',
      type: 'object',
      description: 'Configure o banner visual que aparece no topo da página desta categoria.',
      options: {
        collapsible: true, // Permite minimizar para não ocupar espaço
        collapsed: false,  // Já começa aberto para facilitar edição
      },
      fields: [
        // 1. Seletor: Define se vai mostrar campos de Vídeo ou Imagem
        {
          name: 'mediaType',
          title: 'Tipo de Mídia',
          type: 'string',
          options: {
            list: [
              { title: 'Imagem (Com recorte mobile)', value: 'image' },
              { title: 'Vídeo (MP4)', value: 'video' },
            ],
            layout: 'radio',
            direction: 'horizontal'
          },
          initialValue: 'image',
        },

        // 2. Campo de Imagem (Aparece só se mediaType == 'image')
        {
          name: 'desktopImage',
          title: 'Imagem do Banner',
          type: 'image',
          hidden: ({ parent }) => parent?.mediaType !== 'image', 
          options: {
            hotspot: true, // Permite escolher o foco para o corte mobile automático
          },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Texto Alternativo (SEO)',
              description: 'Descreva a imagem para o Google e leitores de tela.'
            },
          ],
        },

        // 3. Campo de Vídeo (Aparece só se mediaType == 'video')
        {
          name: 'videoFile',
          title: 'Arquivo de Vídeo (MP4)',
          type: 'file',
          hidden: ({ parent }) => parent?.mediaType !== 'video',
          description: 'Envie vídeos curtos, leves e sem áudio (formato MP4).',
          options: {
            accept: 'video/mp4',
          },
        },

        // 4. Textos e Links Opcionais
        {
          name: 'heading',
          title: 'Título no Banner (Opcional)',
          type: 'string',
          description: 'Texto grande sobre a imagem. Se vazio, mostra só a imagem limpa.'
        },
        {
          name: 'subheading',
          title: 'Subtítulo (Opcional)',
          type: 'text',
          rows: 2,
        },
        {
          name: 'link',
          title: 'Link de Destino (Opcional)',
          type: 'url',
          description: 'Caso o cliente clique no banner, para onde ele vai?',
           validation: (Rule) => Rule.uri({
            scheme: ['http', 'https', 'mailto', 'tel'],
            allowRelative: true, // Permite links internos como /produtos/solar
          }),
        },
      ]
    },
    // ============================================================
    // FIM DO BANNER
    // ============================================================

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
      highlight: 'isHighlighted',
      parentTitle: 'parent.title'
    },
    prepare({ title, active, highlight, parentTitle }) {
      const statusEmoji = active ? '🟢' : '🔴';
      const star = highlight ? '⭐ ' : ''; 
      
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