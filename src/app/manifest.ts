import type { MetadataRoute } from "next";

/** Lets staff add the scanner to their phone's home screen with the brand icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Loyalty Card UAE",
    short_name: "Loyalty Card",
    description: "Digital loyalty cards for businesses across the UAE.",
    start_url: "/login",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#141210",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
