import React, { useState } from 'react';
import { urlFor } from '../../lib/sanity';

const Gallery = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState(images?.[0]);

  if (!images || images.length === 0) return <div className="w-full h-96 bg-gray-100 rounded-lg" />;

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      {/* Lista de Thumbnails (Vertical no Desktop) */}
      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:h-[500px] no-scrollbar">
        {images.map((img, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(img)}
            className={`border-2 rounded overflow-hidden min-w-[64px] w-16 h-16 md:w-20 md:h-20 flex-shrink-0 ${
              selectedImage._key === img._key ? 'border-brand-blue' : 'border-gray-200'
            }`}
          >
            <img 
              src={urlFor(img).width(100).height(100).url()} 
              alt="" 
              className="w-full h-full object-contain p-1"
            />
          </button>
        ))}
      </div>

      {/* Imagem Principal */}
      <div className="flex-1 bg-white border border-gray-100 rounded-lg p-4 flex items-center justify-center relative min-h-[400px] md:h-[600px]">
        <img 
          src={urlFor(selectedImage).width(800).url()} 
          alt="Imagem do produto" 
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  );
};

export default Gallery;