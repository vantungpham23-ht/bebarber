"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface StoryCarouselProps {
  images: string[];
  alt?: string;
}

export function StoryCarousel({ images, alt = "Be. Salon" }: StoryCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % images.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const goTo = (index: number) => {
    if (index === current || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setIsTransitioning(false);
    }, 300);
  };

  if (images.length === 0) return null;

  return (
    <div className="relative h-full w-full">
      <div className="story-img-frame h-full w-full">
        <div className="corner-decor tl" />
        <div className="corner-decor tr" />
        <div className="corner-decor bl" />
        <div className="corner-decor br" />
        <div className="story-img-inner relative h-full w-full overflow-hidden rounded-sm">
          {images.map((src, i) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity duration-300 ${
                i === current ? "opacity-100 z-[1]" : "opacity-0 z-0"
              }`}
            >
              <Image
                src={src}
                alt={`${alt} ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current
                  ? "w-6 bg-[#b88a3a]"
                  : "w-1.5 bg-[#b88a3a]/40 hover:bg-[#b88a3a]/70"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
