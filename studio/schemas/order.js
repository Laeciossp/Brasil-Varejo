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

    // --- CAMPOS FANTASMAS (CORREÇÃO DE ERRO "UNKNOWN FIELD") ---
    // Adicione estes campos EXATAMENTE assim para sumir o erro vermelho
    { name: 'cpf', type: 'string', hidden: true }, 
    { name: 'document', type: 'string', hidden: true },
    { name: 'customerDocument', type: 'string', hidden: true },
    { name: 'customerEmail', type: 'string', hidden: true },
    { name: 'alias', type: 'string', hidden: true },
    { name: 'id', type: 'string', hidden: true },

    // --- CLIENTE (ESTRUTURA CORRETA) ---
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

    // --- ITENS DO PEDIDO ---
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
            { name: 'variantName', title: 'Variação', type: 'string' }, 
            
            // Campos específicos
            { name: 'color', title: 'Cor', type: 'string' }, 
            { name: 'size', title: 'Tamanho', type: 'string' }, 
            { name: 'sku', title: 'SKU', type: 'string' }, 
            
            { name: 'quantity', title: 'Quantidade', type: 'number' },
            { name: 'price', title: 'Preço', type: 'number' },
            { name: 'imageUrl', title: 'Imagem URL', type: 'string' }, // String evita crash
            
            { name: 'product', title: 'Ref. Produto', type: 'reference', to: [{type: 'product'}] },
          ],
          preview: {
            select: { 
              title: 'productName', 
              subtitle: 'variantName',
              color: 'color',
              size: 'size',
              qty: 'quantity'
            },
            prepare({title, subtitle, color, size, qty}) {
              // Monta a descrição para não ficar "undefined"
              let details = [];
              if (subtitle && subtitle !== 'Padrão') details.push(subtitle);
              if (color) details.push(color);
              if (size) details.push(size);

              return { 
                title: `${qty}x ${title || 'PRODUTO SEM NOME'}`, 
                subtitle: details.join(' - ') || 'Sem detalhes'
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

    // --- LOGÍSTICA E FINANCEIRO ---
    { name: 'trackingCode', title: 'Código de Rastreio', type: 'string', group: 'logistics' },
    { name: 'carrier', title: 'Transportadora', type: 'string', group: 'logistics' },
    { name: 'shippingCost', title: 'Custo do Frete', type: 'number', group: 'billing' },
    { name: 'totalAmount', title: 'Valor Total', type: 'number', group: 'billing' },
    { name: 'paymentMethod', title: 'Método Pagamento', type: 'string', group: 'billing' },
    
    // --- ADMIN ---
    { name: 'internalNotes', title: 'Anotações Internas', type: 'text', group: 'admin' }
  ],
  preview: {
    select: { 
      title: 'orderNumber', 
      customer: 'customer.name', 
      status: 'status',
      total: 'totalAmount'
    },
    prepare({title, customer, status, total}) {
      const statusIcons = {
        pending: '🟡', paid: '🟢', invoiced: '📄', shipped: '🚚', delivered: '🏠', cancelled: '❌'
      };
      const valor = total ? `R$ ${total.toFixed(2)}` : '';
      return {
        title: `${statusIcons[status] || '⚪'} ${title || 'Novo'} - ${customer || 'Cliente'}`,
        subtitle: valor
      }
    }
  }
}