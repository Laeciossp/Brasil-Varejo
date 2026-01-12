import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

// Configuração da conexão para o Brasil Varejo (Palastore)
export const client = createClient({
  projectId: 'o4upb251', 
  dataset: 'production',
  // useCdn: true ajuda a evitar erros de carregamento e avisos de segurança no navegador
  useCdn: true, 
  apiVersion: '2024-01-01',
  /* SEGURANÇA: Removi o token daqui para uso no Frontend. 
     Para criar pedidos e salvar dados, use o seu Worker (Cloudflare) como ponte. 
     Isso remove o erro "You have configured Sanity client to use a token in the browser".
  */
})

// Configurador de imagens
const builder = imageUrlBuilder(client)

export function urlFor(source) {
  if (!source) return { url: () => '' };
  return builder.image(source)
}