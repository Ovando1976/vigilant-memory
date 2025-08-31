import { useEffect } from "react";

/** Lightweight SEO/head manager (no external deps) */
export default function SeoHead({
  title,
  description,
  image = "/images/og-default.jpg",
  url = typeof window !== "undefined" ? window.location.href : "",
}) {
  useEffect(() => {
    if (title) document.title = title;
    const set = (name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(name.includes(":") ? "property" : "name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    set("description", description);
    set("og:title", title);
    set("og:description", description);
    set("og:image", image);
    set("og:url", url);
    set("twitter:card", "summary_large_image");
  }, [title, description, image, url]);
  return null;
}