import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PhotoCarousel({ photos }: { photos: { src: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);

  // Dropping to fewer photos can leave the index past the end.
  useEffect(() => {
    setIndex((i) => (i < photos.length ? i : 0));
  }, [photos.length]);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % photos.length), 5000);
    return () => clearInterval(id);
  }, [photos.length]);

  return (
    // overflow-clip, not overflow-hidden: `hidden` makes this box a scroll
    // container, and the parallax inside then measures its progress against
    // this frame — which never scrolls — instead of the page. `clip` crops
    // identically without creating one.
    <div className="relative aspect-[4/5] w-full overflow-clip rounded-sm bg-secondary">
      {photos.map((photo, i) => (
        <img
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          width={1024}
          height={1280}
          loading={i === 0 ? "eager" : "lazy"}
          // The frame clips; the photo drifts inside it as the page scrolls.
          className={`parallax absolute inset-0 size-full object-cover transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
            className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/60 backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => setIndex((i) => (i + 1) % photos.length)}
            className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/60 backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {photos.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1 rounded-full transition-all ${
                  i === index ? "w-8 bg-primary" : "w-4 bg-foreground/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
