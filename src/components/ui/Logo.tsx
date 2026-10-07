import Image from 'next/image';
import logo from '@/assets/kain-logo.png';

/** The Kain logo. Never recoloured or redrawn; 24–28 px in headers, 58–66 px on yellow headers. */
export function Logo({ height = 28, priority = false }: { height?: number; priority?: boolean }) {
  const width = Math.round((logo.width * height) / logo.height);
  return (
    <Image
      src={logo}
      alt="Kain"
      width={width}
      height={height}
      priority={priority}
      className="block"
      style={{ width, height }}
    />
  );
}
