import React from 'react'

export default {
  name: 'order',
  title: '📦 Pedidos & Reservas',
  type: 'document',
  groups: [
    { name: 'details', title: '📝 Detalhes da Compra', default: true },
    { name: 'passengers', title: '👥 Viajantes (Emissão)' }, 
    { name: 'logistics', title: '🚚 Frete / Logística' },
    { name: 'billing', title: '💲 Faturamento' },
    { name: 'admin', title: '⚙️ Admin & Fornecedores' }
  ],
  fields: [
    { name: 'orderNumber', title: 'Número do Pedido', type: 'string', readOnly: true, group: 'details' },
    
    { 
      name: 'locator', 
      title: 'Localizador Palastore (Código da Reserva)', 
      type: 'string', 
      group: 'details',
      description: 'Código de 6 letras gerado no momento da compra (Ex: A7X9P2)'
    },

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
            {
              name: 'fornecedor',
              title: 'Fornecedor (Origem do Serviço)',
              type: 'string',
              options: {
                list: [
                  { title: '✈️ Duffel (Voos Oficiais/NDC)', value: 'DUFFEL' },
                  { title: '✈️ Kiwi (Voos GDS/OTAs)', value: 'KIWI' },
                  { title: '🏨 Restel (Hotéis B2B)', value: 'RESTEL' },
                  { title: '🎟️ Viator (Passeios/Transfers)', value: 'VIATOR' },
                  { title: '📦 Estoque Próprio (Produtos Físicos)', value: 'PROPRIO' }
                ],
                layout: 'dropdown'
              },
              initialValue: 'PROPRIO'
            },
            { 
              name: 'externalId', 
              title: 'ID Externo (Offer ID / Booking Ref)', 
              type: 'string',
              description: 'O ID gerado pela Duffel, Kiwi ou Viator (Essencial para emissão no painel deles).'
            },
            {
              name: 'deep_link',
              title: 'Link de Emissão Direta (Kiwi Deep Link)',
              type: 'string',
              description: 'URL exclusiva para a agência concluir a compra diretamente na Kiwi.'
            },
            {
              name: 'booking_token',
              title: 'Token de Reserva (Kiwi Booking Token)',
              type: 'string',
              description: 'Token gerado pela Kiwi usado para automatização de compra via API.'
            },
            
            // 🚀 NOVO CAMPO: Detalhes estruturados do voo para exibir os logos e trechos no site
            {
              name: 'flightDetails',
              title: 'Detalhes Técnicos do Voo (Logos e Trechos)',
              type: 'object',
              fields: [
                { name: 'tier', title: 'Tarifa', type: 'string' },
                { name: 'pax', title: 'Passageiros', type: 'number' },
                { name: 'holdBags', title: 'Malas de Porão', type: 'number' },
                {
                  name: 'ida',
                  title: 'Trecho de Ida',
                  type: 'object',
                  fields: [
                    { name: 'origem', title: 'Origem', type: 'string' },
                    { name: 'destino', title: 'Destino', type: 'string' },
                    { name: 'companhiaPrincipal', title: 'Cia Principal', type: 'string' },
                    {
                      name: 'trechos',
                      title: 'Lista de Conexões / Voos',
                      type: 'array',
                      of: [{
                        type: 'object',
                        fields: [
                          { name: 'companhia', title: 'Código Cia (ex: G3, LA, AD)', type: 'string' },
                          { name: 'vooNumero', title: 'Número do Voo', type: 'string' },
                          { name: 'origemAero', title: 'Aeroporto Origem', type: 'string' },
                          { name: 'destinoAero', title: 'Aeroporto Destino', type: 'string' },
                          { name: 'partida', title: 'Data/Hora Partida', type: 'string' },
                          { name: 'chegada', title: 'Data/Hora Chegada', type: 'string' }
                        ]
                      }]
                    }
                  ]
                },
                {
                  name: 'volta',
                  title: 'Trecho de Volta',
                  type: 'object',
                  fields: [
                    { name: 'origem', title: 'Origem', type: 'string' },
                    { name: 'destino', title: 'Destino', type: 'string' },
                    { name: 'companhiaPrincipal', title: 'Cia Principal', type: 'string' },
                    {
                      name: 'trechos',
                      title: 'Lista de Conexões / Voos',
                      type: 'array',
                      of: [{
                        type: 'object',
                        fields: [
                          { name: 'companhia', title: 'Código Cia (ex: G3, LA, AD)', type: 'string' },
                          { name: 'vooNumero', title: 'Número do Voo', type: 'string' },
                          { name: 'origemAero', title: 'Aeroporto Origem', type: 'string' },
                          { name: 'destinoAero', title: 'Aeroporto Destino', type: 'string' },
                          { name: 'partida', title: 'Data/Hora Partida', type: 'string' },
                          { name: 'chegada', title: 'Data/Hora Chegada', type: 'string' }
                        ]
                      }]
                    }
                  ]
                }
              ]
            },

            { name: 'product', title: 'Vínculo (Produto Físico)', type: 'reference', to: [{ type: 'product' }] },
            { name: 'productName', title: 'Serviço / Produto', type: 'string' },
            { name: 'serviceType', title: 'Categoria do Serviço', type: 'string' },
            { name: 'variantName', title: 'Tarifa / Variação', type: 'string' },
            { name: 'description', title: 'Roteiro & Horários Detalhados', type: 'text', rows: 6 },
            { name: 'quantity', title: 'Quantidade (Pax)', type: 'number' },
            { name: 'price', title: 'Preço Unitário', type: 'number' },
            { name: 'imageUrl', title: 'Imagem', type: 'string' }
          ],
          preview: {
            select: { 
              title: 'productName', 
              subtitle: 'fornecedor',
              imageUrl: 'imageUrl' 
            },
            prepare({ title, subtitle, imageUrl }) {
              return {
                title: title,
                subtitle: subtitle ? `Fornecedor: ${subtitle}` : 'Sem detalhes adicionais',
                media: imageUrl ? React.createElement('img', { src: imageUrl, style: { objectFit: 'cover' } }) : undefined
              }
            }
          }
        }
      ]
    },

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
            { name: 'seatPreference', title: 'Poltrona / Preferência', type: 'string' },
            { name: 'email', title: 'E-mail do Passageiro', type: 'string' },
            { name: 'phone', title: 'Telefone do Passageiro', type: 'string' }
          ],
          preview: {
            select: { title: 'name', subtitle: 'cpf', seat: 'seatPreference' },
            prepare({ title, subtitle, seat }) {
              return { title: `👤 ${title || 'Sem Nome'}`, subtitle: `CPF: ${subtitle || '-'} | Assento: ${seat || 'Não definido'}` }
            }
          }
        }
      ]
    },

    { name: 'carrier', title: 'Forma de Envio / Operadora', type: 'string', group: 'logistics' },
    { name: 'shippingCost', title: 'Custo de Emissão/Frete', type: 'number', group: 'logistics' },
    { name: 'trackingCode', title: 'Código da Cia Aérea (PNR Oficial)', type: 'string', group: 'logistics' },
    { name: 'trackingUrl', title: 'Link de Rastreamento (Correios/Transportadora)', type: 'string', group: 'logistics' },
    {
      name: 'shippingAddress', title: 'Endereço de Entrega (Físicos)', type: 'object', group: 'logistics',
      fields: [
        { name: 'alias', type: 'string', title: 'Apelido (Casa/Trabalho)' }, { name: 'id', type: 'string', title: 'ID', hidden: true },
        { name: 'zip', type: 'string', title: 'CEP' }, { name: 'street', type: 'string', title: 'Rua' },
        { name: 'number', type: 'string', title: 'Número' }, { name: 'neighborhood', type: 'string', title: 'Bairro' },
        { name: 'city', type: 'string', title: 'Cidade' }, { name: 'state', type: 'string', title: 'UF' },
        { name: 'complement', type: 'string', title: 'Complemento' }
      ]
    },

    { name: 'totalAmount', title: 'Valor Total Pago', type: 'number', group: 'billing' },
    { name: 'paymentMethod', title: 'Método de Pagamento', type: 'string', group: 'billing' },
    {
      name: 'billingAddress',
      title: 'Endereço de Faturamento',
      type: 'object',
      group: 'billing',
      fields: [
        { name: 'alias', type: 'string', title: 'Apelido' }, { name: 'id', type: 'string', title: 'ID', hidden: true },
        { name: 'zip', type: 'string', title: 'CEP' }, { name: 'street', type: 'string', title: 'Rua' },
        { name: 'number', type: 'string', title: 'Número' }, { name: 'neighborhood', type: 'string', title: 'Bairro' },
        { name: 'city', type: 'string', title: 'Cidade' }, { name: 'state', type: 'string', title: 'UF' },
        { name: 'complement', type: 'string', title: 'Complemento' }
      ]
    },

    { 
      name: 'providerAdminLink', 
      title: 'Link de Emissão do Fornecedor (Deep Link)', 
      type: 'string', 
      group: 'admin',
      description: 'O link gerado pelo Firebase para você clicar e abrir direto o painel da Kiwi, Duffel ou Viator.' 
    },
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
    select: { 
      orderNumber: 'orderNumber', 
      locator: 'locator',
      customerName: 'customer.name', 
      status: 'status' 
    },
    prepare({ orderNumber, locator, customerName, status }) {
      const statusIcons = { pending: '🟡', paid: '🟢', shipped: '🎫', cancelled: '❌' }
      const displayId = locator ? `[${locator}]` : (orderNumber || 'Novo Pedido')
      
      return { 
        title: `${statusIcons[status] || '📦'} ${displayId} - ${customerName || 'Cliente'}`, 
        subtitle: status === 'pending' ? 'Aguardando Pagamento' : (status === 'paid' ? 'Pago - Pronto para Emitir' : status) 
      }
    }
  }
}