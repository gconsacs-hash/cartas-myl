/* Armador automático de mazos.
   window.armarMazo(opciones, cartas, coleccion) -> { lineas: [["GJ-90", 3], ...], resumen: "..." }
   Puntúa cada carta según el estilo pedido y arma 50 cartas respetando copias, curva de coste y oros. */
(function () {
  "use strict";

  const RAZAS = ["caballero", "dragon", "faerie", "heroe", "olimpico", "titan", "defensor", "desafiante", "sombra", "eterno", "faraon", "sacerdote"];

  // Reparto de tipos (aliados / talismanes / tótems) y curva de coste de aliados por estilo
  const ESTILOS = {
    agresivo:     { tipos: [0.62, 0.28, 0.10], curva: [0.45, 0.32, 0.18, 0.05] },
    agrocontrol:  { tipos: [0.55, 0.35, 0.10], curva: [0.40, 0.32, 0.20, 0.08] },
    equilibrado:  { tipos: [0.52, 0.33, 0.15], curva: [0.33, 0.30, 0.22, 0.15] },
    control:      { tipos: [0.45, 0.40, 0.15], curva: [0.25, 0.30, 0.25, 0.20] },
  };

  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const azar = (semilla) => { let x = semilla || 1; return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }; };

  // ¿La habilidad exige otra raza distinta de las del mazo? ("tus aliados de raza sombra", "si tienes a ulises")
  function mencionaOtraRaza(h, razas) {
    const m = h.match(/raza[s]? ([a-z]+)( [uo] ([a-z]+))?/g) || [];
    for (const frase of m) {
      // ignora referencias al oponente ("aliado oponente de raza X")
      const idx = h.indexOf(frase);
      const antes = h.slice(Math.max(0, idx - 30), idx);
      if (/oponente|rival/.test(antes)) continue;
      const nombradas = frase.replace(/raza[s]? /, "").split(/ [uo] /);
      if (nombradas.some((r) => RAZAS.includes(r)) && !nombradas.some((r) => razas.includes(r))) return true;
    }
    return false;
  }

  function puntuar(c, op, nombresAliados, rnd) {
    const h = norm(c.h);
    const has = (re) => re.test(h);
    const estilo = op.estilo;
    const agro = estilo === "agresivo" ? 1 : estilo === "agrocontrol" ? 0.6 : estilo === "equilibrado" ? 0.4 : 0.1;
    const ctrl = 1 - agro;
    let p = 0;

    // Referencias a cartas concretas que no van en el mazo
    if (mencionaOtraRaza(h, op.razas)) p -= 5;
    for (const n of nombresAliados) { if (h.includes(n) && !op.nombresEnMazo.has(n)) { p -= 4; break; } }
    if (has(/cada jugador|ambos jugadores|los jugadores|cualquier jugador/)) p -= 1.2;
    if (has(/carta unica|^unica\b|\bunica\./)) p -= 0.3;
    // Sinergia con la raza elegida ("tus aliados de raza X ganan…")
    if (op.razas.some((r) => new RegExp("(?<!oponente[a-z ]{0,20})raza " + r + "(?![a-z ]{0,12}oponente)").test(h))) p += c.t === "Aliado" ? 1 : 2;
    if (has(/oponente (de )?raza|raza [a-z]+ oponente/)) p -= 1.5;
    // Efectos que perjudican a tus propias cartas
    if (has(/tus (demas )?aliados[^.]*pierden|tus aliados pierden su habilidad|(el )?portador pierde su habilidad/)) p -= 4;
    if (has(/luego,? descarta|descarta (una|dos|\d) cartas? de tu mano|debes descartar/) && !has(/oponente descart/)) p -= 1.5;

    if (c.t === "Aliado") {
      const coste = c.c ?? 0, fuerza = c.a ?? 0;
      p += fuerza - coste * 0.8;
      if (has(/furia|puede atacar (cuando|el turno)/)) p += 1.5 + agro * 1.5;
      if (has(/imbloqueable/) && !has(/pueden? bloquear aliados imbloqueables|imbloqueables? (en linea de ataque )?tienen fuerza 0/)) p += 1.5 + agro * 1.5;
      if (has(/no puede ser afectad[oa] por talism/)) p += 1.5;
      if (has(/indestructible/)) p += 1.5;
      if ((has(/cuando .{0,40}entra en juego.{0,60}(destruye|destierra|baraja|destruir|desterrar|barajar).{0,30}(oponente|aliado)/) && !has(/uno de tus|de tus aliados|tus aliados/)) || has(/destruye un aliado oponente|destruir un aliado oponente|elegir un aliado oponente/)) p += 2.5 + ctrl;
      if (has(/cada jugador (debe )?destru/)) p += 2.5 + ctrl;
      if (has(/roba/)) p += 1.5;
      if (has(/oponente (debe |debera )?bot/)) p += 0.5 + agro * 1.5;
      if (has(/tus (demas )?aliados.{0,30}ganan|aliados de raza [a-z]+ ganan/)) p += 2 + agro;
      if (has(/tus aliados[^.]{0,25}tienen furia/)) p += 2.5 + agro;
      if (has(/puedes pagar \d oro[^.]{0,30}gan/)) p += 1;
      if (has(/destruir (uno|dos|2) de tus (aliados|oros)|destruir \d oros|destruye uno de tus aliados/)) p -= 2.5;
      if (has(/solo puede entrar en juego si|solo puede[s]? bajar/)) p -= 2.5;
      if (has(/barajar (un|uno de tus) aliado/) && !has(/oponente/)) p -= 2;
      if (has(/aliados oponentes pierden|aliados oponentes ganan -/)) p += 1.5;
      if (has(/guardian|no puede ser declarado atacante|solo puede bloquear/)) { p += -3 * agro + (fuerza >= 4 ? 1.5 : 0.5) * ctrl; }
      if (has(/puede bloquear (a )?mas de un/)) p += 1.5 * ctrl;
      if (has(/(destierra|destruye|destruir|destruid|desterrad)[a-z]* (a )?[a-z ,]*(al final|en la fase final)|al final de(l| este) turno,? (debe ser )?(destruirlo|desterrarlo|destierralo|destruido|desterrado)|en la fase final,? (debe ser )?(destruido|desterrado)/)) p -= 2.5 - agro;
      if (has(/para (jugar|que|bajar).{0,40}(debes|debe)/)) p -= 1.5;
      if (has(/para que .{0,40}(atacante|ataque).{0,25}(debes|debe) pagar/)) p -= 2.5;
      if (has(/solo puede atacar,? si/)) p -= 2;
      if (has(/linea de defensa oponente/) && has(/juega a/)) p -= 6;
      if (has(/tus demas aliados pierden/)) p -= 3;
      if (has(/anula|cancelar|cancela/)) p += 1 + ctrl;
      // Curva según estilo
      if (coste >= 5) p -= (coste - 4) * (1.5 * agro + 0.3);
      if (coste <= 1 && fuerza <= 1 && !has(/furia|imbloqueable|roba|destru/)) p -= 1;
    } else if (c.t === "Talismán") {
      const coste = c.c ?? 0;
      if (has(/anula/) && !has(/no puede ser anulad/)) p += 1.5 + ctrl * 2;
      if (has(/todos los aliados en juego/) && has(/destruye|destierra/)) p += 3.5 * ctrl - 3 * agro;
      else if (has(/(destruye|destierra) (un |una |dos |la |todos los )?(aliado|carta)/) && !has(/uno de tus|tus aliados|de tus aliados/)) p += 3 + ctrl * 0.5;
      if (has(/(destruye|destierra) (un |dos )?aliados? oponente/)) p += 0.5;
      if (has(/baraja.{0,30}(aliado|carta).{0,20}oponente|aliados? oponente.{0,20}baraj/)) p += 2;
      if (has(/cancela(r)? (un |el )?ataque/)) p += 1 + ctrl * 2;
      if (has(/roba/)) p += 1.5;
      if (has(/oponente (debe |debera )?bot|bote (\d|tantas)/)) p += 0.3 + agro * 1.8;
      if (has(/gana[n]? \+? ?\d a la fuerza|ganan \d/)) p += 0.5 + agro * 1.5 + (has(/tus aliados|todos tus/) ? 1 : 0);
      if (has(/imbloqueable/)) p += agro * 1.5;
      if (has(/reduc(e|ir) todo el dano a 0/)) p += ctrl * 1.5;
      if (has(/descarta/) && has(/oponente/)) p += 1;
      if (has(/destruye uno de tus|destruir uno de tus|destruye 2 de tus|destruye dos de tus/)) p -= 1.5;
      if (has(/busca (un|una|dos) (aliado|arma|talisman|oro)/)) p += 0.5;
      if (has(/solo puedes jugar|en respuesta a que (tu oponente )?juegue/)) p -= 0.3;
      p -= coste * 0.55;
      if (coste === 0) p += 0.5;
    } else if (c.t === "Tótem") {
      const coste = c.c ?? 0;
      if (has(/tus (demas )?aliados.{0,40}ganan/)) p += 2.5 + agro * 1.5;
      if (has(/aliados oponentes pierden/)) p += 2.5;
      if (has(/no puede[sn]? (ser atacado|declarar ataque)|no se puede declarar ataque|se saltan/)) p += -4 * agro + 3 * ctrl;
      if (has(/cancelar el ataque|cancelar un ataque/)) p += 1 + ctrl * 2;
      if (has(/roba/)) p += 1.5;
      if (has(/oponente (debe |debera )?bot/)) p += agro * 1.5 + 0.3;
      if (has(/anula/)) p += 1 + ctrl;
      if (has(/imbloqueable/) && has(/ganan/)) p += agro;
      if (has(/errante|solo puedes tener un/)) p -= 0.5;
      p -= coste * 0.45;
    } else if (c.t === "Arma") {
      if (!op.armas) return -99;
      const coste = c.c ?? 0;
      const m = h.match(/gana (\d) a la fuerza/); if (m) p += Number(m[1]) * 1.2;
      if (has(/imbloqueable/) && !has(/pierde/)) p += 2;
      if (has(/furia/)) p += 1.5;
      if (has(/solo puede ser portad/)) p -= 6;
      if (has(/pierde (su habilidad|\d a la fuerza)/)) p -= 1.5;
      if (has(/no puede (ser declarado|atacar)/)) p -= 4;
      p -= coste * 0.6;
    } else if (c.t === "Oro") {
      // Solo oros claramente útiles: raciales, robar cartas o anular daño
      if (!c.h) return -99;
      p = 0;
      if (op.razas.some((r) => h.includes("raza " + r))) p += 5;
      else if (mencionaOtraRaza(h, op.razas) || has(/raza/)) return -99;
      if (has(/roba(r)? (una|1|2|dos) carta/) && !has(/en vez de robar/)) p += 2.5;
      if (has(/reduc(e|ir) todo el dano a 0/)) p += 2.5;
      if (p < 2) return -99;
    }
    return p + (rnd() - 0.5) * op.variacion;
  }

  function copiasMax(c, op) {
    const h = norm(c.h);
    const cap = c.t === "Aliado" ? op.copiasAliado : c.t === "Tótem" ? op.copiasTotem : op.copiasTalisman;
    let k = cap;
    if (/carta unica|^unica\b|\bunica\.|errante|solo puedes tener (un|una) /.test(h)) k = Math.min(k, 2);
    if (op.soloTengo) k = Math.min(k, op.coleccion[c.id] || 0);
    return k;
  }

  window.armarMazo = function (opciones, cartas, coleccion) {
    const op = {
      razas: (opciones.razas || []).map(norm),
      ediciones: opciones.ediciones || [],
      estilo: ESTILOS[opciones.estilo] ? opciones.estilo : "agrocontrol",
      copiasAliado: opciones.copiasAliado || 3,
      copiasTalisman: opciones.copiasTalisman || 3,
      copiasTotem: opciones.copiasTotem || 3,
      oros: opciones.oros || 17,
      armas: !!opciones.armas,
      soloTengo: !!opciones.soloTengo,
      variacion: opciones.variacion ?? 0.7,
      coleccion: coleccion || {},
      nombresEnMazo: new Set(),
    };
    const rnd = azar(opciones.semilla || Date.now() % 100000);
    const cfg = ESTILOS[op.estilo];

    // Pool
    let pool = cartas.filter((c) => !op.ediciones.length || op.ediciones.includes(c.e));
    if (op.razas.length) pool = pool.filter((c) => c.t !== "Aliado" || op.razas.includes(norm(c.r)));
    if (op.soloTengo) pool = pool.filter((c) => (op.coleccion[c.id] || 0) > 0);

    const nombresAliados = cartas.filter((c) => c.t === "Aliado" && c.nom.length > 4).map((c) => norm(c.nom));
    // Primera pasada de aliados (para saber qué nombres estarán en el mazo)
    const aliadosPool = pool.filter((c) => c.t === "Aliado");
    aliadosPool.forEach((c) => (c._p = puntuar(c, op, [], rnd)));
    aliadosPool.sort((a, b) => b._p - a._p).slice(0, 25).forEach((c) => op.nombresEnMazo.add(norm(c.nom)));

    pool.forEach((c) => (c._p = puntuar(c, op, nombresAliados, rnd)));

    // Cantidades objetivo
    const resto = 50 - op.oros;
    const nTot = Math.round((resto * cfg.tipos[2]) / op.copiasTotem) * op.copiasTotem;
    let nTal = Math.round((resto * cfg.tipos[1]) / op.copiasTalisman) * op.copiasTalisman;
    let nAli = resto - nTot - nTal;
    if (op.armas) { const nArm = Math.min(6, Math.round(nAli * 0.15)); nAli -= nArm; op.nArmas = nArm; } else op.nArmas = 0;

    const lineas = [];
    const usados = new Set();
    let total = 0;

    function llenar(tipo, objetivo, cuotas) {
      const cands = pool.filter((c) => c.t === tipo && c._p > -50).sort((a, b) => b._p - a._p);
      const porCubo = [0, 0, 0, 0];
      const cubo = (c) => (c.c ?? 0) <= 2 ? 0 : (c.c ?? 0) === 3 ? 1 : (c.c ?? 0) === 4 ? 2 : 3;
      let n = 0;
      const pasada = (respetarCuotas) => {
        for (const c of cands) {
          if (n >= objetivo) break;
          if (usados.has(c.id)) continue;
          const k = Math.min(copiasMax(c, op), objetivo - n);
          if (k <= 0) continue;
          if (respetarCuotas && cuotas) {
            const b = cubo(c);
            if (porCubo[b] + k > Math.ceil(cuotas[b] * objetivo) + 1) continue;
            porCubo[b] += k;
          }
          lineas.push([c.id, k]); usados.add(c.id); n += k;
        }
      };
      pasada(true);
      if (n < objetivo) pasada(false);
      return n;
    }

    total += llenar("Aliado", nAli, cfg.curva);
    total += llenar("Talismán", nTal, null);
    total += llenar("Tótem", nTot, null);
    if (op.nArmas) total += llenar("Arma", op.nArmas, null);

    // Oros: especiales con puntaje, el resto básicos
    let orosRestantes = 50 - total;
    const orosEsp = pool.filter((c) => c.t === "Oro" && c._p > 0).sort((a, b) => b._p - a._p);
    let especiales = 0;
    for (const c of orosEsp) {
      if (orosRestantes <= 3 || especiales >= 6) break;
      const k = Math.min(copiasMax(c, { ...op, copiasTalisman: 3 }), 3, orosRestantes - 3, 6 - especiales);
      if (k > 0) { lineas.push([c.id, k]); orosRestantes -= k; especiales += k; }
    }
    if (orosRestantes > 0) lineas.push(["ORO", orosRestantes]);

    const porId = new Map(cartas.map((c) => [c.id, c]));
    const cuenta = {};
    lineas.forEach((l) => { const t = l[0] === "ORO" ? "Oro" : porId.get(l[0]).t; cuenta[t] = (cuenta[t] || 0) + l[1]; });
    const nombreEstilo = { agresivo: "agresivo", agrocontrol: "agro-control", equilibrado: "equilibrado", control: "control" }[op.estilo];
    const partes = ["Aliado", "Talismán", "Arma", "Tótem", "Oro"].filter((t) => cuenta[t]).map((t) => cuenta[t] + " " + (cuenta[t] > 1 ? { Aliado: "aliados", Talismán: "talismanes", Arma: "armas", Tótem: "tótems", Oro: "oros" }[t] : t.toLowerCase()));
    const resumen = "Armado automático · estilo " + nombreEstilo +
      (op.razas.length ? " · raza " + opciones.razas.join("/") : " · cualquier raza") +
      " · " + op.copiasAliado + " copia" + (op.copiasAliado > 1 ? "s" : "") + " por aliado" +
      (op.soloTengo ? " · solo cartas que tienes" : "") + ". " + partes.join(", ") + "." +
      (total < nAli + nTal + nTot + op.nArmas ? " No había suficientes cartas para lo pedido: se completó con oros." : "");
    return { lineas, resumen };
  };
})();
