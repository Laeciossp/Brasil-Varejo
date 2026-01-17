import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Clone Marketplace', 

  projectId: 'o4upb251', 
  dataset: 'production',

  plugins: [
    // CONFIGURAÇÃO DO MENU LATERAL (Desk Structure)
    structureTool({
      structure: (S) =>
        S.list()
          .title('Painel Administrativo')
          .items([
            // --- 1. LISTA DE PRIORIDADE: MENSAGENS DO SAC ---
            S.listItem()
              .title('💬 MENSAGENS NÃO LIDAS')
              .icon(() => '🔔')
              .child(
                S.documentList()
                  .title('Clientes Esperando Resposta')
                  .filter('_type == "order" && hasUnreadMessage == true')
              ),
            
            S.divider(),
            
            // --- 2. ITENS PADRÃO DO SISTEMA ---
            S.documentTypeListItem('order').title('Todos os Pedidos'),
            S.documentTypeListItem('product').title('Produtos'),
            S.documentTypeListItem('customer').title('Clientes'),
            S.documentTypeListItem('staff').title('Equipe de Suporte'), // <--- CADASTRO DE ATENDENTES
            S.divider(),
            S.documentTypeListItem('category').title('Categorias'),
            S.documentTypeListItem('shippingSettings').title('Fretes'),
            
            // ... resto dos itens automáticos (se houver)
            ...S.documentTypeListItems().filter(listItem => 
              !['order', 'product', 'customer', 'staff', 'category', 'shippingSettings'].includes(listItem.getId())
            )
          ])
    }), 
    visionTool()
  ],

  schema: {
    types: schemaTypes,
  },
})