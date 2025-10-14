import { useState } from "react";

export default function SmartImage({ baseName }: { baseName: string }) {
  const [src, setSrc] = useState(`${baseName}.webp`);
  const fallbacks = [`${baseName}.jpg`, `${baseName}.png`, "/fallback.png"];
  let index = 0;

  const handleError = () => {
    if (index < fallbacks.length) {
      setSrc(fallbacks[index++]);
    } else {
      console.error("Aucun format disponible");
    }
  };

  return <img src={src} onError={handleError} alt="Smart loaded" />;
}
