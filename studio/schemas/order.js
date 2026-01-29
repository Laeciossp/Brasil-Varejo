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
    // --- NOTIFICAÇÃO DE SUPORTE ---
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

    // --- DADOS DE CONTATO (RAIZ) ---
    {
      name: 'customerEmail',
      title: 'E-mail do Cliente (Principal)',
      type: 'string',
      readOnly: true
    },
    {
      name: 'customerDocument',
      title: 'CPF/CNPJ do Cliente (Principal)',
      type: 'string',
      readOnly: true
    },

    // --- DADOS DO CLIENTE (OBJETO LEGADO) ---
    {
      name: 'customer',
      title: 'Dados do Cliente (Objeto)',
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
        { name: 'alias', title: 'Apelido do Endereço', type: 'string' },
        { name: 'name', title: 'Nome do Destinatário', type: 'string' },
        { name: 'document', title: 'CPF na Nota (Endereço)', type: 'string' },
        { name: 'cpf', title: 'CPF (Campo Legado)', type: 'string', hidden: true },
        { name: 'id', title: 'ID Interno', type: 'string', readOnly: true },

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
            },
            { name: 'imageUrl', type: 'url', title: 'Foto do Produto (Snapshot)' },
            // Novos campos para variantes (opcional, mas bom ter)
            { name: 'productSlug', type: 'string', title: 'Slug (Link)' },
            { name: 'sku', type: 'string', title: 'SKU' }
          ],
          preview: {
            select: {
              title: 'productName',
              subtitle: 'quantity',
              media: 'imageUrl'
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

    // --- LOGÍSTICA E RASTREIO (CORRIGIDO: NA RAIZ) ---
    // Estes campos agora estão na raiz para casar com o frontend e corrigir o erro
    {
      name: 'carrier', // Mudei de 'selectedCarrier' para 'carrier' para padronizar
      title: 'Transportadora',
      type: 'string',
      description: 'Ex: Correios, Jadlog'
    },
    {
      name: 'shippingMethod',
      title: 'Prazo / Serviço',
      type: 'string',
      description: 'Ex: SEDEX - 2 dias'
    },
    {
      name: 'trackingCode',
      title: 'Código de Rastreio',
      type: 'string'
    },
    {
      name: 'trackingUrl',
      title: 'Link de Rastreio',
      type: 'url'
    },
    {
      name: 'shippedAt',
      title: 'Data do Envio',
      type: 'datetime'
    },

    // --- CANCELAMENTO ---
    {
      name: 'cancellationReason',
      title: 'Motivo do Cancelamento',
      type: 'text',
      hidden: ({document}) => document?.status !== 'cancelled'
    },

    // --- CHAT (SAC) ---
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
      subtitle: 'customerEmail',
      status: 'status',
      total: 'totalAmount',
      unread: 'hasUnreadMessage'
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
        subtitle: `${subtitle || 'Cliente'} | R$ ${total ? total.toFixed(2) : '0.00'}`
      }
    }
  }
}