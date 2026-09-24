// Fare üstüne gelince satırın rengini değiştirmek için.
// Telefonda hover olmadığı için orada hiç tetiklenmiyor.
import { useMemo, useState } from 'react';

export function useHover() {
  const [hovered, setHovered] = useState(false);
  const bind = useMemo(
    () => ({
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
    }),
    [],
  );
  return { hovered, bind };
}
