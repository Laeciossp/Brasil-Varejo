export default {
  name: 'order',
  title: '📦 Pedidos',
  type: 'document',
  groups: [
    { name: 'details', title: '📝 Detalhes' },
    { name: 'logistics', title: '🚚 Logística' },
    { name: 'billing', title: '💲 Faturamento' },
    { name: 'admin', title: '⚙️ Admin' }
  ],
  fields: [
    { name: 'orderNumber', title: 'Número', type: 'string', readOnly: true, group: 'details' },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'details',
      options: {
        list: [
          { title: '🟡 Aguardando', value: 'pending' },
          { title: '🟢 Aprovado', value: 'paid' },
          { title: '🚚 Enviado', value: 'shipped' },
          { title: '❌ Cancelado', value: 'cancelled' }
        ],
        layout: 'dropdown'
      },
      initialValue: 'pending'
    },
    // --- CAMPOS FANTASMAS (Para não dar erro com pedidos velhos) ---
    { name: 'cpf', type: 'string', hidden: true },
    { name: 'customerEmail', type: 'string', hidden: true },
    { name: 'customerDocument', type: 'string', hidden: true },
    { name: 'document', type: 'string', hidden: true },
    { name: 'alias', type: 'string', hidden: true },
    { name: 'id', type: 'string', hidden: true },
    
    // --- DADOS REAIS ---
    {
      name: 'customer',
      title: 'Cliente',
      type: 'object',
      group: 'details',
      fields: [
        { name: 'name', type: 'string', title: 'Nome' },
        { name: 'email', type: 'string', title: 'Email' },
        { name: 'cpf', type: 'string', title: 'CPF' },
        { name: 'phone', type: 'string', title: 'Telefone' }
      ]
    },
    {
      name: 'items',
      title: 'Itens',
      type: 'array',
      group: 'details',
      of: [
        {
          type: 'object',
          title: 'Produto',
          fields: [
            { name: 'productName', title: 'Nome', type: 'string' },
            { name: 'variantName', title: 'Variação', type: 'string' },
            { name: 'color', title: 'Cor', type: 'string' },
            { name: 'size', title: 'Tamanho', type: 'string' },
            { name: 'quantity', title: 'Qtd', type: 'number' },
            { name: 'price', title: 'Preço', type: 'number' },
            { name: 'imageUrl', title: 'Imagem', type: 'string' }
          ],
          preview: {
            select: { title: 'productName', subtitle: 'variantName' }
          }
        }
      ]
    },
    {
      name: 'shippingAddress',
      title: 'Entrega',
      type: 'object',
      group: 'logistics',
      fields: [
        { name: 'zip', type: 'string' },
        { name: 'street', type: 'string' },
        { name: 'number', type: 'string' },
        { name: 'neighborhood', type: 'string' },
        { name: 'city', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'complement', type: 'string' }
      ]
    },
    {
      name: 'billingAddress',
      title: 'Faturamento',
      type: 'object',
      group: 'billing',
      fields: [
        { name: 'zip', type: 'string' },
        { name: 'street', type: 'string' },
        { name: 'number', type: 'string' },
        { name: 'neighborhood', type: 'string' },
        { name: 'city', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'complement', type: 'string' }
      ]
    },
    { name: 'totalAmount', title: 'Total', type: 'number', group: 'billing' },
    { name: 'paymentMethod', title: 'Método', type: 'string', group: 'billing' }
  ]
}