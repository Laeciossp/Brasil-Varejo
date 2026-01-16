import { getCliClient } from 'sanity/cli'

const client = getCliClient()

async function limparProdutos() {
  // 1. Busca os IDs dos produtos sem imagem
  const query = '*[_type == "product" && (!defined(images) || count(images) == 0)]._id'
  const ids = await client.fetch(query)

  if (!ids.length) {
    console.log('✅ Nenhum produto vazio encontrado.')
    return
  }

  console.log(`🗑️ Encontrei ${ids.length} produtos sem imagem. Excluindo...`)

  // 2. Cria a transação de exclusão
  const transaction = client.transaction()
  ids.forEach(id => transaction.delete(id))
  
  await transaction.commit()
  console.log('✅ Limpeza concluída com sucesso!')
}

limparProdutos()