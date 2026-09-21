# Cartas MyL — buscador de cartas de Mitos y Leyendas (Segunda Era)

App para el celular con las 1.180 cartas de Espada Sagrada, Helénica, Hijos de Daana,
Dominios de Ra y Guerrero Jaguar: imagen, coste, fuerza, raza, frecuencia y texto de habilidad.
No depende de ningún servicio: es HTML/JS puro y funciona sin internet una vez instalada.

## Qué hace

- **Buscar** por nombre, texto de habilidad o código (`GJ 90`, `es-44`).
- **Filtrar** por edición, tipo, raza, frecuencia, coste, palabras clave (Furia, Imbloqueable, Anula…) y por lo que tienes.
- **Ficha** de cada carta con imagen grande; se pasa de carta con las flechas o deslizando.
- **Colección**: marca cuántas copias tienes (− / +). Filtra "las que tengo" / "las que no tengo".
- **Mazos**: vienen los dos mazos Héroe agro-control; puedes copiarlos y editarlos o crear los tuyos.
  Cada mazo muestra cuántas cartas te faltan y cuáles ("Ver las que faltan").
- **Respaldo**: exporta/importa colección y mazos en un archivo JSON (Colección → Respaldar).
- **Sin internet**: la app se guarda sola; las imágenes se guardan a medida que las ves, o todas
  de una vez con "Guardar imágenes sin internet" (≈80 MB).

## Instalar en el teléfono

1. Publica la app (ver abajo) o ábrela desde la URL ya publicada.
2. En Chrome (Android): menú ⋮ → **Instalar aplicación** / **Agregar a pantalla de inicio**.
   En Safari (iPhone): Compartir → **Agregar a pantalla de inicio**.
3. Si quieres usarla sin señal, entra a Colección y toca **Guardar imágenes sin internet**.

## Publicar / actualizar

- Clic derecho en `publicar.ps1` → *Ejecutar con PowerShell* (requiere GitHub CLI conectado).
- Sube solo los archivos que cambiaron, en un único commit, y activa GitHub Pages la primera vez.
- Al cambiar archivos de la app, sube el número de `VERSION` en `sw.js` para que los teléfonos
  descarguen la versión nueva.

## Probar en el computador

```
npx http-server -p 8792
```
y abrir http://localhost:8792 (en el navegador, F12 → modo dispositivo móvil).

## Archivos

- `index.html`, `style.css`, `app.js` — la app.
- `cartas.js` — datos de las 1.180 cartas (generados desde la wiki myl.fandom.com).
- `mazos.js` — mazos sugeridos.
- `assets/cartas/ED-N.webp` — imágenes (360 px de ancho).
- `sw.js`, `manifest.json`, `assets/icono-*.png` — PWA.

Los textos son de las impresiones originales 2003-2005 según la wiki; pueden diferir levemente de
las reimpresiones recientes.
