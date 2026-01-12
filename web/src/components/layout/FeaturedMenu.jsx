import { useEffect, useState } from 'react';
import { createClient } from "@sanity/client";
import { Link } from 'react-router-dom'; 

// Use o MESMO ID de projeto que funcionou no CategoryMenu
const client = createClient({
  projectId: 'o4upb251', 
  dataset: 'production',
  useCdn: false, // Deixe false para atualizar na hora
  apiVersion: '2023-05-03',
});

export default function FeaturedMenu() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    // Busca apenas as categorias marcadas como destaque
    const query = `*[_type == "category" && isActive == true && isHighlighted == true] | order(title asc) {
      _id, title, slug
    }[0...5]`; // [0...5] limita a 5 itens para não quebrar o layout

    client.fetch(query).then(data => setFeatured(data)).catch(console.error);
  }, []);

  if (featured.length === 0) return null;

  return (
    <>
      {featured.map((cat) => (
        <li key={cat._id}>
          <Link 
            to={`/categoria/${cat.slug.current}`} 
            className="block py-3 px-2 hover:text-orange-600 transition-colors font-bold uppercase text-[11px] tracking-tight"
          >
            {cat.title}
          </Link>
        </li>
      ))}
    </>
  );
}