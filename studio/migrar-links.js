import { getCliClient } from 'sanity/cli'

// MÁGICA AQUI:
// Em vez de criar um client manual, pegamos o client já configurado do CLI.
// Ele puxa o ID e o Dataset corretos automaticamente do seu sanity.config.js
const client = getCliClient({ apiVersion: '2023-05-03' })

const runMigration = async () => {
  console.log('📡 Conectando usando a configuração do Sanity CLI...')
  
  // Imprime para conferir onde ele conectou
  const config = client.config()
  console.log(`🎯 Projeto: ${config.projectId}`)
  console.log(`🗄️  Dataset: ${config.dataset}`)

  // 1. Busca Home (tenta as duas grafias)
  const docs = await client.fetch(`*[_type == "homePage" || _type == "homepage"]`)
  
  console.log(`🔎 Encontrados ${docs.length} documentos de Home.`)

  if (docs.length === 0) {
    console.error('❌ ERRO: Ainda retornou 0. Vamos listar TODOS os tipos para debug:')
    // Se der erro, mostra o que EXISTE no banco para descobrirmos o nome
    const allTypes = await client.fetch(`array::unique(*[]._type)`)
    console.log('Tipos existentes no banco:', allTypes)
    return
  }

  const homePage = docs[0]
  console.log(`✅ Documento encontrado! Tipo: "${homePage._type}" | ID: ${homePage._id}`)

  // 2. Prepara a edição
  const currentBuilder = homePage.pageBuilder || []

  const newPageBuilder = currentBuilder.map(section => {
    
    // --- DEPARTAMENTOS ---
    if (section._type === 'departmentsSection' && section.items) {
      section.items = section.items.map(item => {
        if (item.link && !item.link.startsWith('/category/') && !item.link.startsWith('http')) {
          const cleanLink = item.link.startsWith('/') ? item.link.slice(1) : item.link;
          console.log(`🔧 Depto: ${item.name} -> /category/${cleanLink}`)
          return { ...item, link: `/category/${cleanLink}` }
        }
        return item
      })
    }

    // --- BANNERS ---
    if (section._type === 'featuredBanners' && section.banners) {
      section.banners = section.banners.map(banner => {
        if (banner.link && !banner.link.startsWith('/category/') && !banner.link.startsWith('http')) {
          const cleanLink = banner.link.startsWith('/') ? banner.link.slice(1) : banner.link;
          console.log(`🔧 Banner: ${banner.title} -> /category/${cleanLink}`)
          return { ...banner, link: `/category/${cleanLink}` }
        }
        return banner
      })
    }
    return section
  })

  // 3. Salva
  try {
    await client.patch(homePage._id).set({ pageBuilder: newPageBuilder }).commit()
    console.log('✅ SUCESSO! Links corrigidos.')
  } catch (err) {
    console.error('❌ Erro ao salvar:', err.message)
  }
}

runMigration()