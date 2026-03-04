import React from 'react'

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
    
    // --- CAMPOS OCULTOS/LEGADO ---
    { name: 'cpf', type: 'string', hidden: true },
    { name: 'customerEmail', type: 'string', hidden: true },
    { name: 'customerDocument', type: 'string', hidden: true },
    { name: 'document', type: 'string', hidden: true },
    { name: 'alias', type: 'string', hidden: true },
    { name: 'id', type: 'string', hidden: true },
    { name: 'hasUnreadMessage', type: 'boolean', title: 'Tem mensagem não lida?', hidden: true },
    
    // --- DADOS DO CLIENTE ---
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

    // --- ITENS DO PEDIDO ---
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
            {
              name: 'product',
              title: 'Produto Original',
              type: 'reference',
              to: [{ type: 'product' }]
            },
            { name: 'productName', title: 'Nome', type: 'string' },
            { name: 'variantName', title: 'Variação', type: 'string' },
            { name: 'color', title: 'Cor', type: 'string' },
            { name: 'size', title: 'Tamanho', type: 'string' },
            { name: 'quantity', title: 'Qtd', type: 'number' },
            { name: 'price', title: 'Preço', type: 'number' },
            { name: 'imageUrl', title: 'Imagem', type: 'string' }
          ],
          preview: {
            select: {
              title: 'productName',
              subtitle: 'variantName',
              imageUrl: 'imageUrl'
            },
            prepare({ title, subtitle, imageUrl }) {
              return {
                title: title,
                subtitle: subtitle,
                media: imageUrl ? React.createElement('img', { 
                  src: imageUrl, 
                  alt: title,
                  style: { objectFit: 'cover', height: '100%', width: '100%' } 
                }) : undefined
              }
            }
          }
        }
      ]
    },

    // --- LOGÍSTICA E ENTREGA ---
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
      group: 'logistics'
    },
    // NOVOS CAMPOS AQUI:
    {
      name: 'trackingCode',
      title: 'Código de Rastreamento',
      type: 'string',
      group: 'logistics'
    },
    {
      name: 'trackingUrl',
      title: 'Link de Rastreamento',
      type: 'url',
      group: 'logistics'
    },
    {
      name: 'shippingAddress',
      // ... restante do código do endereço
      title: 'Endereço de Entrega',
      type: 'object',
      group: 'logistics',
      fields: [
        { name: 'alias', type: 'string', title: 'Apelido (Casa/Trabalho)' },
        { name: 'id', type: 'string', title: 'ID', hidden: true },
        { name: 'zip', type: 'string', title: 'CEP' },
        { name: 'street', type: 'string', title: 'Rua' },
        { name: 'number', type: 'string', title: 'Número' },
        { name: 'neighborhood', type: 'string', title: 'Bairro' },
        { name: 'city', type: 'string', title: 'Cidade' },
        { name: 'state', type: 'string', title: 'UF' },
        { name: 'complement', type: 'string', title: 'Complemento' }
      ]
    },

    // --- FATURAMENTO ---
    {
      name: 'totalAmount', 
      title: 'Valor Total', 
      type: 'number', 
      group: 'billing' 
    },
    { 
      name: 'paymentMethod', 
      title: 'Método de Pagamento', 
      type: 'string', 
      group: 'billing' 
    },
    {
      name: 'billingAddress',
      title: 'Endereço de Faturamento',
      type: 'object',
      group: 'billing',
      fields: [
        { name: 'alias', type: 'string', title: 'Apelido' },
        { name: 'id', type: 'string', title: 'ID', hidden: true },
        { name: 'zip', type: 'string' },
        { name: 'street', type: 'string' },
        { name: 'number', type: 'string' },
        { name: 'neighborhood', type: 'string' },
        { name: 'city', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'complement', type: 'string' }
      ]
    },

    // --- ADMIN / NOTAS ---
    { 
      name: 'internalNotes', 
      title: 'Notas Internas / Sistema', 
      type: 'text', 
      rows: 3,
      group: 'admin' 
    },

    // --- CHAT / MENSAGENS ---
    {
      name: 'messages',
      title: '💬 Chat do Pedido',
      type: 'array',
      group: 'details',
      of: [
        {
          type: 'object',
          fields: [
            { 
              name: 'user', 
              title: 'Remetente', 
              type: 'string',
              options: {
                list: [
                  { title: '👤 Cliente', value: 'cliente' },
                  { title: '🛡️ Equipe / Admin', value: 'admin' }
                ],
                layout: 'radio'
              },
              initialValue: 'admin'
            },
            {
              name: 'staff',
              title: 'Atendente',
              type: 'reference',
              to: [{ type: 'staff' }],
              hidden: ({ parent }) => parent?.user === 'cliente'
            },
            { 
              name: 'text', 
              title: 'Mensagem', 
              type: 'text',
              rows: 2
            },
            { 
              name: 'date', 
              title: 'Data/Hora', 
              type: 'datetime', 
              initialValue: () => new Date().toISOString(),
              readOnly: true
            }
          ],
          preview: {
            select: {
              title: 'text',
              subtitle: 'user',
              date: 'date',
              staffName: 'staff.name',
              staffImage: 'staff.avatar'
            },
            prepare({ title, subtitle, date, staffName, staffImage }) {
              const isClient = subtitle === 'cliente';
              const senderName = isClient ? '👤 Cliente' : (staffName || '🛡️ Admin');
              
              return {
                title: title,
                subtitle: `${senderName} - ${date ? new Date(date).toLocaleString('pt-BR') : ''}`,
                media: staffImage
              }
            }
          }
        }
      ]
    }
  ],
  // --- PREVIEW PRINCIPAL DO PEDIDO (RESTAURADO) ---
  preview: {
    select: {
      orderNumber: 'orderNumber',
      customerName: 'customer.name',
      status: 'status'
    },
    prepare({ orderNumber, customerName, status }) {
      const statusIcons = {
        pending: '🟡',
        paid: '🟢',
        shipped: '🚚',
        cancelled: '❌'
      }
      return {
        title: `${statusIcons[status] || '📦'} ${orderNumber || 'Novo Pedido'} - ${customerName || 'Cliente'}`,
        subtitle: status === 'pending' ? 'Aguardando Pagamento' : (status === 'paid' ? 'Pago' : status)
      }
    }
  }
}