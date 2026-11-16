/**
 * Shows a cover of any shape in full inside a fixed frame: the whole image sits on top
 * of a blurred, enlarged copy of itself, so there are no empty bars and nothing is cropped.
 */
export function FittedCover({ src, aspect = "aspect-[16/9]", className = "" }: { src: string; aspect?: string; className?: string }) {
  return (
    <div className={`relative w-full overflow-hidden bg-mist ${aspect} ${className}`}>
      <img src={src} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl opacity-70" />
      <img src={src} alt="" loading="lazy" className="relative h-full w-full object-contain" />
    </div>
  );
}
