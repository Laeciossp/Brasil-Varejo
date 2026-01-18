import { useEffect, useState } from 'react';
import { createClient } from "@sanity/client";
import { Link } from 'react-router-dom'; 
import { ChevronDown, ChevronRight } from 'lucide-react'; 
// ATENÇÃO: Verifique se este caminho está correto no seu projeto
import { buildCategoryTree } from '../../utils/buildTree'; 

// Configuração do Sanity
const client = createClient({
  projectId: 'o4upb251', 
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

// --- SUB-COMPONENTE: ITEM DA LISTA ---
const CategoryItem = ({ category, level = 0, onItemClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = category.children && category.children.length > 0;

  // Design: Recuo progressivo
  const paddingLeft = level === 0 ? '16px' : `${(level * 16) + 16}px`;
  
  // CORES ATUALIZADAS PARA O TEMA CROCUS-DEEP
  const textSize = level === 0 ? 'text-sm font-bold' : 'text-xs font-medium';
  // Nível 0 = Roxo Forte, Nível 1+ = Roxo um pouco mais suave
  const textColor = level === 0 ? 'text-crocus-deep' : 'text-crocus-deep/80';

  return (
    <div className="w-full">
      <div 
        className={`
          flex items-center justify-between py-2 pr-3 hover:bg-purple-50 transition-colors cursor-pointer group
          ${isOpen ? 'bg-purple-50' : ''}
        `}
        style={{ paddingLeft }}
      >
        {/* Link da Categoria */}
        <Link 
          to={`/categoria/${category.slug.current}`} 
          // CORRIGIDO: Hover agora usa text-crocus-vivid (ou similar) em vez de blue
          className={`flex-1 ${textSize} ${textColor} group-hover:text-purple-700 transition-colors`}
          onClick={onItemClick} // Fecha o menu ao clicar
        >
          {category.title}
        </Link>

        {/* Botão de Expandir */}
        {hasChildren && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(!isOpen);
            }} 
            // CORRIGIDO: Cores dos ícones e fundo do botão para roxo
            className="p-1 text-crocus-deep/40 hover:text-crocus-deep hover:bg-purple-100 rounded-full transition-all"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      {/* Renderização dos Filhos */}
      {hasChildren && isOpen && (
        <div className="relative">
          <div 
            // CORRIGIDO: Linha vertical agora é um roxo bem clarinho
            className="absolute bg-purple-100 w-[1px] top-0 bottom-0"
            style={{ left: `${(level * 16) + 24}px` }} 
          ></div>
          
          {category.children.map((child) => (
            <CategoryItem 
                key={child._id} 
                category={child} 
                level={level + 1} 
                onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function CategoryMenu({ onItemClick }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const query = `*[_type == "category" && isActive == true] | order(title asc) {
          _id, title, slug, parent
        }`;
        
        const data = await client.fetch(query);
        const structuredTree = buildCategoryTree(data);
        setTree(structuredTree);
      } catch (error) {
        console.error("Erro no menu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) return <div className="p-6 text-center text-crocus-deep/50 text-sm animate-pulse">Carregando...</div>;
  
  if (tree.length === 0) return <div className="p-4 text-center text-crocus-deep/50 text-xs">Nenhuma categoria ativa.</div>;

  return (
    <div className="flex flex-col py-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
      {tree.map((rootCategory) => (
        <CategoryItem 
            key={rootCategory._id} 
            category={rootCategory} 
            level={0} 
            onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}