/* Cartas MyL - lógica de la app (sin librerías) */
(function () {
  "use strict";

  const EDICIONES = { ES: "Espada Sagrada", HL: "Helénica", HD: "Hijos de Daana", DR: "Dominios de Ra", GJ: "Guerrero Jaguar" };
  const ORDEN_TIPOS = ["Aliado", "Talismán", "Arma", "Tótem", "Oro"];
  const PAGINA = 60;

  // ---------- Datos ----------
  const cartas = window.CARTAS.map((c) => ({
    ...c,
    id: c.e + "-" + c.n,
    busq: normalizar(c.nom + " " + (c.h || "") + " " + c.e + " " + c.n + " " + c.e + c.n + " " + c.e + "-" + c.n),
  }));
  const porId = new Map(cartas.map((c) => [c.id, c]));
  const ORO_BASICO = { id: "ORO", nom: "Oro básico (cualquier edición)", t: "Oro", e: "", n: 0, generico: true };

  function normalizar(s) {
    return (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function imgDe(c) { return "assets/cartas/" + c.e + "-" + c.n + ".webp"; }
  function esc(s) { return (s || "").toString().replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }

  // ---------- Estado guardado en el teléfono ----------
  function leer(clave, porDefecto) {
    try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : porDefecto; } catch (e) { return porDefecto; }
  }
  function guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin espacio o modo privado */ }
  }
  let coleccion = leer("myl.coleccion", {});   // { "GJ-90": 3, ... }
  let misMazos = leer("myl.mazos", []);         // [{ id, nombre, descripcion, lineas: [["GJ-90", 3], ...] }]

  // ---------- Estado de la vista ----------
  const filtros = { e: new Set(), t: new Set(), r: new Set(), f: new Set(), c: new Set(), k: new Set(), col: new Set() };
  let texto = "";
  let orden = "num";
  let resultado = [];      // cartas filtradas
  let mostradas = 0;       // cuántas van pintadas en la grilla
  let indiceModal = -1;    // posición dentro de resultado (o lista propia)
  let listaModal = [];     // lista sobre la que navega el modal
  let mazoAbierto = null;  // id del mazo que se está viendo

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------- Filtrado ----------
  function aplicarFiltros() {
    const t = normalizar(texto.trim()).replace(/\s+/g, " ");
    const palabras = t ? t.split(" ") : [];
    // Código exacto tipo "GJ 90", "gj-90" o "gj90"
    const codigo = t.match(/^(es|hl|hd|dr|gj)\s*-?\s*(\d{1,3})$/);
    resultado = cartas.filter((c) => {
      if (codigo) return c.e.toLowerCase() === codigo[1] && c.n === Number(codigo[2]);
      if (filtros.e.size && !filtros.e.has(c.e)) return false;
      if (filtros.t.size && !filtros.t.has(c.t)) return false;
      if (filtros.r.size && !filtros.r.has(c.r)) return false;
      if (filtros.f.size && !filtros.f.has(c.f)) return false;
      if (filtros.c.size) {
        const v = c.c == null ? null : (c.c >= 6 ? "6+" : String(c.c));
        if (!filtros.c.has(v)) return false;
      }
      if (filtros.k.size) {
        const h = normalizar(c.h);
        for (const k of filtros.k) if (!h.includes(normalizar(k))) return false;
      }
      if (filtros.col.size) {
        const n = coleccion[c.id] || 0;
        if (filtros.col.has("tengo") && n === 0) return false;
        if (filtros.col.has("faltan") && n > 0) return false;
      }
      for (const p of palabras) if (!c.busq.includes(p)) return false;
      return true;
    });
    ordenar(resultado);
    mostradas = 0;
    $("#grilla").innerHTML = "";
    pintarMas();
    const nF = Object.values(filtros).reduce((a, s) => a + s.size, 0);
    $("#n-filtros").textContent = nF;
    $("#n-filtros").classList.toggle("oculto", nF === 0);
    $("#resumen").textContent = resultado.length === cartas.length
      ? cartas.length + " cartas · toca una para ver la ficha"
      : resultado.length + " de " + cartas.length + " cartas";
  }

  function ordenar(lista) {
    const cmpNum = (a, b) => (a.e === b.e ? a.n - b.n : Object.keys(EDICIONES).indexOf(a.e) - Object.keys(EDICIONES).indexOf(b.e));
    if (orden === "nom") lista.sort((a, b) => a.nom.localeCompare(b.nom, "es"));
    else if (orden === "c") lista.sort((a, b) => ((a.c ?? 99) - (b.c ?? 99)) || cmpNum(a, b));
    else if (orden === "a") lista.sort((a, b) => ((b.a ?? -1) - (a.a ?? -1)) || cmpNum(a, b));
    else lista.sort(cmpNum);
  }

  function tarjetaHTML(c, cant) {
    const tengo = coleccion[c.id] || 0;
    return `<button class="carta" data-id="${c.id}">
      <img src="${imgDe(c)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=sin-img>${esc(c.nom).replace(/'/g, "")}</div>'">
      ${tengo ? `<span class="tengo">${tengo}</span>` : ""}
      ${cant != null ? `<span class="cant">×${cant}</span>` : ""}
      <div class="nombre">${esc(c.nom)}</div>
      <div class="meta"><span>${c.e} ${c.n}</span><span>${metaCorta(c)}</span></div>
    </button>`;
  }
  function metaCorta(c) {
    if (c.t === "Aliado") return (c.c ?? "?") + "/" + (c.a ?? "?");
    if (c.t === "Oro") return "Oro";
    return c.c != null ? "c" + c.c : c.t;
  }

  function pintarMas() {
    const trozo = resultado.slice(mostradas, mostradas + PAGINA);
    $("#grilla").insertAdjacentHTML("beforeend", trozo.map((c) => tarjetaHTML(c)).join(""));
    mostradas += trozo.length;
    $("#ver-mas").classList.toggle("oculto", mostradas >= resultado.length);
    $("#ver-mas").textContent = "Ver más (" + (resultado.length - mostradas) + " restantes)";
  }

  // ---------- Ficha (modal) ----------
  function abrirFicha(id, lista) {
    listaModal = lista || resultado;
    indiceModal = listaModal.findIndex((c) => c.id === id);
    if (indiceModal < 0) { listaModal = [porId.get(id)]; indiceModal = 0; }
    pintarFicha();
    $("#modal").classList.remove("oculto");
    document.body.style.overflow = "hidden";
  }
  function cerrarFicha() {
    $("#modal").classList.add("oculto");
    document.body.style.overflow = "";
  }
  function pintarFicha() {
    const c = listaModal[indiceModal];
    if (!c) return;
    const tengo = coleccion[c.id] || 0;
    const enMazos = todosLosMazos().filter((m) => m.lineas.some((l) => l[0] === c.id));
    const etiquetas = [
      `<span class="etiqueta">${esc(c.t)}</span>`,
      c.r ? `<span class="etiqueta">${esc(c.r)}</span>` : "",
      c.f ? `<span class="etiqueta">${esc(c.f)}</span>` : "",
      c.c != null ? `<span class="etiqueta">Coste <b>${c.c}</b></span>` : "",
      c.a != null ? `<span class="etiqueta">Fuerza <b>${c.a}</b></span>` : "",
    ].join("");
    $("#ficha").innerHTML = `
      <img class="ficha-img" src="${imgDe(c)}" alt="${esc(c.nom)}" onerror="this.style.display='none'">
      <div class="ficha">
        <h3>${esc(c.nom)}</h3>
        <div class="codigo">${esc(EDICIONES[c.e])} · ${c.e} ${c.n}/236</div>
        <div class="etiquetas">${etiquetas}</div>
        <div class="habilidad ${c.h ? "" : "vacia"}">${c.h ? esc(c.h).replace(/ \/ /g, "\n") : "Sin habilidad."}</div>
        <div class="ficha-acciones">
          <div class="contador">
            <button data-accion="menos" aria-label="Quitar una">−</button>
            <span>Tengo ${tengo}</span>
            <button data-accion="mas" aria-label="Agregar una">+</button>
          </div>
          <button class="btn-primario" data-accion="mazo">+ A un mazo</button>
        </div>
        ${enMazos.length ? `<div class="ficha-mazos">En tus mazos:<ul>${enMazos.map((m) => `<li>${esc(m.nombre)} ×${m.lineas.find((l) => l[0] === c.id)[1]}</li>`).join("")}</ul></div>` : ""}
      </div>`;
    $("#pos").textContent = (indiceModal + 1) + " / " + listaModal.length;
    $("#ant").disabled = indiceModal <= 0;
    $("#sig").disabled = indiceModal >= listaModal.length - 1;
    $(".modal-caja").scrollTop = 0;
  }
  function cambiarTengo(c, delta) {
    const n = Math.max(0, (coleccion[c.id] || 0) + delta);
    if (n === 0) delete coleccion[c.id]; else coleccion[c.id] = n;
    guardar("myl.coleccion", coleccion);
    pintarFicha();
    // Actualiza la tarjeta en la grilla sin repintar todo
    $$(`.carta[data-id="${c.id}"]`).forEach((el) => {
      let b = el.querySelector(".tengo");
      if (n === 0) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement("span"); b.className = "tengo"; el.insertBefore(b, el.querySelector(".nombre")); }
      b.textContent = n;
    });
    if (vistaActual === "coleccion") pintarColeccion();
    if (vistaActual === "mazos" && mazoAbierto) pintarMazo(mazoAbierto);
  }

  // ---------- Mazos ----------
  function todosLosMazos() {
    return window.MAZOS_PRESET.map((m) => ({ ...m, preset: true })).concat(misMazos);
  }
  function buscarMazo(id) { return todosLosMazos().find((m) => m.id === id); }
  function cartaDeLinea(l) { return l[0] === "ORO" ? ORO_BASICO : porId.get(l[0]); }
  function totalMazo(m) { return m.lineas.reduce((a, l) => a + l[1], 0); }
  function tengoDelMazo(m) {
    return m.lineas.reduce((a, l) => a + (l[0] === "ORO" ? l[1] : Math.min(l[1], coleccion[l[0]] || 0)), 0);
  }

  function pintarListaMazos() {
    mazoAbierto = null;
    $("#vista-mazos > .fila-titulo").classList.remove("oculto");
    const lista = todosLosMazos();
    $("#lista-mazos").innerHTML = lista.length ? lista.map((m) => {
      const total = totalMazo(m), tengo = tengoDelMazo(m);
      return `<button class="mazo-item" data-mazo="${esc(m.id)}">
        <div class="titulo"><span>${esc(m.nombre)}</span><span>${total} cartas</span></div>
        <div class="sub">${m.preset ? "Mazo sugerido · " : ""}Tienes ${tengo} de ${total}${tengo < total ? " · faltan " + (total - tengo) : " · ¡completo!"}</div>
        <div class="barra"><div style="width:${total ? Math.round(100 * tengo / total) : 0}%"></div></div>
      </button>`;
    }).join("") : `<p class="ayuda">Aún no tienes mazos. Crea uno con "+ Nuevo mazo" y agrega cartas desde su ficha.</p>`;
  }

  function pintarMazo(id) {
    const m = buscarMazo(id);
    if (!m) { pintarListaMazos(); return; }
    mazoAbierto = id;
    $("#vista-mazos > .fila-titulo").classList.add("oculto");
    const total = totalMazo(m), tengo = tengoDelMazo(m);
    const grupos = {};
    m.lineas.forEach((l) => {
      const c = cartaDeLinea(l);
      if (!c) return;
      (grupos[c.t] = grupos[c.t] || []).push({ c, cant: l[1] });
    });
    const html = ORDEN_TIPOS.filter((t) => grupos[t]).map((t) => {
      const lineas = grupos[t].sort((a, b) => ((a.c.c ?? 0) - (b.c.c ?? 0)) || a.c.nom.localeCompare(b.c.nom, "es"));
      const n = lineas.reduce((a, l) => a + l.cant, 0);
      return `<div class="grupo-mazo"><h4>${t} (${n})</h4>` + lineas.map(({ c, cant }) => {
        const tiene = c.generico ? null : Math.min(cant, coleccion[c.id] || 0);
        const estado = c.generico ? "" : (tiene >= cant ? `<span class="estado ok">✓ ${tiene}/${cant}</span>` : `<span class="estado falta">${tiene}/${cant}</span>`);
        return `<div class="linea" data-id="${c.id}">
          <span class="cant">${cant}</span>
          ${c.generico ? `<div style="width:38px;height:53px;flex:none"></div>` : `<img src="${imgDe(c)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`}
          <div class="info"><div class="n">${esc(c.nom)}</div><div class="m">${c.generico ? "cualquier oro sin habilidad" : esc(EDICIONES[c.e]) + " · " + metaLarga(c)}</div></div>
          ${estado}
          ${m.preset ? "" : `<button class="btn-icono quitar" data-quitar="${c.id}" aria-label="Quitar una">−</button>`}
        </div>`;
      }).join("") + "</div>";
    }).join("");
    const faltan = m.lineas.filter((l) => l[0] !== "ORO" && (coleccion[l[0]] || 0) < l[1]).length;
    $("#lista-mazos").innerHTML = `
      <button class="btn-secundario" data-volver>‹ Todos los mazos</button>
      <div class="fila-titulo"><h2>${esc(m.nombre)}</h2></div>
      ${m.descripcion ? `<div class="mazo-desc">${esc(m.descripcion)}</div>` : ""}
      <div class="stats">
        <div class="stat"><b>${total}</b><span>cartas</span></div>
        <div class="stat"><b>${tengo}</b><span>tengo</span></div>
        <div class="stat"><b>${total - tengo}</b><span>faltan</span></div>
      </div>
      <div class="acciones">
        ${faltan ? `<button class="btn-secundario" data-faltan>Ver las que faltan</button>` : ""}
        <button class="btn-secundario" data-compartir>Compartir lista</button>
        ${m.preset ? `<button class="btn-primario" data-copiar>Copiar a mis mazos</button>`
          : `<button class="btn-secundario" data-renombrar>Renombrar</button><button class="btn-peligro" data-borrar>Borrar</button>`}
      </div>
      ${html || `<p class="ayuda">Mazo vacío. Busca una carta en la pestaña Cartas y toca "+ A un mazo".</p>`}`;
  }
  function metaLarga(c) {
    const p = [];
    if (c.r) p.push(c.r);
    if (c.c != null) p.push("coste " + c.c);
    if (c.a != null) p.push("fuerza " + c.a);
    return p.join(" · ");
  }
  function textoMazo(m) {
    const grupos = {};
    m.lineas.forEach((l) => { const c = cartaDeLinea(l); if (c) (grupos[c.t] = grupos[c.t] || []).push(l[1] + " " + c.nom + (c.generico ? "" : " (" + c.e + " " + c.n + ")")); });
    return m.nombre + " — " + totalMazo(m) + " cartas\n" + ORDEN_TIPOS.filter((t) => grupos[t]).map((t) => "\n" + t + ":\n" + grupos[t].join("\n")).join("\n");
  }
  function guardarMazos() { guardar("myl.mazos", misMazos); }
  function nuevoId() { return "m" + Date.now().toString(36); }

  function agregarAMazo(mazoId, cartaId, delta) {
    const m = misMazos.find((x) => x.id === mazoId);
    if (!m) return;
    const l = m.lineas.find((x) => x[0] === cartaId);
    if (l) { l[1] += delta; if (l[1] <= 0) m.lineas = m.lineas.filter((x) => x !== l); }
    else if (delta > 0) m.lineas.push([cartaId, delta]);
    guardarMazos();
  }

  // ---------- Diálogos ----------
  function dialogo(html, alAbrir) {
    $("#dialogo-contenido").innerHTML = `<div class="dialogo">${html}</div>`;
    $("#dialogo").classList.remove("oculto");
    if (alAbrir) alAbrir($("#dialogo-contenido"));
  }
  function cerrarDialogo() { $("#dialogo").classList.add("oculto"); }

  function pedirNombre(titulo, valor, alAceptar) {
    dialogo(`<h3>${esc(titulo)}</h3><input type="text" id="d-nombre" value="${esc(valor || "")}" placeholder="Nombre del mazo" maxlength="60">
      <div class="botones"><button class="btn-secundario" data-cancelar>Cancelar</button><button class="btn-primario" data-ok>Guardar</button></div>`,
      (caja) => {
        const inp = caja.querySelector("#d-nombre");
        setTimeout(() => inp.focus(), 50);
        const ok = () => { const v = inp.value.trim(); if (!v) return; cerrarDialogo(); alAceptar(v); };
        caja.querySelector("[data-ok]").onclick = ok;
        inp.onkeydown = (e) => { if (e.key === "Enter") ok(); };
        caja.querySelector("[data-cancelar]").onclick = cerrarDialogo;
      });
  }
  function confirmar(titulo, alAceptar) {
    dialogo(`<h3>${esc(titulo)}</h3><div class="botones"><button class="btn-secundario" data-cancelar>Cancelar</button><button class="btn-peligro" data-ok>Sí, borrar</button></div>`,
      (caja) => { caja.querySelector("[data-ok]").onclick = () => { cerrarDialogo(); alAceptar(); }; caja.querySelector("[data-cancelar]").onclick = cerrarDialogo; });
  }
  function elegirMazoPara(c) {
    const opciones = misMazos.map((m) => {
      const l = m.lineas.find((x) => x[0] === c.id);
      return `<button class="opcion" data-mazo="${esc(m.id)}"><span>${esc(m.nombre)}</span><span>${l ? "tiene ×" + l[1] + " · +1" : "+1"}</span></button>`;
    }).join("");
    dialogo(`<h3>Agregar "${esc(c.nom)}" a…</h3>${opciones || `<p class="ayuda">No tienes mazos propios todavía.</p>`}
      <div class="botones"><button class="btn-secundario" data-cancelar>Cancelar</button><button class="btn-primario" data-nuevo>+ Nuevo mazo</button></div>`,
      (caja) => {
        caja.querySelectorAll("[data-mazo]").forEach((b) => b.onclick = () => {
          agregarAMazo(b.dataset.mazo, c.id, 1); cerrarDialogo(); pintarFicha(); aviso("Agregada a " + misMazos.find((m) => m.id === b.dataset.mazo).nombre);
        });
        caja.querySelector("[data-cancelar]").onclick = cerrarDialogo;
        caja.querySelector("[data-nuevo]").onclick = () => {
          cerrarDialogo();
          pedirNombre("Nuevo mazo", "", (nombre) => {
            const m = { id: nuevoId(), nombre, descripcion: "", lineas: [[c.id, 1]] };
            misMazos.push(m); guardarMazos(); pintarFicha(); aviso("Mazo creado con " + c.nom);
          });
        };
      });
  }

  // ---------- Colección ----------
  function pintarColeccion() {
    const ids = Object.keys(coleccion).filter((id) => porId.has(id));
    const total = ids.reduce((a, id) => a + coleccion[id], 0);
    const porEd = {};
    ids.forEach((id) => { const e = porId.get(id).e; porEd[e] = (porEd[e] || 0) + 1; });
    $("#stats-coleccion").innerHTML = `
      <div class="stat"><b>${ids.length}</b><span>cartas distintas</span></div>
      <div class="stat"><b>${total}</b><span>copias en total</span></div>
      <div class="stat"><b>${Math.round(100 * ids.length / cartas.length)}%</b><span>de las 1180</span></div>`;
    const lista = ids.map((id) => porId.get(id));
    ordenar(lista);
    $("#lista-coleccion").innerHTML = lista.map((c) => tarjetaHTML(c)).join("") ||
      `<p class="ayuda" style="grid-column:1/-1">Todavía no marcas ninguna carta.</p>`;
    $("#lista-coleccion").dataset.lista = "coleccion";
    listaColeccion = lista;
  }
  let listaColeccion = [];

  function exportar() {
    const datos = { app: "CartasMyL", fecha: new Date().toISOString(), coleccion, mazos: misMazos };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const nombre = "cartas-myl-respaldo-" + new Date().toISOString().slice(0, 10) + ".json";
    const archivo = new File([blob], nombre, { type: "application/json" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [archivo] })) {
      navigator.share({ files: [archivo], title: "Respaldo Cartas MyL" }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importar(archivo) {
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const d = JSON.parse(lector.result);
        if (d.coleccion) coleccion = d.coleccion;
        if (Array.isArray(d.mazos)) misMazos = d.mazos;
        guardar("myl.coleccion", coleccion); guardarMazos();
        pintarColeccion(); aviso("Respaldo restaurado");
      } catch (e) { aviso("El archivo no es un respaldo válido"); }
    };
    lector.readAsText(archivo);
  }

  // Descarga todas las imágenes al caché del navegador (para usarlas sin internet)
  async function descargarImagenes() {
    const btn = $("#descargar-imagenes"), prog = $("#progreso-imagenes");
    if (!("caches" in window)) { aviso("Este navegador no permite guardar sin conexión"); return; }
    btn.disabled = true;
    const cache = await caches.open("myl-imagenes");
    let hechas = 0, fallidas = 0;
    const pendientes = [];
    for (const c of cartas) {
      const url = imgDe(c);
      if (await cache.match(url)) { hechas++; continue; }
      pendientes.push(url);
    }
    prog.textContent = "Guardando imágenes… " + hechas + " / " + cartas.length;
    const LOTE = 6;
    for (let i = 0; i < pendientes.length; i += LOTE) {
      await Promise.all(pendientes.slice(i, i + LOTE).map(async (url) => {
        try { const r = await fetch(url); if (r.ok) { await cache.put(url, r); hechas++; } else fallidas++; } catch (e) { fallidas++; }
      }));
      prog.textContent = "Guardando imágenes… " + hechas + " / " + cartas.length + (fallidas ? " (" + fallidas + " fallaron)" : "");
    }
    prog.textContent = fallidas ? "Listo con " + fallidas + " imágenes sin guardar (revisa la conexión y vuelve a intentar)." : "¡Listo! Las " + cartas.length + " imágenes quedaron guardadas en el teléfono.";
    btn.disabled = false;
  }

  // ---------- Pestañas ----------
  let vistaActual = "cartas";
  function irA(vista) {
    vistaActual = vista;
    $$(".tab").forEach((t) => t.classList.toggle("activa", t.dataset.vista === vista));
    $$(".vista").forEach((v) => v.classList.toggle("oculto", v.id !== "vista-" + vista));
    const enCartas = vista === "cartas";
    $(".cabecera").classList.toggle("oculto", !enCartas);
    if (!enCartas) $("#panel-filtros").classList.add("oculto"), $("#btn-filtros").setAttribute("aria-expanded", "false");
    if (vista === "mazos") { if (mazoAbierto) pintarMazo(mazoAbierto); else pintarListaMazos(); }
    if (vista === "coleccion") pintarColeccion();
    window.scrollTo(0, 0);
  }

  function aviso(msg) {
    const a = $("#aviso");
    a.textContent = msg; a.classList.remove("oculto");
    clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.add("oculto"), 2200);
  }

  // ---------- Eventos ----------
  let temporizador;
  $("#buscar").addEventListener("input", (e) => {
    texto = e.target.value;
    $("#limpiar").classList.toggle("oculto", !texto);
    clearTimeout(temporizador); temporizador = setTimeout(aplicarFiltros, 120);
  });
  $("#limpiar").addEventListener("click", () => { $("#buscar").value = ""; texto = ""; $("#limpiar").classList.add("oculto"); aplicarFiltros(); $("#buscar").focus(); });
  $("#btn-filtros").addEventListener("click", () => {
    const abierto = $("#panel-filtros").classList.toggle("oculto");
    $("#btn-filtros").setAttribute("aria-expanded", String(!abierto));
  });
  $$(".chips").forEach((grupo) => grupo.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip"); if (!chip) return;
    const clave = grupo.dataset.filtro, v = chip.dataset.v;
    if (clave === "col") { // excluyentes entre sí
      const estaba = filtros.col.has(v); filtros.col.clear(); if (!estaba) filtros.col.add(v);
      grupo.querySelectorAll(".chip").forEach((c) => c.classList.toggle("activo", filtros.col.has(c.dataset.v)));
    } else {
      if (filtros[clave].has(v)) filtros[clave].delete(v); else filtros[clave].add(v);
      chip.classList.toggle("activo");
    }
    aplicarFiltros();
  }));
  $("#orden").addEventListener("change", (e) => { orden = e.target.value; aplicarFiltros(); });
  $("#quitar-filtros").addEventListener("click", () => {
    Object.values(filtros).forEach((s) => s.clear());
    $$(".chip").forEach((c) => c.classList.remove("activo"));
    aplicarFiltros();
  });
  $("#ver-mas").addEventListener("click", pintarMas);

  // Toques en tarjetas (grilla principal y colección)
  $("#grilla").addEventListener("click", (e) => { const b = e.target.closest(".carta"); if (b) abrirFicha(b.dataset.id, resultado); });
  $("#lista-coleccion").addEventListener("click", (e) => { const b = e.target.closest(".carta"); if (b) abrirFicha(b.dataset.id, listaColeccion); });

  // Modal
  $("#cerrar-modal").addEventListener("click", cerrarFicha);
  $("#modal .modal-fondo").addEventListener("click", cerrarFicha);
  $("#ant").addEventListener("click", () => { if (indiceModal > 0) { indiceModal--; pintarFicha(); } });
  $("#sig").addEventListener("click", () => { if (indiceModal < listaModal.length - 1) { indiceModal++; pintarFicha(); } });
  $("#ficha").addEventListener("click", (e) => {
    const b = e.target.closest("[data-accion]"); if (!b) return;
    const c = listaModal[indiceModal];
    if (b.dataset.accion === "mas") cambiarTengo(c, 1);
    else if (b.dataset.accion === "menos") cambiarTengo(c, -1);
    else if (b.dataset.accion === "mazo") elegirMazoPara(c);
  });
  // Deslizar en la ficha para pasar de carta
  let x0 = null;
  $(".modal-caja").addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  $(".modal-caja").addEventListener("touchend", (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) < 70) return;
    if (dx < 0 && indiceModal < listaModal.length - 1) { indiceModal++; pintarFicha(); }
    if (dx > 0 && indiceModal > 0) { indiceModal--; pintarFicha(); }
  }, { passive: true });
  document.addEventListener("keydown", (e) => {
    if ($("#modal").classList.contains("oculto")) return;
    if (e.key === "Escape") cerrarFicha();
    if (e.key === "ArrowLeft") $("#ant").click();
    if (e.key === "ArrowRight") $("#sig").click();
  });
  $("#dialogo .modal-fondo").addEventListener("click", cerrarDialogo);

  // Pestañas
  $$(".tab").forEach((t) => t.addEventListener("click", () => irA(t.dataset.vista)));

  // Mazos
  $("#nuevo-mazo").addEventListener("click", () => pedirNombre("Nuevo mazo", "", (nombre) => {
    misMazos.push({ id: nuevoId(), nombre, descripcion: "", lineas: [] }); guardarMazos(); pintarListaMazos();
  }));
  $("#lista-mazos").addEventListener("click", (e) => {
    const item = e.target.closest(".mazo-item");
    if (item) { pintarMazo(item.dataset.mazo); window.scrollTo(0, 0); return; }
    if (e.target.closest("[data-volver]")) { pintarListaMazos(); return; }
    const m = buscarMazo(mazoAbierto); if (!m) return;
    const quitar = e.target.closest("[data-quitar]");
    if (quitar) { agregarAMazo(m.id, quitar.dataset.quitar, -1); pintarMazo(m.id); return; }
    const linea = e.target.closest(".linea");
    if (linea && linea.dataset.id !== "ORO") {
      const lista = m.lineas.map(cartaDeLinea).filter((c) => c && !c.generico);
      abrirFicha(linea.dataset.id, lista); return;
    }
    if (e.target.closest("[data-faltan]")) {
      const faltan = m.lineas.filter((l) => l[0] !== "ORO" && (coleccion[l[0]] || 0) < l[1]).map((l) => porId.get(l[0])).filter(Boolean);
      if (faltan.length) abrirFicha(faltan[0].id, faltan);
      return;
    }
    if (e.target.closest("[data-compartir]")) {
      const t = textoMazo(m);
      if (navigator.share) navigator.share({ title: m.nombre, text: t }).catch(() => {});
      else navigator.clipboard.writeText(t).then(() => aviso("Lista copiada al portapapeles"));
      return;
    }
    if (e.target.closest("[data-copiar]")) {
      const copia = { id: nuevoId(), nombre: m.nombre + " (mío)", descripcion: m.descripcion, lineas: m.lineas.map((l) => [l[0], l[1]]) };
      misMazos.push(copia); guardarMazos(); pintarMazo(copia.id); aviso("Copiado a tus mazos: ahora puedes editarlo"); return;
    }
    if (e.target.closest("[data-renombrar]")) { pedirNombre("Renombrar mazo", m.nombre, (n) => { m.nombre = n; guardarMazos(); pintarMazo(m.id); }); return; }
    if (e.target.closest("[data-borrar]")) {
      confirmar("¿Borrar el mazo \"" + m.nombre + "\"?", () => { misMazos = misMazos.filter((x) => x.id !== m.id); guardarMazos(); pintarListaMazos(); });
    }
  });

  // Colección
  $("#exportar").addEventListener("click", exportar);
  $("#importar").addEventListener("change", (e) => { if (e.target.files[0]) importar(e.target.files[0]); e.target.value = ""; });
  $("#descargar-imagenes").addEventListener("click", descargarImagenes);

  // ---------- Arranque ----------
  aplicarFiltros();
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
