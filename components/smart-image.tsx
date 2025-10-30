import { useState } from "react";
import Image, { ImageProps } from "next/image";

interface SmartImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  baseName: string;
  fallbackSrc?: string;
}

export default function SmartImage({ 
  baseName, 
  fallbackSrc = "/fallback.png",
  width = 500,
  height = 300,
  alt = "Image",
  className = "",
  ...props 
}: SmartImageProps) {
  const [currentSrc, setCurrentSrc] = useState(`${baseName}.webp`);
  const [errorCount, setErrorCount] = useState(0);
  const fallbacks = [`${baseName}.jpg`, `${baseName}.png`, fallbackSrc];

  const handleError = () => {
    if (errorCount < fallbacks.length - 1) {
      setCurrentSrc(fallbacks[errorCount + 1]);
      setErrorCount(prev => prev + 1);
    } else {
      console.warn("Tous les formats d'image ont échoué pour:", baseName);
    }
  };

  return (
    <Image
      src={currentSrc}
      onError={handleError}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{
        maxWidth: "100%",
        height: "auto"
      }}
      {...props}
    />
  );
}