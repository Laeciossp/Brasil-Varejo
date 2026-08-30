import React from 'react'

export default {
  name: 'order',
  title: '📦 Pedidos & Reservas',
  type: 'document',
  groups: [
    { name: 'details', title: '📝 Detalhes da Compra', default: true },
    { name: 'passengers', title: '👥 Viajantes (Emissão)' }, // <-- NOVA ABA ESTRUTURADA
    { name: 'logistics', title: '🚚 Frete / Logística' },
    { name: 'billing', title: '💲 Faturamento' },
    { name: 'admin', title: '⚙️ Admin & Chat' }
  ],
  fields: [
    { name: 'orderNumber', title: 'Número do Pedido', type: 'string', readOnly: true, group: 'details' },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'details',
      options: {
        list: [
          { title: '🟡 Aguardando', value: 'pending' },
          { title: '🟢 Aprovado / Pago', value: 'paid' },
          { title: '🎫 Emitido / Processando', value: 'shipped' },
          { title: '❌ Cancelado', value: 'cancelled' }
        ],
        layout: 'dropdown'
      },
      initialValue: 'pending'
    },
    
    // Campos Ocultos de Sistema
    { name: 'cpf', type: 'string', hidden: true },
    { name: 'customerEmail', type: 'string', hidden: true },
    { name: 'customerDocument', type: 'string', hidden: true },
    { name: 'document', type: 'string', hidden: true },
    { name: 'alias', type: 'string', hidden: true },
    { name: 'id', type: 'string', hidden: true },
    { name: 'hasUnreadMessage', type: 'boolean', hidden: true },
    
    {
      name: 'customer',
      title: 'Comprador Principal',
      type: 'object',
      group: 'details',
      fields: [
        { name: 'name', type: 'string', title: 'Nome' },
        { name: 'email', type: 'string', title: 'Email' },
        { name: 'cpf', type: 'string', title: 'CPF/CNPJ' },
        { name: 'phone', type: 'string', title: 'Telefone' }
      ]
    },

    {
      name: 'items',
      title: 'Produtos & Serviços Contratados',
      type: 'array',
      group: 'details',
      of: [
        {
          type: 'object',
          title: 'Item',
          fields: [
            { name: 'product', title: 'Vínculo (Produto Físico)', type: 'reference', to: [{ type: 'product' }] },
            { name: 'productName', title: 'Serviço / Produto', type: 'string' },
            { name: 'variantName', title: 'Tarifa / Variação', type: 'string' },
            { name: 'description', title: 'Detalhes da Reserva (Rota, Voo, Endereços)', type: 'text', rows: 5 },
            { name: 'quantity', title: 'Quantidade (Pax)', type: 'number' },
            { name: 'price', title: 'Preço Unitário', type: 'number' },
            { name: 'imageUrl', title: 'Imagem', type: 'string' }
          ],
          preview: {
            select: { title: 'productName', subtitle: 'description', imageUrl: 'imageUrl' },
            prepare({ title, subtitle, imageUrl }) {
              return {
                title: title,
                subtitle: subtitle ? subtitle.substring(0, 80) + '...' : 'Sem detalhes adicionais',
                media: imageUrl ? React.createElement('img', { src: imageUrl, style: { objectFit: 'cover' } }) : undefined
              }
            }
          }
        }
      ]
    },

    // --- NOVA SESSÃO: PASSAGEIROS ESTRUTURADOS ---
    {
      name: 'passengers',
      title: 'Dados para Emissão (Viajantes)',
      type: 'array',
      group: 'passengers',
      description: 'Lista exata dos passageiros vinculados a este pedido.',
      of: [
        {
          type: 'object',
          title: 'Viajante',
          fields: [
            { name: 'name', title: 'Nome Completo', type: 'string' },
            { name: 'cpf', title: 'CPF', type: 'string' },
            { name: 'rg', title: 'RG', type: 'string' },
            { name: 'rgIssuer', title: 'Órgão Emissor', type: 'string' },
            { name: 'dob', title: 'Data de Nascimento', type: 'string' },
            { name: 'gender', title: 'Gênero', type: 'string' },
            { name: 'nationality', title: 'Nacionalidade', type: 'string' },
            { name: 'passport', title: 'Passaporte', type: 'string' },
            { name: 'passportExpiry', title: 'Validade Passaporte', type: 'string' },
            { name: 'seatPreference', title: 'Preferência de Assento', type: 'string' },
            { name: 'email', title: 'E-mail do Passageiro', type: 'string' },
            { name: 'phone', title: 'Telefone do Passageiro', type: 'string' }
          ],
          preview: {
            select: { title: 'name', subtitle: 'cpf', seat: 'seatPreference' },
            prepare({ title, subtitle, seat }) {
              return { title: `👤 ${title || 'Sem Nome'}`, subtitle: `CPF: ${subtitle || '-'} | Assento: ${seat || 'Qualquer'}` }
            }
          }
        }
      ]
    },

    // Logística (Físico / Emissão)
    { name: 'carrier', title: 'Forma de Envio / Operadora', type: 'string', group: 'logistics' },
    { name: 'shippingCost', title: 'Custo de Emissão/Frete', type: 'number', group: 'logistics' },
    { name: 'trackingCode', title: 'Localizador (PNR) / Rastreio', type: 'string', group: 'logistics' },
    { name: 'trackingUrl', title: 'Link de Rastreamento', type: 'url', group: 'logistics' },
    {
      name: 'shippingAddress', title: 'Endereço de Entrega (Físicos)', type: 'object', group: 'logistics',
      fields: [
        { name: 'zip', type: 'string', title: 'CEP' }, { name: 'street', type: 'string', title: 'Rua' },
        { name: 'number', type: 'string', title: 'Número' }, { name: 'neighborhood', type: 'string', title: 'Bairro' },
        { name: 'city', type: 'string', title: 'Cidade' }, { name: 'state', type: 'string', title: 'UF' },
        { name: 'complement', type: 'string', title: 'Complemento' }
      ]
    },

    // Faturamento
    { name: 'totalAmount', title: 'Valor Total Pago', type: 'number', group: 'billing' },
    { name: 'paymentMethod', title: 'Método de Pagamento', type: 'string', group: 'billing' },

    // Admin & Chat
    { name: 'internalNotes', title: 'Notas Administrativas', type: 'text', rows: 3, group: 'admin' },
    {
      name: 'messages', title: '💬 Chat do Pedido', type: 'array', group: 'admin',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'user', title: 'Remetente', type: 'string', options: { list: [ { title: '👤 Cliente', value: 'cliente' }, { title: '🛡️ Agência', value: 'admin' } ], layout: 'radio' }, initialValue: 'admin' },
            { name: 'staff', title: 'Atendente', type: 'reference', to: [{ type: 'staff' }], hidden: ({ parent }) => parent?.user === 'cliente' },
            { name: 'text', title: 'Mensagem', type: 'text', rows: 2 },
            { name: 'date', title: 'Data', type: 'datetime', initialValue: () => new Date().toISOString(), readOnly: true }
          ]
        }
      ]
    }
  ],
  preview: {
    select: { orderNumber: 'orderNumber', customerName: 'customer.name', status: 'status' },
    prepare({ orderNumber, customerName, status }) {
      const statusIcons = { pending: '🟡', paid: '🟢', shipped: '🎫', cancelled: '❌' }
      return { title: `${statusIcons[status] || '📦'} ${orderNumber || 'Novo Pedido'} - ${customerName || 'Cliente'}`, subtitle: status === 'pending' ? 'Aguardando Pagamento' : (status === 'paid' ? 'Pago - Pronto para Emitir' : status) }
    }
  }
}