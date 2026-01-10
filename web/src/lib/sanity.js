import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

// Configuração da conexão
export const client = createClient({
  projectId: 'o4upb251', 
  dataset: 'production',
  // IMPORTANTE: useCdn 'false' garante que as mensagens do chat apareçam na hora (sem cache)
  useCdn: false, 
  apiVersion: '2024-01-01',
  // AQUI ENTRA O TOKEN (Isso permite gravar dados no banco)
  token: 'skEcUJ41lyHwOuSuRVnjiBKUnsV0Gnn7SQ0i2ZNKC4LqB1KkYo2vciiOrsjqmyUcvn8vLMTxp019hJRmR11iPV76mXVH7kK8PDLvxxjHHD4yw7R8eHfpNPkKcHruaVytVs58OaG6hjxTcXHSBpz0Fr2DTPck19F7oCo4NCku1o5VLi2f4wqY'
})

// Configurador de imagens
const builder = imageUrlBuilder(client)

export function urlFor(source) {
  return builder.image(source)
}