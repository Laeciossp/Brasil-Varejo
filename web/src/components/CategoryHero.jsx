import React from 'react';
import { urlFor } from '../lib/sanity';

export default function CategoryHero({ heroBanner }) {
  if (!heroBanner) return null;

  const { mediaType, desktopImage, videoFile, heading, subheading, link } = heroBanner;

  if (mediaType === 'image' && !desktopImage) return null;
  if (mediaType === 'video' && !videoFile) return null;

  const isVideo = mediaType === 'video';

  // --- LÓGICA DE PROPORÇÃO ---
  // Se for VÍDEO: Usa altura fixa e corta o excesso para preencher (object-cover)
  // Se for IMAGEM: Usa altura automática para mostrar a arte inteira (h-auto)
  const containerHeight = isVideo 
    ? "h-[300px] md:h-[500px]"  // Altura fixa para vídeo (Banner Hero)
    : "h-auto";                 // Altura automática para imagem (Banner Arte)

  const contentStyle = isVideo
    ? "w-full h-full object-cover" // Vídeo preenche tudo
    : "w-full h-auto object-contain"; // Imagem respeita o tamanho original

  const VisualContent = () => (
    <>
      {isVideo && videoFile?.asset?.url ? (
        <video 
          src={videoFile.asset.url} 
          className={contentStyle} 
          autoPlay loop muted playsInline 
        />
      ) : (
        <img
          // Para imagem, pedimos a largura total e deixamos a altura fluir
          src={urlFor(desktopImage).width(1920).url()}
          alt={heading || 'Banner'}
          className={contentStyle} 
        />
      )}
      
      {/* Sombra só aparece se tiver Texto sobreposto */}
      {(heading || subheading) && (
        <div className="absolute inset-0 bg-black/40" />
      )}
    </>
  );

  const ContentOverlay = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
      {heading && (
        <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-md mb-2">
          {heading}
        </h1>
      )}
      {subheading && (
        <p className="text-white text-lg md:text-xl max-w-2xl drop-shadow-sm font-medium hidden md:block">
          {subheading}
        </p>
      )}
    </div>
  );

  const ContainerClass = `relative w-full overflow-hidden bg-gray-100 mb-6 ${containerHeight}`;

  if (link) {
    return (
      <a href={link} className={`${ContainerClass} block group`}>
        <VisualContent />
        <ContentOverlay />
      </a>
    );
  }

  return (
    <div className={ContainerClass}>
      <VisualContent />
      <ContentOverlay />
    </div>
  );
}