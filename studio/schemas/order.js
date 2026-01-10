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
              name: 'productRef', 
              type: 'reference', 
              to: [{type: 'product'}], 
              title: 'Produto Original (Link)' 
            }
          ],
          preview: {
            select: {
              title: 'productName',
              subtitle: 'quantity'
            },
            prepare({title, subtitle}) {
              return {
                title: title,
                subtitle: `${subtitle}x unidades`
              }
            }
          }
        }
      ]
    },
    {
      name: 'totalAmount',
      title: 'Valor Total (R$)',
      type: 'number'
    },

    // --- LOGÍSTICA (Mantido para compatibilidade com seu Profile.jsx) ---
    {
      name: 'logistics',
      title: 'Operação e Logística',
      type: 'object',
      fields: [
        { name: 'selectedCarrier', title: 'Transportadora (Nome do Serviço)', type: 'string' },
        { name: 'trackingCode', title: 'Código de Rastreio', type: 'string' },
        { name: 'trackingUrl', title: 'Link de Rastreio (Opcional)', type: 'url' },
        { name: 'shippedAt', title: 'Data do Envio', type: 'datetime' }
      ]
    },

    // --- NOVOS CAMPOS (Chat e Cancelamento) ---
    {
      name: 'cancellationReason',
      title: 'Motivo do Cancelamento',
      type: 'text',
      description: 'Preenchido automaticamente quando o cliente ou admin cancela.',
      hidden: ({document}) => document?.status !== 'cancelled' // Só aparece se estiver cancelado
    },
    {
      name: 'messages',
      title: '💬 Histórico de Mensagens (SAC)',
      description: 'Chat entre cliente e loja referente a este pedido.',
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
              options: { list: ['cliente', 'admin'] } 
            },
            { 
              name: 'text', 
              title: 'Texto', 
              type: 'text' 
            },
            { 
              name: 'date', 
              title: 'Data/Hora', 
              type: 'datetime', 
              initialValue: () => new Date().toISOString() 
            }
          ],
          preview: {
            select: {
              title: 'text',
              subtitle: 'user',
              date: 'date'
            },
            prepare({title, subtitle, date}) {
              const emoji = subtitle === 'admin' ? '🛡️' : '👤';
              return {
                title: `${emoji} ${title}`,
                subtitle: new Date(date).toLocaleString()
              }
            }
          }
        }
      ]
    }
  ],
  // Visualização bonita na lista de pedidos
  preview: {
    select: {
      title: 'orderNumber',
      subtitle: 'customer.email',
      status: 'status',
      total: 'totalAmount'
    },
    prepare({title, subtitle, status, total}) {
      const statusMap = { 
        pending: '🟡', 
        paid: '🟢', 
        shipped: '🚚', 
        delivered: '🏠', 
        cancelled: '❌' 
      };
      
      return {
        title: `${statusMap[status] || '⚪'} Pedido #${title}`,
        subtitle: `${subtitle} | R$ ${total ? total.toFixed(2) : '0.00'}`
      }
    }
  }
}