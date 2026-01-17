export default {
  name: 'order',
  title: '📦 Pedidos',
  type: 'document',
  fields: [
    // --- IDENTIFICAÇÃO ---
    {
      name: 'orderNumber',
      title: 'Número do Pedido',
      type: 'string',
      readOnly: true
    },
    // --- NOTIFICAÇÃO DE SUPORTE (NOVO) ---
    {
      name: 'hasUnreadMessage',
      title: '🔴 Mensagem Não Lida (Cliente)',
      type: 'boolean',
      initialValue: false,
      description: 'Marcado automaticamente quando o cliente envia mensagem. Desmarque ao responder.'
    },
    {
      name: 'status',
      title: 'Status Atual',
      type: 'string',
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

    // --- DADOS DO CLIENTE ---
    {
      name: 'customer',
      title: 'Dados do Cliente',
      type: 'object',
      fields: [
        { name: 'name', type: 'string', title: 'Nome' },
        { name: 'email', type: 'string', title: 'E-mail' },
        { name: 'cpf', type: 'string', title: 'CPF/CNPJ' }
      ]
    },

    // --- ENDEREÇO DE ENTREGA ---
    {
      name: 'shippingAddress',
      title: '📍 Endereço de Entrega',
      type: 'object',
      options: { collapsible: true, collapsed: false },
      fields: [
        { name: 'zip', type: 'string', title: 'CEP' },
        { name: 'street', type: 'string', title: 'Rua' },
        { name: 'number', type: 'string', title: 'Número' },
        { name: 'neighborhood', type: 'string', title: 'Bairro' },
        { name: 'city', type: 'string', title: 'Cidade' },
        { name: 'state', type: 'string', title: 'Estado (UF)' },
        { name: 'complement', type: 'string', title: 'Complemento' }
      ]
    },

    // --- CARRINHO DE COMPRAS ---
    {
      name: 'items',
      title: 'Itens do Pedido',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'productName', type: 'string', title: 'Nome do Produto' },
            { name: 'quantity', type: 'number', title: 'Quantidade' },
            { name: 'price', type: 'number', title: 'Preço Unitário' },
            { 
              name: 'product', 
              type: 'reference', 
              to: [{type: 'product'}], 
              title: 'Produto Original (Link)' 
            }
          ],
          preview: {
            select: {
              title: 'productName',
              subtitle: 'quantity',
              media: 'product.images.0'
            },
            prepare({title, subtitle, media}) {
              return {
                title: title,
                subtitle: `${subtitle}x unidades`,
                media: media
              }
            }
          }
        }
      ]
    },

    // --- PAGAMENTO E TOTAIS ---
    {
      name: 'totalAmount',
      title: 'Valor Total (R$)',
      type: 'number'
    },
    {
      name: 'paymentMethod',
      title: '💳 Método de Pagamento',
      type: 'string',
      options: {
        list: [
          { title: 'Pix', value: 'pix' },
          { title: 'Cartão de Crédito', value: 'credit_card' },
          { title: 'Boleto', value: 'ticket' }
        ]
      }
    },

    // --- LOGÍSTICA ---
    {
      name: 'logistics',
      title: 'Operação e Logística',
      type: 'object',
      fields: [
        { name: 'selectedCarrier', title: 'Transportadora', type: 'string' },
        { name: 'shippingMethod', title: 'Prazo / Serviço', type: 'string' }, 
        { name: 'trackingCode', title: 'Código de Rastreio', type: 'string' },
        { name: 'trackingUrl', title: 'Link de Rastreio', type: 'url' },
        { name: 'shippedAt', title: 'Data do Envio', type: 'datetime' }
      ]
    },

    // --- CANCELAMENTO ---
    {
      name: 'cancellationReason',
      title: 'Motivo do Cancelamento',
      type: 'text',
      hidden: ({document}) => document?.status !== 'cancelled'
    },

    // --- CHAT (SAC) ATUALIZADO ---
    {
      name: 'messages',
      title: '💬 Histórico de Mensagens (SAC)',
      type: 'array',
      of: [
        {
          type: 'object',
          title: 'Mensagem',
          fields: [
            { 
              name: 'user', 
              title: 'Autor', 
              type: 'string', 
              options: { list: [
                { title: '👤 Cliente', value: 'cliente' }, 
                { title: '🛡️ Suporte', value: 'admin' }
              ]} 
            },
            // VINCULA O ATENDENTE PARA MOSTRAR FOTO
            {
              name: 'staff',
              title: 'Atendente (Se for Suporte)',
              type: 'reference',
              to: [{ type: 'staff' }],
              hidden: ({ parent }) => parent?.user === 'cliente'
            },
            { name: 'text', title: 'Texto', type: 'text' },
            { 
              name: 'date', 
              title: 'Data/Hora', 
              type: 'datetime', 
              initialValue: () => new Date().toISOString() 
            }
          ],
          preview: {
            select: { title: 'text', subtitle: 'user', date: 'date', staffName: 'staff.name' },
            prepare({title, subtitle, date, staffName}) {
              const isSupport = subtitle === 'admin';
              return {
                title: `${isSupport ? '🛡️' : '👤'} ${title}`,
                subtitle: `${isSupport && staffName ? staffName : subtitle} - ${new Date(date).toLocaleString()}`
              }
            }
          }
        }
      ]
    }
  ],
  
  preview: {
    select: {
      title: 'orderNumber',
      subtitle: 'customer.email',
      status: 'status',
      total: 'totalAmount',
      unread: 'hasUnreadMessage' // Mostra bolinha vermelha na lista se tiver msg
    },
    prepare({title, subtitle, status, total, unread}) {
      const statusMap = { 
        pending: '🟡', 
        paid: '🟢', 
        invoiced: '📄',
        shipped: '🚚', 
        delivered: '🏠', 
        cancelled: '❌' 
      };
      
      const unreadAlert = unread ? '🔴 ' : '';
      
      return {
        title: `${unreadAlert}${statusMap[status] || '⚪'} Pedido #${title || 'Sem Número'}`,
        subtitle: `${subtitle} | R$ ${total ? total.toFixed(2) : '0.00'}`
      }
    }
  }
}