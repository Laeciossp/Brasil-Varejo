import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { client } from '../../lib/sanity'; // Importa sua conexão configurada
import { ChevronRight, Menu as MenuIcon, X } from 'lucide-react';

export default function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [activeRoot, setActiveRoot] = useState(null); // Qual departamento está selecionado (mouse hover)

  // Busca as categorias no Sanity ao carregar
  useEffect(() => {
    const query = `*[_type == "category" && isActive == true] {
      _id,
      title,
      slug,
      isRoot,
      "parentId": parent._ref
    }`;

    client.fetch(query).then((data) => {
      setCategories(data);
    }).catch(console.error);
  }, []);

  // --- LÓGICA DE ORGANIZAÇÃO (ÁRVORE) ---
  // 1. Pega só os Departamentos Principais (Nível 1)
  const rootCategories = categories.filter(c => c.isRoot);

  // 2. Função para achar filhos de um pai específico
  const getChildren = (parentId) => categories.filter(c => c.parentId === parentId);

  return (
    <div className="bg-[#fff200] text-gray-900 font-bold text-sm shadow-md relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-10">
          
          {/* Botão "Todos os Departamentos" (Mobile e Desktop) */}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="flex items-center gap-2 hover:bg-yellow-500 px-3 py-2 rounded transition-colors"
          >
            {isOpen ? <X size={20}/> : <MenuIcon size={20}/>}
            <span>Todos os Departamentos</span>
          </button>

          {/* Links Rápidos (Opcional - Pode colocar estático ou puxar os mais acessados) */}
          <div className="hidden md:flex gap-6 text-xs text-gray-700">
            <Link to="/ofertas" className="hover:text-black">Ofertas do Dia</Link>
            <Link to="/mercado" className="hover:text-black">Supermercado</Link>
            <Link to="/moda" className="hover:text-black">Moda</Link>
            <Link to="/historico" className="hover:text-black">Histórico</Link>
          </div>
        </div>
      </div>

      {/* --- O DROPDOWN GIGANTE (MEGA MENU) --- */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-t border-gray-200 shadow-xl min-h-[400px]">
          <div className="container mx-auto flex h-full min-h-[400px]">
            
            {/* COLUNA DA ESQUERDA: Departamentos Principais */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 py-2">
              {rootCategories.map((cat) => (
                <div 
                  key={cat._id}
                  onMouseEnter={() => setActiveRoot(cat._id)}
                  className={`flex justify-between items-center px-4 py-3 cursor-pointer transition-colors ${activeRoot === cat._id ? 'bg-white text-blue-600 font-black border-l-4 border-blue-600' : 'hover:bg-gray-100'}`}
                >
                  <Link to={`/category/${cat.slug.current}`} className="flex-1" onClick={() => setIsOpen(false)}>
                    {cat.title}
                  </Link>
                  {/* Mostra setinha se tiver filhos */}
                  {getChildren(cat._id).length > 0 && <ChevronRight size={14} className="text-gray-400"/>}
                </div>
              ))}
            </div>

            {/* COLUNA DA DIREITA: Subcategorias (Filhos e Netos) */}
            <div className="flex-1 p-6 bg-white overflow-y-auto max-h-[600px]">
              {activeRoot ? (
                <div className="grid grid-cols-3 gap-8">
                  {/* Pega os filhos do departamento que está com o mouse em cima */}
                  {getChildren(activeRoot).map((subcat) => (
                    <div key={subcat._id}>
                      {/* Título do Filho (Nível 2) - Ex: Celulares e Telefones */}
                      <Link 
                        to={`/category/${subcat.slug.current}`} 
                        className="block text-gray-900 font-black mb-2 hover:text-blue-600"
                        onClick={() => setIsOpen(false)}
                      >
                        {subcat.title}
                      </Link>

                      {/* Lista de Netos (Nível 3) - Ex: Peças, Capas... */}
                      <ul className="space-y-1">
                        {getChildren(subcat._id).map((grandchild) => (
                          <li key={grandchild._id}>
                            <Link 
                              to={`/category/${grandchild.slug.current}`}
                              className="text-gray-500 font-normal hover:text-blue-500 text-xs"
                              onClick={() => setIsOpen(false)}
                            >
                              {grandchild.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {/* Mensagem se não tiver filhos */}
                  {getChildren(activeRoot).length === 0 && (
                    <div className="col-span-3 text-gray-400 italic">
                      Nenhuma subcategoria encontrada aqui.
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-300 font-bold uppercase tracking-widest">
                  Selecione uma categoria ao lado
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}