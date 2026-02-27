import imageUrlBuilder from "@sanity/image-url"
import { client } from "./client"
import type { SanityImageSource } from "@sanity/image-url/lib/types/types"

const builder = imageUrlBuilder(client)

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

// Helper function to get optimized image URL
export function getImageUrl(source: SanityImageSource, width = 800, height?: number) {
  let urlBuilder = builder.image(source).width(width).auto("format")

  if (height) {
    urlBuilder = urlBuilder.height(height)
  }

  return urlBuilder.url()
}
