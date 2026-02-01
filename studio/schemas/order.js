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

    // --- CAMPOS RAIZ (Aceita os dados do Worker sem erro) ---
    { 
      name: 'cpf', 
      title: 'CPF (Sistema Antigo)', 
      type: 'string', 
      group: 'details',
      readOnly: true 
    },
    { 
      name: 'customerEmail', 
      title: 'Email (Sistema Antigo)', 
      type: 'string', 
      hidden: true 
    },
    { 
      name: 'customerDocument', // Caso o worker envie este
      type: 'string', 
      hidden: true 
    },

    // --- CLIENTE (Estrutura Nova) ---
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
            // O Worker pode mandar 'name', 'title' ou 'productName'. Aceitamos todos.
            { name: 'productName', title: 'Nome (Site)', type: 'string' },
            { name: 'title', title: 'Nome (Worker)', type: 'string' }, 
            { name: 'name', title: 'Nome (Genérico)', type: 'string' },
            
            { name: 'variantName', title: 'Variação', type: 'string' }, 
            { name: 'color', title: 'Cor', type: 'string' }, 
            { name: 'size', title: 'Tamanho', type: 'string' }, 
            { name: 'sku', title: 'SKU', type: 'string' }, 
            
            { name: 'quantity', title: 'Quantidade', type: 'number' },
            { name: 'price', title: 'Preço', type: 'number' },
            { name: 'imageUrl', title: 'Imagem URL', type: 'string' },
            
            { name: 'product', title: 'Ref. Produto', type: 'reference', to: [{type: 'product'}] },
          ],
          preview: {
            select: { 
              pName: 'productName', 
              tName: 'title',
              genName: 'name',
              variant: 'variantName',
              color: 'color',
              size: 'size',
              qty: 'quantity'
            },
            prepare({pName, tName, genName, variant, color, size, qty}) {
              // Lógica inteligente para achar o nome onde ele estiver
              const finalName = pName || tName || genName || 'Produto sem nome';
              
              let details = [];
              if (variant && variant !== 'Padrão') details.push(variant);
              if (color) details.push(color);
              if (size) details.push(size);

              return { 
                title: `${qty}x ${finalName}`, 
                subtitle: details.join(' | ')
              }
            }
          }
        }
      ]
    },

    // --- ENDEREÇOS ---
    {
      name: 'shippingAddress',
      title: 'Endereço de Entrega',
      type: 'object',
      group: 'logistics',
      fields: [
        { name: 'zip', type: 'string', title: 'CEP' },
        { name: 'street', type: 'string', title: 'Rua' },
        { name: 'number', type: 'string', title: 'Número' },
        { name: 'complement', type: 'string', title: 'Complemento' },
        { name: 'neighborhood', type: 'string', title: 'Bairro' },
        { name: 'city', type: 'string', title: 'Cidade' },
        { name: 'state', type: 'string', title: 'Estado' }
      ]
    },
    // Endereço de Faturamento (Opcional, pois o worker talvez não preencha)
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
        { name: 'complement', type: 'string', title: 'Complemento' },
        { name: 'neighborhood', type: 'string', title: 'Bairro' },
        { name: 'city', type: 'string', title: 'Cidade' },
        { name: 'state', type: 'string', title: 'Estado' }
      ]
    },

    // --- OUTROS ---
    { name: 'trackingCode', title: 'Código de Rastreio', type: 'string', group: 'logistics' },
    { name: 'carrier', title: 'Transportadora', type: 'string', group: 'logistics' },
    { name: 'shippingCost', title: 'Custo do Frete', type: 'number', group: 'billing' },
    { name: 'totalAmount', title: 'Valor Total', type: 'number', group: 'billing' },
    { name: 'paymentMethod', title: 'Método Pagamento', type: 'string', group: 'billing' },
    { name: 'internalNotes', title: 'Anotações Internas', type: 'text', group: 'admin' },
    { name: 'hasUnreadMessage', title: 'Mensagem Não Lida', type: 'boolean', initialValue: false, group: 'admin' }
  ],
  preview: {
    select: { 
      title: 'orderNumber', 
      cName: 'customer.name', 
      // Tenta pegar nome antigo se o novo falhar
      oldCpf: 'cpf', 
      status: 'status',
      total: 'totalAmount'
    },
    prepare({title, cName, oldCpf, status, total}) {
      const statusIcons = { pending: '🟡', paid: '🟢', shipped: '🚚', delivered: '🏠', cancelled: '❌' };
      const clientInfo = cName || (oldCpf ? `CPF: ${oldCpf}` : 'Cliente Site');
      
      return {
        title: `${statusIcons[status] || '⚪'} ${title || 'Novo'} - ${clientInfo}`,
        subtitle: total ? `R$ ${total.toFixed(2)}` : ''
      }
    }
  }
}