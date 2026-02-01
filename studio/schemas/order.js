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

    // --- CLIENTE ---
    {
      name: 'customer',
      title: 'Dados do Cliente',
      type: 'object',
      group: 'details',
      fields: [
        { name: 'name', type: 'string', title: 'Nome Completo' },
        { name: 'email', type: 'string', title: 'E-mail' },
        { name: 'cpf', type: 'string', title: 'CPF / CNPJ' },
        { name: 'phone', type: 'string', title: 'Telefone/WhatsApp' }
      ]
    },

    // --- ITENS DO PEDIDO (CORRIGIDO O ERRO DE CRASH) ---
    {
      name: 'items',
      title: 'Itens do Pedido',
      type: 'array',
      group: 'details',
      of: [
        {
          type: 'object',
          title: 'Produto',
          fields: [
            { name: 'productName', title: 'Nome do Produto', type: 'string' },
            { name: 'variantName', title: 'Variação Completa', type: 'string' }, 
            
            { name: 'color', title: 'Cor', type: 'string' }, 
            { name: 'size', title: 'Tamanho', type: 'string' }, 
            { name: 'sku', title: 'SKU', type: 'string' }, 
            
            { name: 'quantity', title: 'Quantidade', type: 'number' },
            { name: 'price', title: 'Preço Unitário', type: 'number' },
            { name: 'imageUrl', title: 'Imagem URL', type: 'url' },
            
            { name: 'product', title: 'Ref. Produto', type: 'reference', to: [{type: 'product'}] },
            { name: 'productSlug', title: 'Slug', type: 'string' }
          ],
          preview: {
            select: { 
              title: 'productName', 
              subtitle: 'variantName',
              qty: 'quantity',
              // REMOVI 'media' AQUI PARA NÃO DAR ERRO DE "TAG NAME" COM URL EXTERNA
            },
            prepare({title, subtitle, qty}) {
              return { 
                title: `${qty}x ${title}`, 
                subtitle: subtitle || 'Item Padrão'
              }
            }
          }
        }
      ]
    },

    // --- ENDEREÇO DE ENTREGA ---
    {
      name: 'shippingAddress',
      title: 'Endereço de Entrega',
      type: 'object',
      group: 'logistics',
      fields: [
        { name: 'zip', type: 'string', title: 'CEP' },
        { name: 'street', type: 'string', title: 'Rua' },
        { name: 'number', type: 'string', title: 'Número' },
        { name: 'neighborhood', type: 'string', title: 'Bairro' },
        { name: 'city', type: 'string', title: 'Cidade' },
        { name: 'state', type: 'string', title: 'Estado' },
        { name: 'complement', type: 'string', title: 'Complemento' }
      ]
    },

    // --- FATURAMENTO ---
    {
      name: 'billingAddress',
      title: 'Endereço de Faturamento',
      type: 'object',
      group: 'billing',
      options: { collapsible: true, collapsed: true },
      fields: [
        { name: 'zip', type: 'string', title: 'CEP' },
        { name: 'street', type: 'string', title: 'Rua' },
        { name: 'number', type: 'string', title: 'Número' },
        { name: 'neighborhood', type: 'string', title: 'Bairro' },
        { name: 'city', type: 'string', title: 'Cidade' },
        { name: 'state', type: 'string', title: 'Estado' }
      ]
    },

    // --- LOGÍSTICA E VALORES ---
    {
      name: 'trackingCode',
      title: 'Código de Rastreio',
      type: 'string',
      group: 'logistics'
    },
    {
      name: 'carrier',
      title: 'Transportadora',
      type: 'string',
      group: 'logistics'
    },
    {
      name: 'shippingCost',
      title: 'Custo do Frete',
      type: 'number',
      group: 'billing'
    },
    {
      name: 'totalAmount',
      title: 'Valor Total',
      type: 'number',
      group: 'billing'
    },
    {
      name: 'paymentMethod',
      title: 'Método Pagamento',
      type: 'string',
      group: 'billing'
    },
    
    // --- ADMIN ---
    {
      name: 'internalNotes',
      title: 'Anotações Internas',
      type: 'text',
      group: 'admin'
    }
  ],
  preview: {
    select: { 
      title: 'orderNumber', 
      subtitle: 'customer.name', 
      status: 'status'
    },
    prepare({title, subtitle, status}) {
      const statusMap = {
        pending: '🟡',
        paid: '🟢',
        invoiced: '📄',
        shipped: '🚚',
        delivered: '🏠',
        cancelled: '❌'
      };
      return {
        title: `${statusMap[status] || ''} ${title || 'Novo Pedido'}`,
        subtitle: subtitle || 'Cliente não identificado'
      }
    }
  }
}