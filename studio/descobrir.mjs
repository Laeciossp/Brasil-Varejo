import { createClient } from '@sanity/client'

// --- COLE SEU TOKEN AQUI ---
const MEU_TOKEN = "COLE_SEU_TOKEN_AQUI_NOVAMENTE" 

const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  apiVersion: '2023-05-03',
  useCdn: false,
  token: MEU_TOKEN
})

const diagnostico = async () => {
  console.log('🔍 Varrendo o banco de dados...')
  
  // 1. Lista todos os tipos de documentos existentes
  const types = await client.fetch(`array::unique(*[]._type)`)
  console.log('📂 Tipos encontrados:', types)

  // 2. Tenta achar especificamente variações de home
  const homeCount = await client.fetch(`count(*[_type in ["home", "homePage", "homepage"]])`)
  console.log(`🏠 Quantidade de documentos com nome de home: ${homeCount}`)
  
  if (homeCount === 0) {
      console.log('⚠️ AVISO: Nenhum documento de home publicado. Verifique se você clicou em "Publish" no Sanity Studio.')
  }
}

diagnostico()