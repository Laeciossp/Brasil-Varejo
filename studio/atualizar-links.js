import { createClient } from '@sanity/client'

// Configuração do Cliente usando seu ID
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: process.env.SANITY_TOKEN // O token será injetado automaticamente pelo comando exec
})

const runMigration = async () => {
  console.log('🚀 Iniciando atualização dos links para o formato /category/...')

  // 1. Busca o documento da Home Page
  const homePage = await client.fetch(`*[_type == "homePage"][0]`)

  if (!homePage) {
    console.error('❌ Erro: Documento "homePage" não encontrado no Sanity.')
    return
  }

  // 2. Percorre os blocos da Home (Page Builder)
  const newPageBuilder = homePage.pageBuilder.map(section => {
    
    // --- CORRIGIR: Seção de Departamentos ---
    if (section._type === 'departmentsSection' && section.items) {
      section.items = section.items.map(item => {
        if (item.link) {
            // Se o link NÃO começa com /category/ e NÃO é um link externo (http)
            if (!item.link.startsWith('/category/') && !item.link.startsWith('http')) {
                // Remove a barra inicial se houver (para evitar //category)
                const cleanSlug = item.link.startsWith('/') ? item.link.slice(1) : item.link;
                console.log(`🔧 Corrigindo Depto: "${item.name}" -> /category/${cleanSlug}`)
                return { ...item, link: `/category/${cleanSlug}` }
            }
        }
        return item
      })
    }

    // --- CORRIGIR: Banners de Destaque ---
    if (section._type === 'featuredBanners' && section.banners) {
      section.banners = section.banners.map(banner => {
        if (banner.link) {
            if (!banner.link.startsWith('/category/') && !banner.link.startsWith('http')) {
                const cleanSlug = banner.link.startsWith('/') ? banner.link.slice(1) : banner.link;
                console.log(`🔧 Corrigindo Banner: "${banner.title}" -> /category/${cleanSlug}`)
                return { ...banner, link: `/category/${cleanSlug}` }
            }
        }
        return banner
      })
    }

    return section
  })

  // 3. Salva as alterações no Sanity
  try {
    await client
      .patch(homePage._id) // Pega o ID da Home
      .set({ pageBuilder: newPageBuilder }) // Substitui o pageBuilder pelo corrigido
      .commit()
    
    console.log('✅ Sucesso! Todos os links foram atualizados para incluir /category/.')
  } catch (err) {
    console.error('❌ Erro ao salvar:', err.message)
  }
}

runMigration()