// schemas/order.js (Substitua tudo)

export default {
  name: 'order',
  title: '📦 Pedidos',
  type: 'document',
  groups: [
    { name: 'details', title: 'Detalhes' },
    { name: 'logistics', title: 'Logística' },
    { name: 'admin', title: 'Admin' }
  ],
  fields: [
    // --- IDENTIFICAÇÃO ---
    {
      name: 'orderNumber',
      title: 'Número do Pedido',
      type: 'string',
      readOnly: true,
      group: 'details'
    },
    {
      name: 'status',
      title: 'Status Atual',
      type: 'string',
      group: 'details',
      options: {
        list: [
          { title: '🟡 Aguardando Pagamento', value: 'pending' },
          { title: '🟢 Pagamento Aprovado', value: 'paid' },
          { title: '📄 Nota Fiscal Emitida', value: 'invoiced' },
          { title: '🚚 Em Transporte', value: 'shipped' },
          { title: '🏠 Entregue', value: 'delivered' },
          { title: '❌ Cancelado', value: 'cancelled' }
        ],
        layout: 'dropdown'
      },
      initialValue: 'pending'
    },

    // --- CAMPOS DE RASTREIO (AGORA NA RAIZ) ---
    // Isso corrige o erro "Unknown field found"
    {
      name: 'trackingCode',
      title: 'Código de Rastreio',
      type: 'string',
      description: 'Ex: AA123456789BR',
      group: 'logistics'
    },
    {
      name: 'trackingUrl',
      title: 'Link de Rastreio',
      type: 'url',
      description: 'Link direto para o site da transportadora',
      group: 'logistics'
    },
    {
      name: 'carrier',
      title: 'Transportadora',
      type: 'string',
      description: 'Ex: Correios, Jadlog',
      group: 'logistics'
    },
    {
      name: 'shippedAt',
      title: 'Data do Envio',
      type: 'datetime',
      group: 'logistics'
    },
    {
      name: 'deliveryEstimate', // Mantendo compatibilidade com seu código antigo
      title: 'Prazo / Serviço',
      type: 'string',
      group: 'logistics'
    },

    // --- CLIENTE ---
    {
      name: 'customerEmail',
      title: 'E-mail do Cliente',
      type: 'string',
      readOnly: true,
      group: 'details'
    },
    {
      name: 'customer',
      title: 'Dados do Cliente',
      type: 'object',
      group: 'details',
      fields: [
        { name: 'name', type: 'string', title: 'Nome' },
        { name: 'email', type: 'string', title: 'E-mail' },
        { name: 'cpf', type: 'string', title: 'CPF/CNPJ' }
      ]
    },

    // --- ENDEREÇO ---
    {
      name: 'shippingAddress',
      title: 'Endereço de Entrega',
      type: 'object',
      group: 'details',
      options: { collapsible: true, collapsed: true },
      fields: [
        { name: 'alias', title: 'Apelido', type: 'string' },
        { name: 'zip', type: 'string', title: 'CEP' },
        { name: 'street', type: 'string', title: 'Rua' },
        { name: 'number', type: 'string', title: 'Número' },
        { name: 'neighborhood', type: 'string', title: 'Bairro' },
        { name: 'city', type: 'string', title: 'Cidade' },
        { name: 'state', type: 'string', title: 'Estado' }
      ]
    },

    // --- ITENS ---
    {
      name: 'items',
      title: 'Itens do Pedido',
      type: 'array',
      group: 'details',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'productName', type: 'string' },
            { name: 'quantity', type: 'number' },
            { name: 'price', type: 'number' },
            { name: 'imageUrl', type: 'url' },
            { name: 'product', type: 'reference', to: [{type: 'product'}] },
            { name: 'productSlug', type: 'string' }
          ],
          preview: {
            select: { title: 'productName', subtitle: 'quantity', media: 'imageUrl' },
            prepare({title, subtitle, media}) {
              return { title, subtitle: `${subtitle}x unid.`, media }
            }
          }
        }
      ]
    },

    // --- PAGAMENTO ---
    {
      name: 'totalAmount',
      title: 'Valor Total',
      type: 'number',
      group: 'details'
    },
    {
      name: 'paymentMethod',
      title: 'Método Pagamento',
      type: 'string',
      group: 'details'
    },

    // --- SAC / MENSAGENS ---
    {
      name: 'hasUnreadMessage',
      title: 'Mensagem Não Lida',
      type: 'boolean',
      initialValue: false,
      group: 'admin'
    },
    {
      name: 'messages',
      title: 'Histórico de Mensagens',
      type: 'array',
      group: 'admin',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'user', type: 'string' },
            { name: 'text', type: 'text' },
            { name: 'date', type: 'datetime' },
            { name: 'staff', type: 'reference', to: [{type: 'staff'}] }
          ]
        }
      ]
    },
    
    // --- LEGADO (Para evitar perda de dados antigos) ---
    {
      name: 'logistics',
      title: 'Logística (Legado)',
      type: 'object',
      hidden: true, // Esconde do painel, mas mantém os dados salvos
      fields: [
        { name: 'trackingCode', type: 'string' },
        { name: 'trackingUrl', type: 'url' }
      ]
    }
  ],
  preview: {
    select: { title: 'orderNumber', subtitle: 'status' }
  }
}