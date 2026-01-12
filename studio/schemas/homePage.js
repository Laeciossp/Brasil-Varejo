// schemas/homePage.js
export default {
  name: 'homePage',
  title: 'Configuração da Home',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Título Interno',
      type: 'string',
      initialValue: 'Página Inicial'
    },
    {
      name: 'pageBuilder',
      title: 'Construtor de Página (Arraste para organizar)',
      type: 'array',
      of: [
        { type: 'hero' },              // Banner Principal
        { type: 'featuredBanners' },    // Trio de Banners
        { type: 'departmentsSection' }, // Departamentos
        { type: 'productCarousel' }     // Carrossel de Produtos (Pode adicionar quantos quiser!)
      ]
    }
  ]
}