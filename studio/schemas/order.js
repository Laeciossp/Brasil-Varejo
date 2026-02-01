export default {
  name: 'order',
  title: '📦 Pedidos',
  type: 'document',
  groups: [
    { name: 'details', title: '📝 Detalhes' },
    { name: 'logistics', title: '🚚 Logística' },
    { name: 'billing', title: '💲 Faturamento' }, // Novo grupo para organizar financeiro
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

    // --- CLIENTE (DADOS FISCAIS) ---
    {
      name: 'customer',
      title: 'Dados do Cliente',
      type: 'object',
      group: 'details',
      fields: [
        { name: 'name', type: 'string', title: 'Nome Completo' },
        { name: 'email', type: 'string', title: 'E-mail' },
        { name: 'cpf', type: 'string', title: 'CPF / CNPJ' }, // Crucial para NF
        { name: 'phone', type: 'string', title: 'Telefone/WhatsApp' }
      ]
    },

    // --- ITENS DO PEDIDO (CORRIGIDO PARA RECEBER VARIAÇÕES) ---
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
            { name: 'variantName', title: 'Variação Completa', type: 'string', description: 'Ex: Azul - M' }, // Novo
            { name: 'color', title: 'Cor', type: 'string' }, // Novo (Para colunas separadas no gestor)
            { name: 'size', title: 'Tamanho', type: 'string' }, // Novo (Para colunas separadas no gestor)
            { name: 'sku', title: 'SKU (Código)', type: 'string' }, // Novo (Essencial para Estoque/NF)
            
            { name: 'quantity', title: 'Quantidade', type: 'number' },
            { name: 'price', title: 'Preço Unitário', type: 'number' },
            { name: 'imageUrl', title: 'Imagem', type: 'url' },
            
            { name: 'product', title: 'Ref. Produto', type: 'reference', to: [{type: 'product'}] },
            { name: 'productSlug', title: 'Slug', type: 'string' }
          ],
          preview: {
            select: { 
              title: 'productName', 
              subtitle: 'variantName', 
              qty: 'quantity',
              media: 'imageUrl' 
            },
            prepare({title, subtitle, qty, media}) {
              return { 
                title: `${qty}x ${title}`, 
                subtitle: subtitle || 'Padrão', 
                media 
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

    // --- ENDEREÇO DE FATURAMENTO (OPCIONAL - PARA NF) ---
    {
      name: 'billingAddress',
      title: 'Endereço de Faturamento (Se diferente)',
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

    // --- LOGÍSTICA ---
    {
      name: 'trackingCode',
      title: 'Código de Rastreio',
      type: 'string',
      group: 'logistics'
    },
    {
      name: 'trackingUrl',
      title: 'Link de Rastreio',
      type: 'url',
      group: 'logistics'
    },
    {
      name: 'carrier',
      title: 'Transportadora Escolhida',
      type: 'string',
      group: 'logistics'
    },
    {
      name: 'shippingCost', // Adicionado para saber quanto foi cobrado de frete
      title: 'Custo do Frete',
      type: 'number',
      group: 'billing'
    },

    // --- FINANCEIRO ---
    {
      name: 'totalAmount',
      title: 'Valor Total do Pedido',
      type: 'number',
      group: 'billing'
    },
    {
      name: 'paymentMethod',
      title: 'Método de Pagamento',
      type: 'string',
      group: 'billing'
    },
    
    // --- ADMIN / MENSAGENS ---
    {
      name: 'hasUnreadMessage',
      title: 'Mensagem Não Lida',
      type: 'boolean',
      initialValue: false,
      group: 'admin'
    },
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
        shipped: '🚚',
        delivered: '🏠',
        cancelled: '❌'
      };
      return {
        title: `${statusMap[status] || ''} Pedido #${title}`,
        subtitle: subtitle || 'Cliente Desconhecido'
      }
    }
  }
}