export default {
  name: 'apiConfig',
  title: '🔌 Controle de APIs',
  type: 'document',
  groups: [
    { name: 'voos', title: '✈️ Voos', default: true },
    { name: 'hoteis', title: '🏨 Hotéis' },
    { name: 'passeios', title: '🎟️ Passeios' }
  ],
  fields: [
    {
      name: 'title',
      title: 'Identificador',
      type: 'string',
      initialValue: 'Configuração Mestre de Fornecedores',
      readOnly: true,
      hidden: true
    },
    // ==========================================
    // CHAVES DE VOOS
    // ==========================================
    {
      name: 'activeDuffel',
      title: '🟢 Ligar API da Duffel (Aéreas Oficiais/NDC)',
      type: 'boolean',
      group: 'voos',
      description: 'Se desmarcado, o site interrompe a busca de tarifas oficiais (Light, Plus, Max) e a exibição do mapa de assentos dinâmico.',
      initialValue: true
    },
    {
      name: 'activeKiwi',
      title: '🟢 Ligar API da Kiwi (Agregador GDS)',
      type: 'boolean',
      group: 'voos',
      description: 'Se desmarcado, o site interrompe a busca das tarifas básicas simuladas com escolha de janela/corredor.',
      initialValue: true
    },
    // ==========================================
    // CHAVES DE HOTÉIS E PASSEIOS
    // ==========================================
    {
      name: 'activeRestel',
      title: '🟢 Ligar API da Restel (Hotéis B2B)',
      type: 'boolean',
      group: 'hoteis',
      description: 'Habilita ou desabilita a busca de quartos e tarifas da Restel Hotels.',
      initialValue: true
    },
    {
      name: 'activeViator',
      title: '🟢 Ligar API da Viator (Passeios e Tickets)',
      type: 'boolean',
      group: 'passeios',
      description: 'Controla a vitrine de passeios e disponibilidade em tempo real.',
      initialValue: true
    }
  ],
  preview: {
    prepare() {
      return { 
        title: '🔌 Painel Mestre de APIs (Liga/Desliga)',
        subtitle: 'Gerencie quais fornecedores estão visíveis para os clientes'
      }
    }
  }
}