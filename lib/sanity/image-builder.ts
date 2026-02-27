// lib/sanity/image-builder.ts
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { client } from './client'

// Initialize the image URL builder
const builder = imageUrlBuilder(client)

export type ImageLayout = 'hero' | 'side' | 'compact' | 'none'

// Image configuration for each layout type
export const IMAGE_CONFIGS = {
  hero: {
    width: 1600,
    height: 600,
    fit: 'crop' as const,
    quality: 85,
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1600px',
  },
  side: {
    width: 800,
    height: 800,
    fit: 'crop' as const,
    quality: 85,
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px',
  },
  compact: {
    width: 300,
    height: 300,
    fit: 'crop' as const,
    quality: 80,
    sizes: '(max-width: 768px) 200px, 300px',
  },
} as const

/**
 * Generate optimized image URL from Sanity
 */
export function getOptimizedImageUrl(
  image: SanityImageSource,
  layout: ImageLayout = 'hero'
): string | null {
  if (!image || layout === 'none') return null

  const config = IMAGE_CONFIGS[layout]
  if (!config) return null

  return builder
    .image(image)
    .width(config.width)
    .height(config.height)
    .fit(config.fit)
    .quality(config.quality)
    .auto('format') // Automatically serve WebP/AVIF if supported
    .url()
}

/**
 * Get image dimensions for a specific layout
 */
export function getImageDimensions(layout: ImageLayout = 'hero') {
  const config = IMAGE_CONFIGS[layout]
  return config
    ? { width: config.width, height: config.height }
    : { width: 1600, height: 600 }
}

/**
 * Get responsive sizes string for Next.js Image component
 */
export function getImageSizes(layout: ImageLayout = 'hero'): string {
  const config = IMAGE_CONFIGS[layout]
  return config?.sizes || '100vw'
}
