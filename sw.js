/* Service worker: guarda la app en el teléfono para que funcione sin internet.
   Las imágenes de cartas se guardan a medida que se ven (o todas con el botón de Colección).
   Al cambiar VERSION se vuelve a descargar la app. */

const VERSION = "cartasmyl-v2";
const CACHE_IMAGENES = "myl-imagenes";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./style.css",
  "./cartas.js",
  "./mazos.js",
  "./armador.js",
  "./app.js",
  "./manifest.json",
  "./assets/icono-192.png",
  "./assets/icono-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(ARCHIVOS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION && k !== CACHE_IMAGENES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  const url = new URL(evento.request.url);
  if (url.origin !== self.location.origin) return;

  // Imágenes de cartas: primero el caché, si no está se baja y se guarda
  if (url.pathname.includes("/assets/cartas/")) {
    evento.respondWith(
      caches.open(CACHE_IMAGENES).then((cache) =>
        cache.match(evento.request).then((guardada) => guardada || fetch(evento.request).then((resp) => {
          if (resp.ok) cache.put(evento.request, resp.clone());
          return resp;
        }))
      )
    );
    return;
  }

  // Resto de la app: caché primero, red como respaldo
  evento.respondWith(
    caches.match(evento.request, { ignoreSearch: true }).then((guardado) => guardado || fetch(evento.request).then((resp) => {
      if (resp.ok) { const copia = resp.clone(); caches.open(VERSION).then((cache) => cache.put(evento.request, copia)); }
      return resp;
    }))
  );
});
