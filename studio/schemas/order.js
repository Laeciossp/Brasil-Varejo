// studio/schemas/order.js

export default {
  name: 'order',
  title: 'Pedidos',
  type: 'document',
  fields: [
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
          {title: '🟡 Aguardando Pagamento', value: 'pending'},
          {title: '🟢 Pagamento Aprovado', value: 'paid'},
          {title: '📄 Nota Fiscal Emitida', value: 'invoiced'},
          {title: '🚚 Em Transporte', value: 'shipped'},
          {title: '✅ Entregue', value: 'delivered'},
          {title: '🔴 Cancelado', value: 'cancelled'}
        ],
        layout: 'dropdown'
      }
    },
    {
      name: 'customer',
      title: 'Dados do Cliente',
      type: 'object',
      fields: [
        {name: 'name', type: 'string', title: 'Nome'},
        {name: 'email', type: 'string', title: 'E-mail'},
        {name: 'cpf', type: 'string', title: 'CPF/CNPJ'},
        {name: 'clerkId', type: 'string', title: 'ID do Usuário (Clerk)', readOnly: true}
      ]
    },
    {
      name: 'shippingAddress',
      title: 'Endereço de Entrega',
      type: 'text',
      rows: 3
    },
    {
      name: 'items',
      title: 'Itens Comprados',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'productName', type: 'string', title: 'Produto'},
            {name: 'quantity', type: 'number', title: 'Qtd'},
            {name: 'price', type: 'number', title: 'Preço Unitário (Na época)'},
            {
              name: 'productRef', 
              type: 'reference', 
              to: [{type: 'product'}], 
              title: 'Link para Produto'
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
                subtitle: `Qtd: ${subtitle}`
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
    // --- ÁREA DE OPERAÇÃO E LOGÍSTICA ---
    {
      name: 'logistics',
      title: 'Operação e Rastreio',
      type: 'object',
      options: {collapsible: true, collapsed: false},
      fields: [
        {
            name: 'selectedCarrier',
            title: 'Transportadora Escolhida',
            type: 'string'
        },
        {
            name: 'trackingCode',
            title: 'Código de Rastreio',
            type: 'string'
        },
        {
            name: 'trackingUrl',
            title: 'Link de Rastreio Direto',
            type: 'url'
        },
        {
            name: 'invoiceFile',
            title: 'Arquivo da Nota Fiscal (PDF/XML)',
            type: 'file',
            description: 'Faça upload da NF aqui. O sistema disparará o e-mail para o cliente.'
        }
      ]
    },
    {
      name: 'createdAt',
      title: 'Data da Compra',
      type: 'datetime',
      initialValue: (new Date()).toISOString(),
      readOnly: true
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
        delivered: '✅',
        cancelled: '🔴'
      }
      return {
        title: `${statusMap[status] || ''} Pedido #${title}`,
        subtitle: subtitle
      }
    }
  }
}