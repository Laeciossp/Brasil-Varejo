// src/utils/buildTree.js

export function buildCategoryTree(categories) {
  const categoryMap = {};
  const roots = [];

  // 1. Mapeia todas as categorias pelo ID para acesso rápido
  categories.forEach((cat) => {
    // Cria uma cópia do objeto com um array de 'children' vazio
    categoryMap[cat._id] = { ...cat, children: [] };
  });

  // 2. Conecta os filhos aos pais
  categories.forEach((cat) => {
    // Verifica se a categoria tem um pai definido
    if (cat.parent && cat.parent._ref) {
      const parentId = cat.parent._ref;
      
      // Se o pai existe na lista de ativos, adiciona este item como filho dele
      if (categoryMap[parentId]) {
        categoryMap[parentId].children.push(categoryMap[cat._id]);
      } else {
        // Fallback: Se o pai está inativo ou não existe, decide se mostra na raiz
        // ou esconde. Aqui optei por mostrar na raiz para você não perder o item.
        roots.push(categoryMap[cat._id]);
      }
    } else {
      // Se não tem pai, é uma Categoria Raiz (Departamento)
      roots.push(categoryMap[cat._id]);
    }
  });

  return roots; // Retorna apenas os pais, que já contêm os filhos dentro deles
}