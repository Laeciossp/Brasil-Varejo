import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

// Configuração da conexão
export const client = createClient({
  projectId: 'SEU_PROJECT_ID_AQUI', // <--- COPIE DO ARQUIVO sanity.config.js NA PASTA STUDIO
  dataset: 'production',
  useCdn: true, // Deixe true para ser mais rápido (cache)
  apiVersion: '2024-01-01',
})

// Configurador de imagens (para transformar o código do Sanity em URL de foto)
const builder = imageUrlBuilder(client)

export function urlFor(source) {
  return builder.image(source)
}