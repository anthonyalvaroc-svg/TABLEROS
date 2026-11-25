const FONT_SIZE_RELLENO = 16;
const STORAGE_KEY = "esquemas_tecnicos_estado_v4";
const USER_TEMPLATE_KEY = "esquemas_tecnicos_plantilla_usuario_v1";
const KNOWLEDGE_DB_KEY = "esquemas_tecnicos_cerebro_sitios_v1";

function setFuenteRelleno(ctx, color = "#111827", align = "center", baseline = "middle", size = FONT_SIZE_RELLENO) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
}

function drawTextWithHalo(ctx, texto, x, y, options = {}) {
  const {
    color = "#111827",
    align = "left",
    baseline = "middle",
    size = FONT_SIZE_RELLENO,
    padX = 4,
    padY = 2,
    bgColor = "rgba(255, 255, 255, 0.90)"
  } = options;

  ctx.save();
  setFuenteRelleno(ctx, color, align, baseline, size);
  const metrics = ctx.measureText(texto);
  const textW = metrics.width;
  const textH = size * 1.15;

  let boxX = x - padX;
  if (align === "center") boxX = x - textW / 2 - padX;
  else if (align === "right") boxX = x - textW - padX;

  let boxY = y - textH / 2 - padY;
  if (baseline === "top") boxY = y - padY;
  else if (baseline === "bottom") boxY = y - textH - padY;

  ctx.fillStyle = bgColor;
  ctx.fillRect(boxX, boxY, textW + padX * 2, textH + padY * 2);

  ctx.fillStyle = color;
  ctx.fillText(texto, x, y);
  ctx.restore();
}

function activarTab(targetId, btnEl) {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((b) => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
    b.setAttribute("tabindex", "-1");
  });
  tabPanels.forEach((p) => {
    p.classList.remove("active");
    p.hidden = true;
  });

  if (btnEl) {
    btnEl.classList.add("active");
    btnEl.setAttribute("aria-selected", "true");
    btnEl.setAttribute("tabindex", "0");
  }
  const panel = document.getElementById(targetId);
  if (panel) {
    panel.classList.add("active");
    panel.hidden = false;
  }

  dibujarTabActiva(targetId);
}

window.activarTab = activarTab;

function getSitio() {
  const input = document.getElementById("sitio");
  const val = input ? input.value : "";
  return val.trim().toUpperCase() || "SITIO";
}

function getSitioSlug() {
  return getSitio().replace(/[^A-Z0-9_-]+/g, "_") || "SITIO";
}

function parsePositiveNum(val, fallback = 0) {
  const num = parseFloat(val);
  if (isNaN(num) || !isFinite(num)) return fallback;
  return Math.max(0, num);
}

function formatNum(val, dec = 2, fallback = 0) {
  return parsePositiveNum(val, fallback).toFixed(dec);
}

/* =========================================================
   CONVERSIÓN Y NORMALIZACIÓN DE COORDENADAS (GMS / DECIMAL)
   ========================================================= */
function decimalAGMS(lat, lon) {
  const formatPart = (val, posHem, negHem) => {
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(2);
    const hem = val >= 0 ? posHem : negHem;
    return `${String(deg).padStart(2, "0")}°${String(min).padStart(2, "0")}'${String(sec).padStart(5, "0")}"${hem}`;
  };
  return `${formatPart(lat, "N", "S")} ${formatPart(lon, "E", "W")}`;
}

function parsearCoordenadaUniversal(raw) {
  if (!raw) return null;
  const clean = raw.trim();

  const decMatch = clean.match(/^(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)$/);
  if (decMatch) {
    return {
      lat: parseFloat(decMatch[1]),
      lon: parseFloat(decMatch[2])
    };
  }

  const dmsRegex = /(\d{1,3})[°º]\s*(\d{1,2})['’]\s*(\d{1,2}(?:[.,]\d+)?)["”]?\s*([NSns])\s*[,;\s]*(\d{1,3})[°º]\s*(\d{1,2})['’]\s*(\d{1,2}(?:[.,]\d+)?)["”]?\s*([WOEwoe])/;
  const m = clean.match(dmsRegex);
  if (m) {
    let lat = parseFloat(m[1]) + parseFloat(m[2]) / 60 + parseFloat(m[3].replace(",", ".")) / 3600;
    if (m[4].toUpperCase() === "S") lat = -lat;
    let lon = parseFloat(m[5]) + parseFloat(m[6]) / 60 + parseFloat(m[7].replace(",", ".")) / 3600;
    if (m[8].toUpperCase() === "W" || m[8].toUpperCase() === "O") lon = -lon;
    return { lat, lon };
  }

  return null;
}

function formatearCoordenadaSegunModo(raw) {
  if (!raw) return "";
  const modo = document.getElementById("perFormatoCoord")?.value || "gms";
  const parsed = parsearCoordenadaUniversal(raw);
  if (!parsed) return raw.replace(/\s+/g, " ").trim();

  if (modo === "gms") {
    return decimalAGMS(parsed.lat, parsed.lon);
  }
  return `${parsed.lat.toFixed(6)}, ${parsed.lon.toFixed(6)}`;
}

function setAviso(elementId, mensaje, tipo = "error") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.toggle("warning", tipo === "warning");
  if (mensaje) {
    el.textContent = mensaje;
    el.hidden = false;
  } else {
    el.textContent = "";
    el.hidden = true;
  }
}

function descargarCanvas(canvasId, prefijo) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  descargarCanvasElement(canvas, `${prefijo}_${getSitioSlug()}.png`);
}

function descargarCanvasElement(canvas, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function dibujarSimboloTorre(ctx, tipo, cx, cy, sizeMultiplier = 1) {
  ctx.save();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 3.5;

  let textOffsetY = 0;

  if (tipo === "auto_cuadrado") {
    const s = 148 * sizeMultiplier;
    ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
  } else if (tipo === "auto_triangulo") {
    const r = 82 * sizeMultiplier;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx - r * 0.9, cy + r * 0.72);
    ctx.lineTo(cx + r * 0.9, cy + r * 0.72);
    ctx.closePath();
    ctx.stroke();
    textOffsetY = 14 * sizeMultiplier;
  } else if (tipo === "monopolo") {
    const rad = 64 * sizeMultiplier;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tipo === "ventada") {
    const s = 86 * sizeMultiplier;
    ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
  } else if (tipo === "arriostrada") {
    const rad = 40 * sizeMultiplier;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  setFuenteRelleno(ctx, "#111827", "center", "middle");
  ctx.fillText("TORRE", cx, cy + textOffsetY);
  ctx.restore();
}

function dibujarPozo(ctx, x, y, label) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2.5;
  ctx.fillRect(x - 14, y - 18, 28, 36);
  ctx.strokeRect(x - 14, y - 18, 28, 36);

  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y);
  ctx.moveTo(x - 9, y);
  ctx.lineTo(x + 9, y);
  ctx.moveTo(x - 6, y + 6);
  ctx.lineTo(x + 6, y + 6);
  ctx.moveTo(x - 3, y + 12);
  ctx.lineTo(x + 3, y + 12);
  ctx.stroke();

  setFuenteRelleno(ctx, "#111827", "center", "bottom");
  ctx.fillText(label, x, y - 22);
  ctx.restore();
}

function dibujarPuertaDobleHorizontal(ctx, x, y, anchoTotal, dirY = 1) {
  const half = anchoTotal / 2;
  ctx.save();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 2, y - 6, anchoTotal + 4, 12);

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y + 6);
  ctx.moveTo(x + anchoTotal, y - 6);
  ctx.lineTo(x + anchoTotal, y + 6);
  ctx.stroke();

  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + dirY * half);
  ctx.moveTo(x + anchoTotal, y);
  ctx.lineTo(x + anchoTotal, y + dirY * half);
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  if (dirY > 0) {
    ctx.arc(x, y, half, 0, Math.PI / 2, false);
    ctx.arc(x + anchoTotal, y, half, Math.PI / 2, Math.PI, false);
  } else {
    ctx.arc(x, y, half, -Math.PI / 2, 0, false);
    ctx.arc(x + anchoTotal, y, half, -Math.PI, -Math.PI / 2, false);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* =========================================================
   PESTAÑA 1: DIAGRAMA SPAT (F12M)
   ========================================================= */
function dibujarSpat() {
  const canvas = document.getElementById("canvasSpat");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const sitio = getSitio();
  const tipoTorre = document.getElementById("spatTipoTorre").value;
  const cantPozos = Math.min(6, Math.max(1, parseInt(document.getElementById("cantidadPozos").value, 10) || 3));
  const raw50 = parseFloat(document.getElementById("val50").value);
  const raw60 = parseFloat(document.getElementById("val60").value);
  const raw70 = parseFloat(document.getElementById("val70").value);

  const v50 = formatNum(raw50, 2);
  const v60 = formatNum(raw60, 2);
  const v70 = formatNum(raw70, 2);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const boxX = 65;
  const boxY = 55;
  const boxW = 380;
  const boxH = 400;

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 5;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  const centerX = boxX + boxW / 2;
  ctx.save();
  setFuenteRelleno(ctx, "#dc2626", "center", "middle", 32);
  ctx.fillText(sitio, centerX, boxY + 34);
  ctx.restore();

  dibujarSimboloTorre(ctx, tipoTorre, centerX, boxY + boxH / 2 + 25, 1);

  const posicionesPozos = [
    { x: boxX + 275, y: boxY + 325 },
    { x: boxX + 275, y: boxY + 125 },
    { x: boxX + 190, y: boxY + 100 },
    { x: boxX + 95,  y: boxY + 125 },
    { x: boxX + 95,  y: boxY + 325 },
    { x: boxX + 185, y: boxY + 350 }
  ];

  if (cantPozos > 1) {
    ctx.save();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < cantPozos; i++) {
      const p = posicionesPozos[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < cantPozos; i++) {
    dibujarPozo(ctx, posicionesPozos[i].x, posicionesPozos[i].y, `PT0${i + 1}`);
  }

  const pt01 = posicionesPozos[0];
  const doorWidth = 76;
  const doorX = pt01.x - 28;
  const doorY = boxY + boxH;
  dibujarPuertaDobleHorizontal(ctx, doorX, doorY, doorWidth, 1);

  const telX = 435;
  const telY = 545;
  const telW = 30;
  const telH = 78;

  ctx.save();
  ctx.strokeStyle = "#16a34a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(pt01.x, pt01.y + 18);
  ctx.lineTo(pt01.x, doorY + 62);
  ctx.lineTo(telX + 10, telY + 18);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 3;
  ctx.fillRect(telX, telY, telW, telH);
  ctx.strokeRect(telX, telY, telW, telH);

  setFuenteRelleno(ctx, "#111827", "left", "middle");
  ctx.fillText("TELUROMETRO", telX + 38, telY + 24);
  ctx.restore();

  const endBlueX = 595;
  const endBlueY = 825;
  ctx.save();
  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(telX + 8, telY + telH);
  ctx.lineTo(endBlueX, endBlueY);
  ctx.stroke();

  const endRedX = 720;
  const endRedY = 935;
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(telX + 22, telY + telH);
  ctx.lineTo(endRedX, endRedY);
  ctx.stroke();
  ctx.restore();

  const lecturas = [
    { pct: "50%-15MTS=", ohm: `${v50} OHMS`, x: 565, y: 635 },
    { pct: "60%-18MTS=", ohm: `${v60} OHMS`, x: 645, y: 745 },
    { pct: "70%-21MTS=", ohm: `${v70} OHMS`, x: 725, y: 855 }
  ];

  lecturas.forEach((item) => {
    ctx.save();
    setFuenteRelleno(ctx, "#111827", "left", "top", 24);
    ctx.fillText(item.pct, item.x, item.y);

    setFuenteRelleno(ctx, "#dc2626", "left", "top", 48);
    ctx.fillText(item.ohm, item.x, item.y + 30);
    ctx.restore();
  });

  ctx.save();
  setFuenteRelleno(ctx, "#111827", "center", "top");
  ctx.fillText("30 MTS", endRedX, endRedY + 12);
  ctx.restore();

  if ([raw50, raw60, raw70].some((n) => isNaN(n) || n <= 0)) {
    setAviso("avisoSpat", "Verifica las mediciones de resistencia: hay valores en 0.00 OHMS o vacíos.", "warning");
  } else if (Math.max(raw50, raw60, raw70) > 25) {
    setAviso("avisoSpat", "Aviso técnico: una o más lecturas superan los 25 OHMS referenciales.", "warning");
  } else {
    setAviso("avisoSpat", "");
  }
}

/* =========================================================
   PESTAÑA 2: ESQUEMA 1 - PERÍMETRO Y COORDENADAS INCLINADAS
   ========================================================= */
function dibujarCoordInclinada(ctx, x, y, titulo, coordTexto, angleRad) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);

  drawTextWithHalo(ctx, titulo, 0, -13, { align: "center", baseline: "middle", size: 15 });
  drawTextWithHalo(ctx, coordTexto || "-", 0, 13, { align: "center", baseline: "middle", size: 15 });
  ctx.restore();
}

function sincronizarDestinoDesdePerimetro(forzar = false) {
  const cA = (document.getElementById("coordA")?.value || "").trim();
  const cB = (document.getElementById("coordB")?.value || "").trim();
  const cC = (document.getElementById("coordC")?.value || "").trim();
  const cD = (document.getElementById("coordD")?.value || "").trim();
  const coordValida = cA || cB || cC || cD;
  const destInput = document.getElementById("rutaDestino");
  if (destInput && coordValida && (forzar || !destInput.dataset.manualEdit)) {
    destInput.value = coordValida;
  }
}

function dibujarPerimetro() {
  const canvas = document.getElementById("canvasPerimetro");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const sitio = getSitio();
  const rawAncho = parseFloat(document.getElementById("perAncho").value);
  const rawLargo = parseFloat(document.getElementById("perLargo").value);
  const invalidoDim = isNaN(rawAncho) || isNaN(rawLargo) || rawAncho <= 0 || rawLargo <= 0;

  const numAncho = rawAncho > 0 ? rawAncho : 8.1;
  const numLargo = rawLargo > 0 ? rawLargo : 10.0;
  const ancho = numAncho.toFixed(2);
  const largo = numLargo.toFixed(2);

  const tipoTorre = document.getElementById("perTipoTorre").value;
  const coordA = formatearCoordenadaSegunModo(document.getElementById("coordA").value);
  const coordB = formatearCoordenadaSegunModo(document.getElementById("coordB").value);
  const coordC = formatearCoordenadaSegunModo(document.getElementById("coordC").value);
  const coordD = formatearCoordenadaSegunModo(document.getElementById("coordD").value);

  sincronizarDestinoDesdePerimetro(false);

  const faltanCoords = !coordA || !coordB || !coordC || !coordD;

  if (invalidoDim) {
    setAviso("avisoPerimetro", "Ingresa valores mayores a 0 en Ancho y Largo para calcular la proporción exacta.", "error");
  } else if (faltanCoords) {
    setAviso("avisoPerimetro", "Faltan una o más coordenadas de vértice (A, B, C o D).", "warning");
  } else {
    setAviso("avisoPerimetro", "");
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const ratio = numAncho / numLargo;
  const maxW = 640;
  const maxH = 520;
  const minSide = 310;
  let rectW = maxW;
  let rectH = maxH;

  if (ratio >= 1) {
    rectW = maxW;
    rectH = Math.max(minSide, Math.min(maxH, maxW / ratio));
  } else {
    rectH = maxH;
    rectW = Math.max(minSide, Math.min(maxW, maxH * ratio));
  }

  const rectX = (canvas.width - rectW) / 2;
  const rectY = 145;

  const doorW = 84;
  const doorX = rectX + 24;
  const doorY = rectY;
  dibujarPuertaDobleHorizontal(ctx, doorX, doorY, doorW, -1);

  ctx.save();
  const calloutX = rectX - 24;
  const calloutY = rectY - 84;
  const calloutW = 190;
  const calloutH = 42;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.5;
  ctx.fillRect(calloutX, calloutY, calloutW, calloutH);
  ctx.strokeRect(calloutX, calloutY, calloutW, calloutH);

  ctx.beginPath();
  ctx.moveTo(calloutX + calloutW * 0.55, calloutY + calloutH);
  ctx.lineTo(doorX + doorW * 0.5, doorY - 40);
  ctx.stroke();

  setFuenteRelleno(ctx, "#111827", "center", "middle");
  ctx.fillText("PUERTA DE ACCESO", calloutX + calloutW / 2, calloutY + calloutH / 2);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 4;
  ctx.strokeRect(rectX, rectY, rectW, rectH);
  ctx.restore();

  const centerRectX = rectX + rectW / 2;
  const centerRectY = rectY + rectH / 2;

  [rectY - 24, rectY + rectH + 26].forEach((by) => {
    ctx.save();
    setFuenteRelleno(ctx, "#111827", "center", "middle");
    ctx.fillText(`${ancho} MTS`, centerRectX, by);
    ctx.restore();
  });

  [rectX - 28, rectX + rectW + 28].forEach((bx) => {
    ctx.save();
    ctx.translate(bx, centerRectY);
    ctx.rotate(-Math.PI / 2);
    setFuenteRelleno(ctx, "#111827", "center", "middle");
    ctx.fillText(`${largo} MTS`, 0, 0);
    ctx.restore();
  });

  const sizeMult = Math.max(0.55, Math.min(0.85, Math.min(rectW, rectH) / 480));
  drawTextWithHalo(ctx, sitio, centerRectX, centerRectY - 82 * sizeMult, {
    color: "#dc2626",
    align: "center",
    baseline: "middle",
    size: 32
  });

  dibujarSimboloTorre(ctx, tipoTorre, centerRectX, centerRectY + 12 * sizeMult, sizeMult);

  const diagOffsetX = Math.min(135, rectW * 0.25);
  const diagOffsetY = Math.min(82, rectH * 0.23);

  dibujarCoordInclinada(ctx, rectX + diagOffsetX, rectY + diagOffsetY, "COORDENADA A:", coordA, -Math.PI / 4);
  dibujarCoordInclinada(ctx, rectX + rectW - diagOffsetX, rectY + diagOffsetY, "COORDENADA B:", coordB, Math.PI / 4);
  dibujarCoordInclinada(ctx, rectX + rectW - diagOffsetX, rectY + rectH - diagOffsetY, "COORDENADA C:", coordC, -Math.PI / 4);
  dibujarCoordInclinada(ctx, rectX + diagOffsetX, rectY + rectH - diagOffsetY, "COORDENADA D:", coordD, Math.PI / 4);
}

/* =========================================================
   SINCRONIZACIÓN BIDIRECCIONAL ENTRE PESTAÑAS
   ========================================================= */
const PREAJUSTE_RANGO_TORRE = {
  arbol: { topY: 0.14, bottomY: 0.86 },
  monopolo: { topY: 0.12, bottomY: 0.88 },
  autosoportada_normal: { topY: 0.11, bottomY: 0.89 },
  arriostrada_escalera_gato: { topY: 0.14, bottomY: 0.72 },
  ventada_edificio: { topY: 0.14, bottomY: 0.68 },
  ventada_piso: { topY: 0.12, bottomY: 0.88 },
  autosoportada_encima: { topY: 0.11, bottomY: 0.89 },
  arriostrada_edificio_normal: { topY: 0.14, bottomY: 0.68 },
  autosoportada_sin_roldana: { topY: 0.11, bottomY: 0.89 },
  estructura_especial: { topY: 0.10, bottomY: 0.55 },
  autosoportada_rooftop: { topY: 0.10, bottomY: 0.52 },
  monopolo_1_roldana: { topY: 0.12, bottomY: 0.88 },
  monopolo_2_roldanas: { topY: 0.12, bottomY: 0.88 },
  monoposte: { topY: 0.12, bottomY: 0.88 }
};

function obtenerSimboloDesdeModelo(modelo) {
  if (
    modelo === "arbol" ||
    modelo === "monopolo" ||
    modelo === "monopolo_1_roldana" ||
    modelo === "monopolo_2_roldanas" ||
    modelo === "monoposte"
  ) {
    return "monopolo";
  }
  if (modelo === "ventada_edificio" || modelo === "ventada_piso") {
    return "ventada";
  }
  if (modelo === "arriostrada_escalera_gato" || modelo === "arriostrada_edificio_normal") {
    return "arriostrada";
  }
  return "auto_cuadrado";
}

function sincronizarModeloTorreGlobal(modelo, origen = "") {
  const globalSel = document.getElementById("globalTipoTorre");
  const torreSel = document.getElementById("torreTipo");
  const spatSel = document.getElementById("spatTipoTorre");
  const perSel = document.getElementById("perTipoTorre");

  if (globalSel && origen !== "globalTipoTorre") globalSel.value = modelo;
  if (torreSel && origen !== "torreTipo") torreSel.value = modelo;

  const simbolo = obtenerSimboloDesdeModelo(modelo);
  if (spatSel) spatSel.value = simbolo;
  if (perSel) perSel.value = simbolo;

  const rango = PREAJUSTE_RANGO_TORRE[modelo] || { topY: 0.14, bottomY: 0.86 };
  if (typeof fotosPanoramicas !== "undefined" && Array.isArray(fotosPanoramicas)) {
    fotosPanoramicas.forEach((f) => {
      f.topY = rango.topY;
      f.bottomY = rango.bottomY;
      calcularCalloutsParaFoto(f);
    });
  }
}

function sincronizarSimboloDesdePestana1o2(simbolo, origen) {
  const spatSel = document.getElementById("spatTipoTorre");
  const perSel = document.getElementById("perTipoTorre");
  if (spatSel && origen !== "spatTipoTorre") spatSel.value = simbolo;
  if (perSel && origen !== "perTipoTorre") perSel.value = simbolo;
}

function sincronizarAlturaGlobal(nuevaAltura, origen = "") {
  const val = parseFloat(nuevaAltura);
  if (isNaN(val) || val <= 0) return;
  const formatted = val.toFixed(2);

  const gAlt = document.getElementById("globalAlturaTorre");
  const tAlt = document.getElementById("alturaTorre");
  const eAlt = document.getElementById("equiposAlturaRef");

  if (gAlt && origen !== "globalAlturaTorre") gAlt.value = formatted;
  if (tAlt && origen !== "alturaTorre") tAlt.value = formatted;
  if (eAlt && origen !== "equiposAlturaRef") eAlt.value = formatted;

  if (typeof recalcularYRenderizarTodasFotos === "function") {
    recalcularYRenderizarTodasFotos();
  }
}

/* =========================================================
   PESTAÑA 3: ESQUEMA 2 - ELEVACIÓN DE TORRE (14 MODELOS)
   ========================================================= */
const MODELOS_TORRE = {
  arbol: {
    nombre: "Torre público tipo árbol",
    src: "img/1_torre_arbol.png",
    sitioPos: { xRatio: 0.74, yRatio: 0.13 },
    cotas: (v) => [
      { texto: `${v.alturaTotal} m`, xRatio: 0.052, yRatio: 0.485, size: 22 },
      { texto: `${v.alturaBase} m`,  xRatio: 0.892, yRatio: 0.928, size: 22 }
    ]
  },
  monopolo: {
    nombre: "Torre monopolo (3 roldanas)",
    src: "img/2_torre_monopolo.png",
    sitioPos: { xRatio: 0.14, yRatio: 0.15 },
    cotas: (v) => [
      { texto: `${v.alturaTotal} m`, xRatio: 0.062, yRatio: 0.450, size: 23 },
      { texto: `${v.alturaBase} m`,  xRatio: 0.785, yRatio: 0.956, size: 21 },
      { texto: `${v.rol1Sup} m`,     xRatio: 0.742, yRatio: 0.066, size: 15 },
      { texto: `${v.rol1Inf} m`,     xRatio: 0.742, yRatio: 0.128, size: 15 },
      { texto: `${v.rol2Sup} m`,     xRatio: 0.736, yRatio: 0.189, size: 15 },
      { texto: `${v.rol2Inf} m`,     xRatio: 0.745, yRatio: 0.251, size: 15 },
      { texto: `${v.rol3Sup} m`,     xRatio: 0.778, yRatio: 0.312, size: 15 },
      { texto: `${v.rol3Inf} m`,     xRatio: 0.758, yRatio: 0.371, size: 15 }
    ]
  },
  autosoportada_normal: {
    nombre: "Torre autosoportada (roldana normal)",
    src: "img/3_torre_autosoportada_normal.png",
    sitioPos: { xRatio: 0.15, yRatio: 0.13 },
    cotas: (v) => [
      { texto: `${v.roldanaSup} m`,  xRatio: 0.042, yRatio: 0.618, size: 22 },
      { texto: `${v.roldanaInf} m`,  xRatio: 0.654, yRatio: 0.658, size: 18 },
      { texto: `${v.alturaTotal} m`, xRatio: 0.808, yRatio: 0.545, size: 22 },
      { texto: `${v.alturaBase} m`,  xRatio: 0.422, yRatio: 0.962, size: 20 }
    ]
  },
  arriostrada_escalera_gato: {
    nombre: "Torre arriostrada con escalera gato",
    src: "img/4_torre_arriostrada_escalera.png",
    sitioPos: { xRatio: 0.16, yRatio: 0.14 },
    cotas: (v) => [
      { texto: `${v.alturaBase} m`,     xRatio: 0.200, yRatio: 0.436, size: 19 },
      { texto: `${v.alturaTotal} m`,    xRatio: 0.576, yRatio: 0.280, size: 21 },
      { texto: `${v.alturaEscalera} m`, xRatio: 0.674, yRatio: 0.520, size: 18 },
      { texto: `${v.alturaEdificio} m`, xRatio: 0.882, yRatio: 0.776, size: 21 }
    ]
  },
  ventada_edificio: {
    nombre: "Torre ventada con edificio",
    src: "img/5_torre_ventada_edificio.png",
    sitioPos: { xRatio: 0.16, yRatio: 0.13 },
    cotas: (v) => [
      { texto: `${v.alturaTotal} m`,    xRatio: 0.700, yRatio: 0.320, size: 22 },
      { texto: `${v.alturaBase} m`,     xRatio: 0.440, yRatio: 0.516, size: 19 },
      { texto: `${v.alturaEdificio} m`, xRatio: 0.885, yRatio: 0.794, size: 22 }
    ]
  },
  ventada_piso: {
    nombre: "Torre ventada de piso",
    src: "img/6_torre_ventada_piso.png",
    sitioPos: { xRatio: 0.15, yRatio: 0.16 },
    cotas: (v) => [
      { texto: `${v.alturaTotal} m`, xRatio: 0.695, yRatio: 0.590, size: 22 },
      { texto: `${v.alturaBase} m`,  xRatio: 0.460, yRatio: 0.976, size: 19 }
    ]
  },
  autosoportada_encima: {
    nombre: "Torre autosoportada (roldana encima)",
    src: "img/7_torre_autosoportada_encima.png",
    sitioPos: { xRatio: 0.16, yRatio: 0.13 },
    cotas: (v) => [
      { texto: `${v.roldanaSup} m`,  xRatio: 0.044, yRatio: 0.588, size: 18 },
      { texto: `${v.roldanaInf} m`,  xRatio: 0.662, yRatio: 0.602, size: 18 },
      { texto: `${v.alturaTotal} m`, xRatio: 0.828, yRatio: 0.514, size: 20 },
      { texto: `${v.alturaBase} m`,  xRatio: 0.418, yRatio: 0.960, size: 20 }
    ]
  },
  arriostrada_edificio_normal: {
    nombre: "Torre arriostrada con edificio normal",
    src: "img/8_torre_arriostrada_edificio.png",
    sitioPos: { xRatio: 0.16, yRatio: 0.13 },
    cotas: (v) => [
      { texto: `${v.alturaBase} m`,     xRatio: 0.304, yRatio: 0.528, size: 19 },
      { texto: `${v.alturaTotal} m`,    xRatio: 0.676, yRatio: 0.318, size: 21 },
      { texto: `${v.alturaEdificio} m`, xRatio: 0.720, yRatio: 0.810, size: 21 }
    ]
  },
  autosoportada_sin_roldana: {
    nombre: "Torre autosoportada sin roldana",
    src: "img/9_torre_autosoportada_sin_roldana.png",
    sitioPos: { xRatio: 0.16, yRatio: 0.12 },
    cotas: (v) => [
      { texto: `${v.alturaTotal} m`, xRatio: 0.610, yRatio: 0.530, size: 22 },
      { texto: `${v.alturaBase} m`,  xRatio: 0.445, yRatio: 0.965, size: 20 }
    ]
  },
  estructura_especial: {
    nombre: "Torre estructura especial",
    src: "img/10_torre_estructura_especial.png",
    sitioPos: { xRatio: 0.25, yRatio: 0.09 },
    cotas: (v) => [
      { texto: `${v.alturaTotal} m`,    xRatio: 0.770, yRatio: 0.215, size: 22 },
      { texto: `${v.alturaBase} m`,     xRatio: 0.590, yRatio: 0.382, size: 19 },
      { texto: `${v.alturaEscalera} m`, xRatio: 0.785, yRatio: 0.495, size: 19 },
      { texto: `${v.alturaEdificio} m`, xRatio: 0.825, yRatio: 0.765, size: 21 }
    ]
  },
  autosoportada_rooftop: {
    nombre: "Torre autosoportada rooftop",
    src: "img/11_torre_autosoportada_rooftop.png",
    sitioPos: { xRatio: 0.26, yRatio: 0.08 },
    cotas: (v) => [
      { texto: `${v.alturaTotal} m`,    xRatio: 0.555, yRatio: 0.215, size: 22 },
      { texto: `${v.alturaBase} m`,     xRatio: 0.065, yRatio: 0.390, size: 19 },
      { texto: `${v.alturaEscalera} m`, xRatio: 0.635, yRatio: 0.485, size: 19 },
      { texto: `${v.alturaEdificio} m`, xRatio: 0.830, yRatio: 0.700, size: 21 }
    ]
  },
  monopolo_1_roldana: {
    nombre: "Torre monopolo 1 roldana",
    src: "img/12_torre_monopolo_1_roldana.png",
    sitioPos: { xRatio: 0.25, yRatio: 0.08 },
    cotas: (v) => [
      { texto: `${v.roldanaSup} m`,  xRatio: 0.635, yRatio: 0.090, size: 17 },
      { texto: `${v.roldanaInf} m`,  xRatio: 0.635, yRatio: 0.145, size: 17 },
      { texto: `${v.alturaTotal} m`, xRatio: 0.055, yRatio: 0.395, size: 21 },
      { texto: `${v.alturaBase} m`,  xRatio: 0.755, yRatio: 0.915, size: 20 }
    ]
  },
  monopolo_2_roldanas: {
    nombre: "Torre monopolo 2 roldanas",
    src: "img/13_torre_monopolo_2_roldanas.png",
    sitioPos: { xRatio: 0.25, yRatio: 0.08 },
    cotas: (v) => [
      { texto: `${v.rol1Sup} m`,     xRatio: 0.635, yRatio: 0.090, size: 16 },
      { texto: `${v.rol1Inf} m`,     xRatio: 0.635, yRatio: 0.145, size: 16 },
      { texto: `${v.rol2Sup} m`,     xRatio: 0.655, yRatio: 0.210, size: 16 },
      { texto: `${v.rol2Inf} m`,     xRatio: 0.655, yRatio: 0.265, size: 16 },
      { texto: `${v.alturaTotal} m`, xRatio: 0.055, yRatio: 0.395, size: 21 },
      { texto: `${v.alturaBase} m`,  xRatio: 0.755, yRatio: 0.915, size: 20 }
    ]
  },
  monoposte: {
    nombre: "Torre monoposte",
    src: "img/14_torre_monoposte.png",
    sitioPos: { xRatio: 0.22, yRatio: 0.08 },
    cotas: (v) => [
      { texto: `${v.alturaTotal} m`, xRatio: 0.060, yRatio: 0.415, size: 22 },
      { texto: `${v.alturaBase} m`,  xRatio: 0.680, yRatio: 0.940, size: 21 }
    ]
  }
};

const cacheImagenesTorre = {};
const customTorreCargada = {};

function obtenerImagenTorre(tipo, callback) {
  if (cacheImagenesTorre[tipo] && cacheImagenesTorre[tipo].complete && cacheImagenesTorre[tipo].naturalWidth > 0) {
    callback(cacheImagenesTorre[tipo], true);
    return;
  }

  const modelo = MODELOS_TORRE[tipo];
  if (!modelo) {
    callback(null, false);
    return;
  }

  const img = new Image();
  img.onload = () => {
    cacheImagenesTorre[tipo] = img;
    callback(img, true);
  };
  img.onerror = () => {
    callback(null, false);
  };
  img.src = modelo.src;
}

function actualizarCamposTorre() {
  const tipo = document.getElementById("torreTipo").value;
  const isMonopolo3 = tipo === "monopolo";
  const isMonopolo2 = tipo === "monopolo_2_roldanas";
  const isStdRoldana =
    tipo === "autosoportada_normal" ||
    tipo === "autosoportada_encima" ||
    tipo === "monopolo_1_roldana";

  const hasEscalera =
    tipo === "arriostrada_escalera_gato" ||
    tipo === "estructura_especial" ||
    tipo === "autosoportada_rooftop";

  const hasEdificio =
    tipo === "ventada_edificio" ||
    tipo === "arriostrada_edificio_normal" ||
    tipo === "arriostrada_escalera_gato" ||
    tipo === "estructura_especial" ||
    tipo === "autosoportada_rooftop";

  document.querySelectorAll(".grp-monopolo").forEach((el) => {
    const esRol3 = el.querySelector("#rol3Sup, #rol3Inf");
    if (esRol3) {
      el.hidden = !isMonopolo3;
    } else {
      el.hidden = !(isMonopolo3 || isMonopolo2);
    }
  });

  document.querySelectorAll(".grp-roldana-std").forEach((el) => (el.hidden = !isStdRoldana));
  document.querySelectorAll(".grp-edificio").forEach((el) => (el.hidden = !hasEdificio));
  document.querySelectorAll(".grp-escalera").forEach((el) => (el.hidden = !hasEscalera));

  const btnRestaurar = document.getElementById("btnRestaurarImgTorre");
  if (btnRestaurar) {
    btnRestaurar.hidden = !customTorreCargada[tipo];
  }
}

function dibujarTorreElevacion() {
  const canvas = document.getElementById("canvasTorre");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  actualizarCamposTorre();

  const sitio = getSitio();
  const tipoTorre = document.getElementById("torreTipo").value;
  const modelo = MODELOS_TORRE[tipoTorre];

  const rawAlturaTotal = parseFloat(document.getElementById("alturaTorre").value);
  const rawAlturaBase = parseFloat(document.getElementById("alturaBase").value);
  const rawRoldanaSup = parseFloat(document.getElementById("roldanaSup").value);
  const rawRoldanaInf = parseFloat(document.getElementById("roldanaInf").value);

  const valores = {
    alturaTotal: formatNum(rawAlturaTotal, 2, 30),
    alturaBase: formatNum(rawAlturaBase, 2, 1.2),
    roldanaSup: formatNum(rawRoldanaSup, 2, 28.5),
    roldanaInf: formatNum(rawRoldanaInf, 2, 27.3),
    rol1Sup: formatNum(document.getElementById("rol1Sup").value, 2, 29.0),
    rol1Inf: formatNum(document.getElementById("rol1Inf").value, 2, 27.8),
    rol2Sup: formatNum(document.getElementById("rol2Sup").value, 2, 26.0),
    rol2Inf: formatNum(document.getElementById("rol2Inf").value, 2, 24.8),
    rol3Sup: formatNum(document.getElementById("rol3Sup").value, 2, 23.0),
    rol3Inf: formatNum(document.getElementById("rol3Inf").value, 2, 21.8),
    alturaEdificio: formatNum(document.getElementById("alturaEdificio").value, 2, 12.0),
    alturaEscalera: formatNum(document.getElementById("alturaEscaleraGato").value, 2, 2.4)
  };

  const avisos = [];
  if (rawAlturaTotal <= 0 || isNaN(rawAlturaTotal)) {
    avisos.push("La altura total debe ser mayor a 0 m.");
  }
  if (!isNaN(rawAlturaBase) && !isNaN(rawAlturaTotal) && rawAlturaBase > rawAlturaTotal) {
    avisos.push("La altura de base/pedestal supera la altura total ingresada.");
  }

  obtenerImagenTorre(tipoTorre, (img, cargada) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!cargada || !img) {
      avisos.push(
        `No se encontró "${modelo.src}". Guarda la imagen en img/ o cárgala con el botón "Imagen base de este modelo".`
      );
      setAviso("avisoTorre", avisos.join(" "), "error");

      ctx.save();
      ctx.strokeStyle = "#94a3b8";
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
      ctx.setLineDash([]);

      setFuenteRelleno(ctx, "#dc2626", "center", "middle", 20);
      ctx.fillText(modelo.nombre.toUpperCase(), canvas.width / 2, canvas.height / 2 - 40);

      setFuenteRelleno(ctx, "#334155", "center", "middle", 15);
      ctx.fillText(`Ruta esperada: ${modelo.src}`, canvas.width / 2, canvas.height / 2);
      ctx.fillText("Sube la imagen a la carpeta img/ de tu repositorio o selecciónala arriba.", canvas.width / 2, canvas.height / 2 + 30);
      ctx.restore();
      return;
    }

    setAviso("avisoTorre", avisos.join(" "), avisos.length ? "warning" : "error");

    const pad = 20;
    const maxW = canvas.width - pad * 2;
    const maxH = canvas.height - pad * 2;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const drawX = (canvas.width - drawW) / 2;
    const drawY = (canvas.height - drawH) / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const sPos = modelo.sitioPos || { xRatio: 0.24, yRatio: 0.22 };
    drawTextWithHalo(ctx, sitio, drawX + drawW * sPos.xRatio, drawY + drawH * sPos.yRatio, {
      color: "#dc2626",
      align: "center",
      baseline: "middle",
      size: 28,
      padX: 6,
      padY: 3
    });

    const etiquetas = modelo.cotas(valores);
    etiquetas.forEach((item) => {
      const tx = drawX + drawW * item.xRatio;
      const ty = drawY + drawH * item.yRatio;
      const fontSize = item.size || 20;

      drawTextWithHalo(ctx, item.texto, tx, ty, {
        color: "#111827",
        align: "left",
        baseline: "middle",
        size: fontSize,
        padX: 4,
        padY: 2
      });
    });
  });
}

document.getElementById("customTorreImg")?.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const tipo = document.getElementById("torreTipo").value;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      cacheImagenesTorre[tipo] = img;
      customTorreCargada[tipo] = true;
      dibujarTorreElevacion();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById("btnRestaurarImgTorre")?.addEventListener("click", () => {
  const tipo = document.getElementById("torreTipo").value;
  delete cacheImagenesTorre[tipo];
  delete customTorreCargada[tipo];
  const inputFile = document.getElementById("customTorreImg");
  if (inputFile) inputFile.value = "";
  dibujarTorreElevacion();
});

/* =========================================================
   PESTAÑA 4: ESQUEMA DE EQUIPOS EN TORRE (1 A 4 FOTOS)
   ========================================================= */
const PLANTILLAS_EQUIPOS = {
  "3sectores": [
    { etiqueta: "MW 1", altura: 29.5, lado: "IZQ" },
    { etiqueta: "RF 1", altura: 28.5, lado: "IZQ" },
    { etiqueta: "RF 2", altura: 28.5, lado: "DER" },
    { etiqueta: "RF 3", altura: 28.5, lado: "DER" },
    { etiqueta: "RRU 1", altura: 27.8, lado: "IZQ" },
    { etiqueta: "RRU 2", altura: 27.8, lado: "DER" },
    { etiqueta: "RRU 3", altura: 27.8, lado: "DER" },
    { etiqueta: "RF 4", altura: 26.0, lado: "IZQ" },
    { etiqueta: "RF 5", altura: 26.0, lado: "DER" },
    { etiqueta: "RF 6", altura: 26.0, lado: "IZQ" },
    { etiqueta: "RRU 4", altura: 25.3, lado: "IZQ" },
    { etiqueta: "RRU 5", altura: 25.3, lado: "DER" },
    { etiqueta: "RRU 6", altura: 25.3, lado: "IZQ" }
  ],
  "arbol": [
    { etiqueta: "MW 4", altura: 29.2, lado: "IZQ" },
    { etiqueta: "RF 5", altura: 28.8, lado: "DER" },
    { etiqueta: "RRU 3", altura: 28.2, lado: "DER" },
    { etiqueta: "RRU 6", altura: 28.0, lado: "IZQ" },
    { etiqueta: "RRU 7", altura: 27.6, lado: "IZQ" },
    { etiqueta: "RF 10", altura: 27.2, lado: "DER" },
    { etiqueta: "RRU 2", altura: 26.8, lado: "IZQ" },
    { etiqueta: "RRU 8", altura: 26.2, lado: "DER" },
    { etiqueta: "RF 1", altura: 25.5, lado: "IZQ" },
    { etiqueta: "RRU 9", altura: 25.0, lado: "DER" }
  ],
  "autosoportada_full": [
    { etiqueta: "MW 1", altura: 34.0, lado: "IZQ" },
    { etiqueta: "RF 1", altura: 33.0, lado: "IZQ" },
    { etiqueta: "RF 2", altura: 33.0, lado: "DER" },
    { etiqueta: "RF 3", altura: 33.0, lado: "DER" },
    { etiqueta: "RRU 1", altura: 32.2, lado: "IZQ" },
    { etiqueta: "RRU 2", altura: 32.2, lado: "DER" },
    { etiqueta: "RRU 3", altura: 32.2, lado: "DER" },
    { etiqueta: "RF 4", altura: 30.0, lado: "IZQ" },
    { etiqueta: "RF 5", altura: 30.0, lado: "DER" },
    { etiqueta: "RF 6", altura: 30.0, lado: "IZQ" },
    { etiqueta: "RRU 4", altura: 29.2, lado: "IZQ" },
    { etiqueta: "RRU 5", altura: 29.2, lado: "DER" },
    { etiqueta: "RRU 6", altura: 29.2, lado: "IZQ" },
    { etiqueta: "MW 2", altura: 26.5, lado: "DER" },
    { etiqueta: "RF 7", altura: 25.0, lado: "IZQ" },
    { etiqueta: "RF 8", altura: 25.0, lado: "DER" },
    { etiqueta: "RF 9", altura: 25.0, lado: "IZQ" },
    { etiqueta: "RRU 7", altura: 24.2, lado: "IZQ" },
    { etiqueta: "RRU 8", altura: 24.2, lado: "DER" },
    { etiqueta: "RRU 9", altura: 24.2, lado: "IZQ" },
    { etiqueta: "GPS 1", altura: 18.0, lado: "IZQ" }
  ]
};

let listaEquipos = PLANTILLAS_EQUIPOS["arbol"].map((item, idx) => ({
  id: idx + 1,
  ...item
}));

let fotosPanoramicas = [];
let bloqueoArrastre = false;

function obtenerEquiposOrdenados() {
  return [...listaEquipos]
    .filter((eq) => eq.etiqueta.trim() !== "")
    .sort((a, b) => (parseFloat(b.altura) || 0) - (parseFloat(a.altura) || 0));
}

function agruparEquiposPorAltura(equiposOrdenados, agrupar) {
  if (!agrupar) {
    return equiposOrdenados.map((eq, idx) => ({
      texto: eq.etiqueta.trim(),
      altura: parseFloat(eq.altura) || 0,
      lado: eq.lado || (idx % 2 === 0 ? "DER" : "IZQ")
    }));
  }

  const grupos = [];
  const tolerancia = 0.05;

  equiposOrdenados.forEach((eq) => {
    const h = parseFloat(eq.altura) || 0;
    const lado = eq.lado || "AUTO";
    const existente = grupos.find(
      (g) => Math.abs(g.altura - h) <= tolerancia && g.lado === lado
    );
    if (existente) {
      existente.items.push(eq.etiqueta.trim());
    } else {
      grupos.push({
        altura: h,
        lado,
        items: [eq.etiqueta.trim()]
      });
    }
  });

  return grupos.map((g, idx) => {
    const texto = formatearGrupoEtiquetas(g.items);
    const ladoFinal = g.lado === "AUTO" ? (idx % 2 === 0 ? "DER" : "IZQ") : g.lado;
    return {
      texto,
      altura: g.altura,
      lado: ladoFinal
    };
  });
}

function formatearGrupoEtiquetas(items) {
  if (items.length <= 1) return items[0] || "";
  const parsed = items.map((str) => {
    const m = str.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\s*[-_]?\s*(\d+.*)$/);
    return m ? { prefix: m[1].toUpperCase(), num: m[2] } : null;
  });

  if (parsed.every((p) => p !== null) && new Set(parsed.map((p) => p.prefix)).size === 1) {
    return `${parsed[0].prefix} ${parsed.map((p) => p.num).join("-")}`;
  }
  return items.join(" / ");
}

function calcularCalloutsParaFoto(foto) {
  const ordenados = obtenerEquiposOrdenados();
  const agrupar = document.getElementById("equiposAgrupar").value === "si";
  const grupos = agruparEquiposPorAltura(ordenados, agrupar);

  const alturaMax = Math.max(1, parseFloat(document.getElementById("equiposAlturaRef").value) || 30);
  const topY = typeof foto.topY === "number" ? foto.topY : 0.14;
  const bottomY = typeof foto.bottomY === "number" ? foto.bottomY : 0.86;
  const spanY = Math.max(0.15, bottomY - topY);

  const izqItems = [];
  const derItems = [];

  grupos.forEach((g, idx) => {
    const lado = g.lado === "IZQ" || g.lado === "DER" ? g.lado : idx % 2 === 0 ? "DER" : "IZQ";
    const ratioH = Math.min(1, Math.max(0, g.altura / alturaMax));
    const rawTargetY = bottomY - ratioH * spanY;
    const item = {
      texto: g.texto,
      altura: g.altura,
      lado,
      targetX: lado === "IZQ" ? 0.475 : 0.525,
      targetY: rawTargetY,
      labelX: lado === "IZQ" ? 0.24 : 0.76,
      labelY: rawTargetY
    };
    if (lado === "IZQ") izqItems.push(item);
    else derItems.push(item);
  });

  const separarVertical = (arr) => {
    arr.sort((a, b) => a.labelY - b.labelY);
    const minGap = 0.044;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i].labelY - arr[i - 1].labelY < minGap) {
        arr[i].labelY = Math.min(0.93, arr[i - 1].labelY + minGap);
      }
    }
    for (let i = arr.length - 2; i >= 0; i--) {
      if (arr[i + 1].labelY - arr[i].labelY < minGap) {
        arr[i].labelY = Math.max(0.07, arr[i + 1].labelY - minGap);
      }
    }
  };

  separarVertical(izqItems);
  separarVertical(derItems);

  foto.callouts = [...izqItems, ...derItems];
}

function alinearEtiquetasEnMargen() {
  fotosPanoramicas.forEach((foto) => {
    const izq = [];
    const der = [];
    foto.callouts.forEach((c) => {
      if (c.labelX <= c.targetX) {
        c.labelX = 0.16;
        izq.push(c);
      } else {
        c.labelX = 0.84;
        der.push(c);
      }
    });

    const espaciar = (arr) => {
      arr.sort((a, b) => a.targetY - b.targetY);
      const minGap = 0.046;
      arr.forEach((item) => (item.labelY = item.targetY));
      for (let i = 1; i < arr.length; i++) {
        if (arr[i].labelY - arr[i - 1].labelY < minGap) {
          arr[i].labelY = Math.min(0.93, arr[i - 1].labelY + minGap);
        }
      }
      for (let i = arr.length - 2; i >= 0; i--) {
        if (arr[i + 1].labelY - arr[i].labelY < minGap) {
          arr[i].labelY = Math.max(0.07, arr[i + 1].labelY - minGap);
        }
      }
    };

    espaciar(izq);
    espaciar(der);
    renderizarFotoEquipos(foto);
  });
}

function dibujarFlechaRoja(ctx, fromX, fromY, toX, toY) {
  const headLen = 13;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 4.6;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.strokeStyle = "#ef1d1d";
  ctx.fillStyle = "#ef1d1d";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 7), toY - headLen * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 7), toY - headLen * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(toX, toY, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dibujarTextoEquipoRojo(ctx, texto, x, y, align, fontSize) {
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
  ctx.strokeText(texto, x, y);

  ctx.fillStyle = "#ef1d1d";
  ctx.fillText(texto, x, y);
  ctx.restore();
}

function renderizarFotoEquipos(foto, opciones = {}) {
  const canvas = foto.canvas;
  if (!canvas || !foto.img) return;
  const ctx = canvas.getContext("2d");

  const img = foto.img;
  const targetW = 1000;
  const scale = targetW / img.naturalWidth;
  canvas.width = targetW;
  canvas.height = Math.round(img.naturalHeight * scale);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (!opciones.paraExportar && foto.calibratingStep > 0) {
    ctx.save();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    const yCima = foto.topY * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, yCima);
    ctx.lineTo(canvas.width, yCima);
    ctx.stroke();

    if (foto.calibratingStep === 2) {
      const yBase = foto.bottomY * canvas.height;
      ctx.strokeStyle = "#10b981";
      ctx.beginPath();
      ctx.moveTo(0, yBase);
      ctx.lineTo(canvas.width, yBase);
      ctx.stroke();
    }
    ctx.restore();
  }

  const fontSize = parseInt(document.getElementById("equiposFontSize").value, 10) || 20;

  foto.callouts.forEach((c) => {
    const lx = c.labelX * canvas.width;
    const ly = c.labelY * canvas.height;
    const tx = c.targetX * canvas.width;
    const ty = c.targetY * canvas.height;

    const esIzquierda = lx <= tx;
    const align = esIzquierda ? "right" : "left";
    const lineStartX = esIzquierda ? lx + 6 : lx - 6;

    dibujarFlechaRoja(ctx, lineStartX, ly, tx, ty);
    dibujarTextoEquipoRojo(ctx, c.texto, lx, ly, align, fontSize);

    ctx.save();
    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    const w = ctx.measureText(c.texto).width;
    ctx.restore();
    c._hitBox = {
      x1: esIzquierda ? lx - w - 14 : lx - 14,
      x2: esIzquierda ? lx + 14 : lx + w + 14,
      y1: ly - fontSize * 0.9,
      y2: ly + fontSize * 0.9,
      tx,
      ty
    };
  });
}

function renderizarTodasLasFotosEquipos() {
  fotosPanoramicas.forEach((foto) => renderizarFotoEquipos(foto));
}

function habilitarArrastreEnCanvas(foto) {
  const canvas = foto.canvas;
  let dragging = null;

  const getPos = (e, applyTouchOffset = false) => {
    const rect = canvas.getBoundingClientRect();
    const isTouch = e.pointerType === "touch";
    const offsetClientY = isTouch && applyTouchOffset ? -42 : 0;
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: (((e.clientY + offsetClientY) - rect.top) / rect.height) * canvas.height
    };
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (foto.calibratingStep === 1 || foto.calibratingStep === 2) {
      e.preventDefault();
      const pos = getPos(e, false);
      const ny = Math.min(0.96, Math.max(0.03, pos.y / canvas.height));
      if (foto.calibratingStep === 1) {
        foto.topY = ny;
        foto.calibratingStep = 2;
        if (foto._calibBanner) {
          foto._calibBanner.textContent = "Paso 2 de 2: Ahora toca en la foto donde termina la BASE.";
        }
        renderizarFotoEquipos(foto);
      } else {
        foto.bottomY = Math.max(foto.topY + 0.12, ny);
        foto.calibratingStep = 0;
        if (foto._calibBanner) foto._calibBanner.hidden = true;
        calcularCalloutsParaFoto(foto);
        renderizarFotoEquipos(foto);
      }
      return;
    }

    if (bloqueoArrastre) return;

    const pos = getPos(e, false);
    for (let i = foto.callouts.length - 1; i >= 0; i--) {
      const c = foto.callouts[i];
      if (!c._hitBox) continue;
      const distTarget = Math.hypot(pos.x - c._hitBox.tx, pos.y - c._hitBox.ty);
      if (distTarget <= 24) {
        dragging = { callout: c, mode: "target" };
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
      if (
        pos.x >= c._hitBox.x1 &&
        pos.x <= c._hitBox.x2 &&
        pos.y >= c._hitBox.y1 &&
        pos.y <= c._hitBox.y2
      ) {
        dragging = { callout: c, mode: "label" };
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    e.preventDefault();
    const pos = getPos(e, dragging.mode === "target");
    const nx = Math.min(0.97, Math.max(0.03, pos.x / canvas.width));
    const ny = Math.min(0.97, Math.max(0.03, pos.y / canvas.height));

    if (dragging.mode === "target") {
      dragging.callout.targetX = nx;
      dragging.callout.targetY = ny;
    } else {
      dragging.callout.labelX = nx;
      dragging.callout.labelY = ny;
    }
    renderizarFotoEquipos(foto);
  });

  canvas.addEventListener("pointerup", () => {
    dragging = null;
  });
}

function construirGaleriaEquipos() {
  const galeria = document.getElementById("galeriaEquipos");
  if (!galeria) return;
  galeria.innerHTML = "";

  if (fotosPanoramicas.length === 0) {
    galeria.innerHTML = `
      <div class="empty-photos-msg">
        Sube de 1 a 4 fotos panorámicas de la torre para generar automáticamente las flechas rojas y etiquetas según la lista de alturas. Luego descarga todas juntas en 1 sola imagen PNG (botón verde) o cada foto por separado.
      </div>`;
    return;
  }

  fotosPanoramicas.forEach((foto, index) => {
    const card = document.createElement("div");
    card.className = "foto-card";

    const header = document.createElement("div");
    header.className = "foto-card-header";

    const title = document.createElement("span");
    title.className = "foto-card-title";
    title.textContent = `Foto Panorámica ${index + 1} (${foto.nombreArchivo})`;
    header.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "foto-card-actions";

    const btnCalib = document.createElement("button");
    btnCalib.type = "button";
    btnCalib.className = "btn-action btn-ghost";
    btnCalib.style.padding = "6px 10px";
    btnCalib.style.fontSize = "12px";
    btnCalib.textContent = "Calibrar Cima/Base";

    const btnResetPos = document.createElement("button");
    btnResetPos.type = "button";
    btnResetPos.className = "btn-action btn-ghost";
    btnResetPos.style.padding = "6px 10px";
    btnResetPos.style.fontSize = "12px";
    btnResetPos.textContent = "Auto-alinear";
    btnResetPos.addEventListener("click", () => {
      foto.topY = 0.14;
      foto.bottomY = 0.86;
      foto.calibratingStep = 0;
      if (foto._calibBanner) foto._calibBanner.hidden = true;
      calcularCalloutsParaFoto(foto);
      renderizarFotoEquipos(foto);
    });

    const btnDown = document.createElement("button");
    btnDown.type = "button";
    btnDown.className = "btn-action btn-primary";
    btnDown.style.padding = "6px 12px";
    btnDown.style.fontSize = "12px";
    btnDown.textContent = `Descargar PNG ${index + 1}`;
    btnDown.addEventListener("click", () => {
      renderizarFotoEquipos(foto, { paraExportar: true });
      descargarCanvasElement(foto.canvas, `ESQUEMA_EQUIPOS_TORRE_${index + 1}_${getSitioSlug()}.png`);
      renderizarFotoEquipos(foto);
    });

    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btn-danger-sm";
    btnDel.textContent = "Quitar";
    btnDel.addEventListener("click", () => {
      fotosPanoramicas = fotosPanoramicas.filter((f) => f.id !== foto.id);
      construirGaleriaEquipos();
    });

    actions.appendChild(btnCalib);
    actions.appendChild(btnResetPos);
    actions.appendChild(btnDown);
    actions.appendChild(btnDel);

    const calibBanner = document.createElement("div");
    calibBanner.className = "calibracion-banner";
    calibBanner.hidden = true;
    foto._calibBanner = calibBanner;

    btnCalib.addEventListener("click", () => {
      foto.calibratingStep = 1;
      calibBanner.textContent = "Paso 1 de 2: Toca en la foto la CIMA (punta superior) de la torre.";
      calibBanner.hidden = false;
      renderizarFotoEquipos(foto);
    });

    const canvas = document.createElement("canvas");
    if (bloqueoArrastre) canvas.classList.add("scroll-unlocked");
    foto.canvas = canvas;

    card.appendChild(header);
    card.appendChild(actions);
    card.appendChild(calibBanner);
    card.appendChild(canvas);
    galeria.appendChild(card);

    if (!foto.callouts || foto.callouts.length === 0) {
      calcularCalloutsParaFoto(foto);
    }
    renderizarFotoEquipos(foto);
    habilitarArrastreEnCanvas(foto);
  });
}

/* =========================================================
   LECTURA AUTOMÁTICA DE TIMESTAMP CAMERA (OCR)
   ========================================================= */
async function extraerMetadatosTimestampCamera(img) {
  const ocrBar = document.getElementById("ocrStatusBar");
  if (!ocrBar || typeof window.Tesseract === "undefined") return;

  try {
    ocrBar.hidden = false;
    ocrBar.textContent = "Analizando sello GPS y nombre de sitio en la foto panorámica...";

    const cropCanvas = document.createElement("canvas");
    const cw = Math.round(img.naturalWidth * 0.58);
    const ch = Math.round(img.naturalHeight * 0.28);
    cropCanvas.width = cw;
    cropCanvas.height = ch;
    const cctx = cropCanvas.getContext("2d");
    cctx.drawImage(img, img.naturalWidth - cw, img.naturalHeight - ch, cw, ch, 0, 0, cw, ch);

    const result = await window.Tesseract.recognize(cropCanvas, "spa+eng");
    const text = result && result.data && result.data.text ? result.data.text : "";
    const lineas = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 3);

    if (!lineas.length) {
      ocrBar.hidden = true;
      return;
    }

    let coordDetectada = "";
    for (const l of lineas) {
      const parsed = parsearCoordenadaUniversal(l);
      if (parsed) {
        coordDetectada = decimalAGMS(parsed.lat, parsed.lon);
        break;
      }
    }

    const candidatasSitio = lineas.filter(
      (l) =>
        !/\d{2}[:/]\d{2}/.test(l) &&
        !/[°º'"]/.test(l) &&
        !/^(piura|lima|tumbes|peru|perú|sullana|paita)$/i.test(l)
    );
    const sitioDetectado = candidatasSitio.length
      ? candidatasSitio[candidatasSitio.length - 1].replace(/[^A-Za-z0-9ÁÉÍÓÚÑ _-]/g, "").trim().toUpperCase()
      : "";

    if (!sitioDetectado && !coordDetectada) {
      ocrBar.hidden = true;
      return;
    }

    ocrBar.innerHTML = "";
    const msgSpan = document.createElement("span");
    const partesMsg = [];
    if (sitioDetectado) partesMsg.push(`Sitio detectado: <strong>${sitioDetectado}</strong>`);
    if (coordDetectada) partesMsg.push(`GPS: <strong>${coordDetectada}</strong>`);
    msgSpan.innerHTML = `Sello leído de la foto — ${partesMsg.join(" | ")}`;

    const btnAplicar = document.createElement("button");
    btnAplicar.type = "button";
    btnAplicar.className = "btn-action btn-primary";
    btnAplicar.style.padding = "6px 12px";
    btnAplicar.style.fontSize = "12px";
    btnAplicar.textContent = "Aplicar a Sitio y Perímetro";
    btnAplicar.addEventListener("click", () => {
      if (sitioDetectado) document.getElementById("sitio").value = sitioDetectado;
      if (coordDetectada) {
        ["coordA", "coordB", "coordC", "coordD"].forEach((cid) => {
          const el = document.getElementById(cid);
          if (el) el.value = coordDetectada;
        });
        const destInput = document.getElementById("rutaDestino");
        if (destInput) delete destInput.dataset.manualEdit;
      }
      guardarEstadoLocal();
      dibujarTodo();
      ocrBar.textContent = "Datos aplicados correctamente al Sitio, Perímetro (GMS) y Ruta.";
    });

    ocrBar.appendChild(msgSpan);
    ocrBar.appendChild(btnAplicar);
  } catch (_) {
    ocrBar.hidden = true;
  }
}

/* =========================================================
   TABLA DE EQUIPOS E IMPORTACIÓN (EXCEL / CSV / IMAGEN)
   ========================================================= */
function renderizarTablaEquipos() {
  const container = document.getElementById("listaEquiposContainer");
  if (!container) return;
  container.innerHTML = "";

  listaEquipos.forEach((eq) => {
    const row = document.createElement("div");
    row.className = "equipo-row";

    const inpNombre = document.createElement("input");
    inpNombre.type = "text";
    inpNombre.className = "col-codigo";
    inpNombre.value = eq.etiqueta;
    inpNombre.placeholder = "Ej. RF 1, RRU 2";
    inpNombre.addEventListener("input", () => {
      eq.etiqueta = inpNombre.value;
      guardarEstadoLocal();
      recalcularYRenderizarTodasFotos();
    });

    const inpAltura = document.createElement("input");
    inpAltura.type = "number";
    inpAltura.className = "col-altura";
    inpAltura.step = "0.01";
    inpAltura.min = "0";
    inpAltura.value = eq.altura;
    inpAltura.placeholder = "Altura (m)";
    inpAltura.addEventListener("input", () => {
      eq.altura = parseFloat(inpAltura.value) || 0;
      guardarEstadoLocal();
      recalcularYRenderizarTodasFotos();
    });
    inpAltura.addEventListener("change", () => {
      listaEquipos.sort((a, b) => (parseFloat(b.altura) || 0) - (parseFloat(a.altura) || 0));
      renderizarTablaEquipos();
      recalcularYRenderizarTodasFotos();
    });
    inpAltura.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        document.getElementById("btnAgregarEquipo")?.click();
      }
    });

    const btnLado = document.createElement("button");
    btnLado.type = "button";
    btnLado.className = "btn-lado-toggle col-lado";
    const actualizarVisualLado = () => {
      const l = eq.lado || "AUTO";
      btnLado.classList.remove("lado-izq", "lado-der");
      if (l === "IZQ") {
        btnLado.textContent = "◀ Izquierda";
        btnLado.classList.add("lado-izq");
      } else if (l === "DER") {
        btnLado.textContent = "Derecha ▶";
        btnLado.classList.add("lado-der");
      } else {
        btnLado.textContent = "⇄ Auto";
      }
    };
    actualizarVisualLado();

    btnLado.addEventListener("click", () => {
      const orden = ["AUTO", "IZQ", "DER"];
      eq.lado = orden[(orden.indexOf(eq.lado || "AUTO") + 1) % orden.length];
      actualizarVisualLado();
      guardarEstadoLocal();
      recalcularYRenderizarTodasFotos();
    });

    const btnQuitar = document.createElement("button");
    btnQuitar.type = "button";
    btnQuitar.className = "btn-danger-sm col-del";
    btnQuitar.textContent = "Quitar";
    btnQuitar.addEventListener("click", () => {
      listaEquipos = listaEquipos.filter((item) => item.id !== eq.id);
      guardarEstadoLocal();
      renderizarTablaEquipos();
      recalcularYRenderizarTodasFotos();
    });

    row.appendChild(inpNombre);
    row.appendChild(inpAltura);
    row.appendChild(btnLado);
    row.appendChild(btnQuitar);
    container.appendChild(row);
  });
}

function recalcularYRenderizarTodasFotos() {
  fotosPanoramicas.forEach((foto) => {
    calcularCalloutsParaFoto(foto);
    renderizarFotoEquipos(foto);
  });
}

function parsearLineasInventario(textoMultilinea) {
  const nuevasFilas = [];
  const lineas = textoMultilinea.split(/\r?\n/);

  lineas.forEach((linea, idx) => {
    const clean = linea.trim();
    if (!clean) return;

    const partes = clean.split(/[\t;|,]+/).map((p) => p.trim()).filter(Boolean);
    if (partes.length >= 2) {
      let etiqueta = "";
      let altura = NaN;
      let lado = "AUTO";

      partes.forEach((p) => {
        const up = p.toUpperCase();
        if (!etiqueta && /^(RF|RRU|MW|GPS|ANT|BBU|ODU)\s*[-_]?\s*\d+/i.test(up)) {
          etiqueta = up.replace(/\s+/g, " ");
        } else if (isNaN(altura) && /^\d{1,2}(?:[.,]\d{1,2})?\s*M?$/i.test(up)) {
          const val = parseFloat(up.replace("M", "").replace(",", "."));
          if (val > 0 && val <= 150) altura = val;
        } else if (up === "IZQ" || up === "IZQUIERDA" || up === "I") {
          lado = "IZQ";
        } else if (up === "DER" || up === "DERECHA" || up === "D") {
          lado = "DER";
        }
      });

      if (!etiqueta && partes[0] && !/^\d+([.,]\d+)?$/.test(partes[0])) {
        etiqueta = partes[0].toUpperCase();
      }
      if (isNaN(altura) && partes[1]) {
        const val = parseFloat(partes[1].replace(",", "."));
        if (!isNaN(val) && val > 0 && val <= 150) altura = val;
      }

      if (etiqueta && !isNaN(altura) && altura > 0) {
        nuevasFilas.push({
          id: Date.now() + idx + Math.random(),
          etiqueta,
          altura,
          lado
        });
      }
    }
  });

  return nuevasFilas;
}

function descargarTodasFotosUnidas() {
  if (!fotosPanoramicas || fotosPanoramicas.length === 0) {
    setAviso("avisoEquipos", "Primero sube al menos 1 foto panorámica para poder descargar la imagen.", "warning");
    return;
  }

  fotosPanoramicas.forEach((foto) => renderizarFotoEquipos(foto, { paraExportar: true }));

  const layout = document.getElementById("equiposLayoutUnido")?.value || "horizontal";
  const count = fotosPanoramicas.length;
  const gap = 14;
  const pad = 16;

  const mergedCanvas = document.createElement("canvas");
  const mctx = mergedCanvas.getContext("2d");

  if (count === 1) {
    const c0 = fotosPanoramicas[0].canvas;
    mergedCanvas.width = c0.width;
    mergedCanvas.height = c0.height;
    mctx.drawImage(c0, 0, 0);
  } else if (layout === "horizontal") {
    const targetH = Math.max(...fotosPanoramicas.map((f) => f.canvas.height));
    const items = fotosPanoramicas.map((f) => {
      const ratio = targetH / f.canvas.height;
      return { canvas: f.canvas, w: Math.round(f.canvas.width * ratio), h: targetH };
    });
    mergedCanvas.width = items.reduce((acc, it) => acc + it.w, 0) + gap * (count - 1) + pad * 2;
    mergedCanvas.height = targetH + pad * 2;
    mctx.fillStyle = "#ffffff";
    mctx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);
    let curX = pad;
    items.forEach((it) => {
      mctx.drawImage(it.canvas, curX, pad, it.w, it.h);
      curX += it.w + gap;
    });
  } else if (layout === "vertical") {
    const targetW = 1000;
    const items = fotosPanoramicas.map((f) => {
      const ratio = targetW / f.canvas.width;
      return { canvas: f.canvas, w: targetW, h: Math.round(f.canvas.height * ratio) };
    });
    mergedCanvas.width = targetW + pad * 2;
    mergedCanvas.height = items.reduce((acc, it) => acc + it.h, 0) + gap * (count - 1) + pad * 2;
    mctx.fillStyle = "#ffffff";
    mctx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);
    let curY = pad;
    items.forEach((it) => {
      mctx.drawImage(it.canvas, pad, curY, it.w, it.h);
      curY += it.h + gap;
    });
  } else {
    const cols = 2;
    const rows = Math.ceil(count / cols);
    const cellW = 900;
    const cellH = Math.max(...fotosPanoramicas.map((f) => Math.round((f.canvas.height / f.canvas.width) * cellW)));
    mergedCanvas.width = cols * cellW + (cols - 1) * gap + pad * 2;
    mergedCanvas.height = rows * cellH + (rows - 1) * gap + pad * 2;
    mctx.fillStyle = "#ffffff";
    mctx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

    fotosPanoramicas.forEach((f, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const boxX = pad + c * (cellW + gap);
      const boxY = pad + r * (cellH + gap);
      const scale = Math.min(cellW / f.canvas.width, cellH / f.canvas.height);
      const dw = Math.round(f.canvas.width * scale);
      const dh = Math.round(f.canvas.height * scale);
      mctx.drawImage(f.canvas, boxX + Math.round((cellW - dw) / 2), boxY + Math.round((cellH - dh) / 2), dw, dh);
    });
  }

  fotosPanoramicas.forEach((foto) => renderizarFotoEquipos(foto));
  aprenderSitioActual(true);
  descargarCanvasElement(mergedCanvas, `ESQUEMA_EQUIPOS_TORRE_${getSitioSlug()}.png`);
}

/* =========================================================
   MOTOR DE APRENDIZAJE DE SITIOS Y PLANTILLAS DE FLECHAS
   ========================================================= */
function cargarBaseConocimiento() {
  try {
    const raw = localStorage.getItem(KNOWLEDGE_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sitiosAprendidos: Array.isArray(parsed.sitiosAprendidos) ? parsed.sitiosAprendidos : [],
        plantillasFlechas: Array.isArray(parsed.plantillasFlechas) ? parsed.plantillasFlechas : []
      };
    }
  } catch (_) {}
  return { sitiosAprendidos: [], plantillasFlechas: [] };
}

function guardarBaseConocimiento(db) {
  try {
    if (db.sitiosAprendidos.length > 300) {
      db.sitiosAprendidos = db.sitiosAprendidos.slice(-300);
    }
    localStorage.setItem(KNOWLEDGE_DB_KEY, JSON.stringify(db));
  } catch (_) {}
  actualizarUIPlantillasAprendidas();
}

function capturarFirmaSitioActual() {
  const sitio = getSitio();
  const modeloTorre = document.getElementById("torreTipo")?.value || "arbol";
  const alturaTorre = parseFloat(document.getElementById("equiposAlturaRef")?.value) || 30;
  const agrupar = document.getElementById("equiposAgrupar")?.value || "si";

  const fotoRef = fotosPanoramicas[0] || null;
  const topY = fotoRef ? fotoRef.topY : (PREAJUSTE_RANGO_TORRE[modeloTorre]?.topY ?? 0.14);
  const bottomY = fotoRef ? fotoRef.bottomY : (PREAJUSTE_RANGO_TORRE[modeloTorre]?.bottomY ?? 0.86);

  const flechasAprendidas = fotoRef && Array.isArray(fotoRef.callouts)
    ? fotoRef.callouts.map((c, idx) => {
        const matchPref = c.texto.match(/^([A-ZÁÉÍÓÚÑ]+)/i);
        const prefijo = (matchPref ? matchPref[1] : "EQ").toUpperCase();
        return {
          idx,
          texto: c.texto,
          prefijo,
          altura: c.altura,
          alturaRelativa: alturaTorre > 0 ? Number((c.altura / alturaTorre).toFixed(4)) : 0.8,
          lado: c.lado,
          targetX: Number(c.targetX.toFixed(4)),
          targetY: Number(c.targetY.toFixed(4)),
          labelX: Number(c.labelX.toFixed(4)),
          labelY: Number(c.labelY.toFixed(4))
        };
      })
    : [];

  return {
    sitio,
    fecha: new Date().toISOString(),
    modeloTorre,
    alturaTorre,
    agrupar,
    topY: Number(topY.toFixed(4)),
    bottomY: Number(bottomY.toFixed(4)),
    cantidadEquipos: listaEquipos.length,
    equiposBase: listaEquipos.map((e) => ({
      etiqueta: e.etiqueta,
      altura: parseFloat(e.altura) || 0,
      alturaRelativa: alturaTorre > 0 ? Number(((parseFloat(e.altura) || 0) / alturaTorre).toFixed(4)) : 0.8,
      lado: e.lado || "AUTO"
    })),
    flechasAprendidas
  };
}

function aprenderSitioActual(silencioso = false) {
  const firma = capturarFirmaSitioActual();
  if (firma.flechasAprendidas.length === 0 && firma.equiposBase.length === 0) {
    if (!silencioso) {
      setAviso("avisoEquipos", "Primero sube una foto y acomoda las flechas o equipos.", "warning");
    }
    return;
  }

  const db = cargarBaseConocimiento();
  const idxExistente = db.sitiosAprendidos.findIndex((s) => s.sitio === firma.sitio);
  if (idxExistente >= 0) {
    db.sitiosAprendidos[idxExistente] = firma;
  } else {
    db.sitiosAprendidos.push(firma);
  }
  guardarBaseConocimiento(db);

  if (!silencioso) {
    setAviso(
      "avisoEquipos",
      `Sitio "${firma.sitio}" aprendido (${firma.flechasAprendidas.length} flechas guardadas). Total: ${db.sitiosAprendidos.length} sitio(s).`,
      "warning"
    );
  }
}

function aplicarGeometriaAprendidaAFotos(registro, sobrescribirLista = false) {
  if (!registro) return false;
  const alturaDestino = parseFloat(document.getElementById("equiposAlturaRef")?.value) || registro.alturaTorre || 30;

  if (sobrescribirLista && Array.isArray(registro.equiposBase) && registro.equiposBase.length > 0) {
    const factorAltura = registro.alturaTorre > 0 ? (alturaDestino / registro.alturaTorre) : 1;
    listaEquipos = registro.equiposBase.map((eq, idx) => ({
      id: Date.now() + idx + Math.random(),
      etiqueta: eq.etiqueta,
      altura: Number(Math.max(0.5, eq.altura * factorAltura).toFixed(2)),
      lado: eq.lado || "AUTO"
    }));
    renderizarTablaEquipos();
    guardarEstadoLocal();
  }

  if (fotosPanoramicas.length === 0) return true;

  fotosPanoramicas.forEach((foto) => {
    if (typeof registro.topY === "number") foto.topY = registro.topY;
    if (typeof registro.bottomY === "number") foto.bottomY = registro.bottomY;
    calcularCalloutsParaFoto(foto);

    if (Array.isArray(registro.flechasAprendidas) && registro.flechasAprendidas.length > 0) {
      const usadas = new Set();
      foto.callouts.forEach((c) => {
        const prefC = (c.texto.match(/^([A-ZÁÉÍÓÚÑ]+)/i)?.[1] || "EQ").toUpperCase();
        const relH = alturaDestino > 0 ? (c.altura / alturaDestino) : 0.8;
        let mejorIdx = -1;
        let mejorScore = Infinity;

        registro.flechasAprendidas.forEach((fa, fIdx) => {
          if (usadas.has(fIdx)) return;
          let score = Math.abs((fa.alturaRelativa || 0.8) - relH) * 10;
          if (fa.texto === c.texto) score -= 5;
          else if (fa.prefijo === prefC) score -= 2.5;
          if (c.lado !== "AUTO" && fa.lado === c.lado) score -= 1;
          if (score < mejorScore) {
            mejorScore = score;
            mejorIdx = fIdx;
          }
        });

        if (mejorIdx >= 0) {
          usadas.add(mejorIdx);
          const match = registro.flechasAprendidas[mejorIdx];
          c.targetX = match.targetX;
          c.targetY = match.targetY;
          c.labelX = match.labelX;
          c.labelY = match.labelY;
          c.lado = match.lado;
        }
      });
    }
    renderizarFotoEquipos(foto);
  });

  return true;
}

function buscarMejorSitioAprendido() {
  const db = cargarBaseConocimiento();
  const candidatos = [...db.plantillasFlechas, ...db.sitiosAprendidos];
  if (candidatos.length === 0) return null;

  const modeloActual = document.getElementById("torreTipo")?.value || "arbol";
  const alturaActual = parseFloat(document.getElementById("equiposAlturaRef")?.value) || 30;
  const cantActual = listaEquipos.length;

  let mejor = null;
  let mejorPuntaje = -Infinity;

  candidatos.forEach((cand) => {
    let score = 0;
    if (cand.modeloTorre === modeloActual) score += 50;
    score += Math.max(0, 25 - Math.abs((cand.alturaTorre || 30) - alturaActual) * 2);
    score += Math.max(0, 25 - Math.abs((cand.cantidadEquipos || 0) - cantActual) * 2.5);
    if (Array.isArray(cand.flechasAprendidas) && cand.flechasAprendidas.length > 0) score += 15;
    if (score > mejorPuntaje) {
      mejorPuntaje = score;
      mejor = cand;
    }
  });
  return mejor;
}

function ejecutarAutoLlenadoDesdeAprendizaje() {
  const mejor = buscarMejorSitioAprendido();
  if (!mejor) {
    setAviso("avisoEquipos", "Aún no hay sitios aprendidos ni plantillas guardadas.", "warning");
    return;
  }
  aplicarGeometriaAprendidaAFotos(mejor, false);
  const origenNombre = mejor.nombre ? `plantilla "${mejor.nombre}"` : `sitio aprendido "${mejor.sitio}"`;
  setAviso("avisoEquipos", `Flechas auto-acomodadas usando ${origenNombre}.`, "warning");
}

function actualizarUIPlantillasAprendidas() {
  const db = cargarBaseConocimiento();
  const lbl = document.getElementById("lblResumenAprendizaje");
  if (lbl) {
    lbl.textContent = `Sitios aprendidos: ${db.sitiosAprendidos.length} | Plantillas de flechas guardadas: ${db.plantillasFlechas.length}`;
  }
  const sel = document.getElementById("selPlantillasGuardadas");
  if (!sel) return;
  const prevVal = sel.value;
  sel.innerHTML = `<option value="">-- Selecciona una plantilla guardada (${db.plantillasFlechas.length}) --</option>`;
  db.plantillasFlechas.forEach((tpl) => {
    const opt = document.createElement("option");
    opt.value = tpl.id;
    opt.textContent = `${tpl.nombre} (${tpl.cantidadEquipos} eq • ${tpl.alturaTorre}m)`;
    sel.appendChild(opt);
  });
  if (prevVal) sel.value = prevVal;
}

/* =========================================================
   PESTAÑA 5: DIAGRAMA RUTA AL SITIO (MAPA + CUADRO ROJO)
   ========================================================= */
let mapaRuta = null;
let capaRutaLinea = null;
let marcadorCustodio = null;
let marcadorEstacion = null;
let imagenMapaBase = null;

const estadoCuadroRuta = {
  boxX: 0.44,
  boxY: 0.08,
  boxW: 0.52,
  boxH: 0.78,
  targetX: 0.12,
  targetY: 0.75
};

async function resolverUbicacionRuta(texto) {
  const coords = parsearCoordenadaUniversal(texto);
  if (coords) {
    return { ...coords, nombreCorto: texto };
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(texto)}`;
  const resp = await fetch(url, {
    headers: { Accept: "application/json" }
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (Array.isArray(data) && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      nombreCorto: texto.toUpperCase()
    };
  }

  return null;
}

function inicializarMapaRuta() {
  if (mapaRuta || typeof L === "undefined") return;
  const el = document.getElementById("mapaRutaLeaflet");
  if (!el) return;

  mapaRuta = L.map("mapaRutaLeaflet", { preferCanvas: true }).setView([-12.06, -77.04], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    crossOrigin: "anonymous",
    maxZoom: 19
  }).addTo(mapaRuta);

  mapaRuta.on("moveend zoomend", () => {
    setTimeout(capturarMapaParaCanvasRuta, 350);
  });
}

function construirTextoNarrativoRuta(origenTexto, destinoNombre, pasos, duracionMin) {
  const sitio = getSitio();
  const calles = [];

  pasos.forEach((step) => {
    const nombreCalle = (step.name || "").trim();
    if (nombreCalle && !calles.includes(nombreCalle.toUpperCase())) {
      calles.push(nombreCalle.toUpperCase());
    }
  });

  const inicioLimpio = origenTexto.toUpperCase();
  const tramoAvenidas = calles.slice(0, 5).map((c) => `AV/CALLE ${c}`).join(", LUEGO POR ");
  const llegada = calles.length > 0 ? calles[calles.length - 1] : destinoNombre;

  return (
    `SACAR LLAVES EN ${inicioLimpio}, LUEGO DIRIGIRTE POR ${tramoAvenidas || "LA RUTA PRINCIPAL"}. ` +
    `CONTINUAR HASTA ${llegada}, LA ESTACIÓN ${sitio} SE ENCUENTRA EN EL PUNTO INDICADO. ` +
    `DEL CUSTODIO HASTA EL SITIO ${Math.max(1, Math.round(duracionMin))} MINUTOS APROX.`
  );
}

async function calcularYTrazarRuta() {
  inicializarMapaRuta();
  const origenRaw = (document.getElementById("rutaOrigen")?.value || "").trim();
  const destinoRaw = (document.getElementById("rutaDestino")?.value || "").trim();

  if (!origenRaw || !destinoRaw) {
    setAviso("avisoRuta", "Ingresa la dirección/coordenadas del Custodio (1) y de la Estación (2).", "warning");
    return;
  }

  setAviso("avisoRuta", "Buscando ubicaciones y calculando ruta óptima...", "warning");

  try {
    const [pOrigen, pDestino] = await Promise.all([
      resolverUbicacionRuta(origenRaw),
      resolverUbicacionRuta(destinoRaw)
    ]);

    if (!pOrigen || !pDestino) {
      setAviso("avisoRuta", "No se pudo ubicar una de las direcciones. Prueba con coordenadas en GMS o decimal.", "error");
      return;
    }

    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${pOrigen.lon},${pOrigen.lat};${pDestino.lon},${pDestino.lat}?overview=full&geometries=geojson&steps=true`;
    const rResp = await fetch(routeUrl);
    if (!rResp.ok) {
      setAviso("avisoRuta", "No se pudo consultar el servicio de rutas.", "error");
      return;
    }
    const rData = await rResp.json();

    if (!rData.routes || !rData.routes.length) {
      setAviso("avisoRuta", "No se encontró una ruta vehicular entre ambos puntos.", "error");
      return;
    }

    const ruta = rData.routes[0];
    const coordsLatLng = ruta.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    const duracionMin = ruta.duration / 60;
    const pasos = ruta.legs?.[0]?.steps || [];

    if (capaRutaLinea) mapaRuta.removeLayer(capaRutaLinea);
    if (marcadorCustodio) mapaRuta.removeLayer(marcadorCustodio);
    if (marcadorEstacion) mapaRuta.removeLayer(marcadorEstacion);

    capaRutaLinea = L.polyline(coordsLatLng, {
      color: "#2563eb",
      weight: 7,
      opacity: 0.92
    }).addTo(mapaRuta);

    marcadorCustodio = L.circleMarker([pOrigen.lat, pOrigen.lon], {
      radius: 8,
      fillColor: "#1d4ed8",
      color: "#ffffff",
      weight: 3,
      fillOpacity: 1
    }).addTo(mapaRuta).bindPopup("Custodio de Llaves");

    marcadorEstacion = L.circleMarker([pDestino.lat, pDestino.lon], {
      radius: 9,
      fillColor: "#dc2626",
      color: "#ffffff",
      weight: 3,
      fillOpacity: 1
    }).addTo(mapaRuta).bindPopup(`Estación ${getSitio()}`);

    const bounds = capaRutaLinea.getBounds();
    mapaRuta.fitBounds(bounds, {
      paddingTopLeft: [30, 30],
      paddingBottomRight: [260, 30]
    });

    const textoRuta = construirTextoNarrativoRuta(origenRaw, pDestino.nombreCorto, pasos, duracionMin);
    const txtArea = document.getElementById("rutaDetalleTexto");
    if (txtArea) txtArea.value = textoRuta;

    setTimeout(() => {
      const ptCustodio = mapaRuta.latLngToContainerPoint([pOrigen.lat, pOrigen.lon]);
      const mapEl = document.getElementById("mapaRutaLeaflet");
      if (mapEl && ptCustodio) {
        estadoCuadroRuta.targetX = Math.max(0.05, Math.min(0.45, ptCustodio.x / mapEl.clientWidth));
        estadoCuadroRuta.targetY = Math.max(0.1, Math.min(0.9, ptCustodio.y / mapEl.clientHeight));
      }
      capturarMapaParaCanvasRuta();
    }, 650);

    guardarEstadoLocal();
    setAviso("avisoRuta", "");
  } catch (_) {
    setAviso("avisoRuta", "Error de conexión al trazar la ruta. Verifica tu internet.", "error");
  }
}

async function capturarMapaParaCanvasRuta() {
  const mapEl = document.getElementById("mapaRutaLeaflet");
  if (!mapEl || typeof html2canvas === "undefined") return;

  try {
    const captured = await html2canvas(mapEl, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      scale: 1.5
    });
    imagenMapaBase = captured;
    dibujarCanvasRutaFinal();
  } catch (_) {
    dibujarCanvasRutaFinal();
  }
}

function envolverTextoCanvas(ctx, texto, maxWidth) {
  const palabras = texto.split(/\s+/);
  const lineas = [];
  let lineaActual = "";

  palabras.forEach((palabra) => {
    const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width <= maxWidth) {
      lineaActual = prueba;
    } else {
      if (lineaActual) lineas.push(lineaActual);
      lineaActual = palabra;
    }
  });
  if (lineaActual) lineas.push(lineaActual);
  return lineas;
}

function dibujarCanvasRutaFinal() {
  const canvas = document.getElementById("canvasRutaFinal");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (imagenMapaBase) {
    ctx.drawImage(imagenMapaBase, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Presiona 'Trazar Ruta y Generar Texto' para cargar el mapa", canvas.width / 2, canvas.height / 2);
  }

  const bx = estadoCuadroRuta.boxX * canvas.width;
  const by = estadoCuadroRuta.boxY * canvas.height;
  const bw = estadoCuadroRuta.boxW * canvas.width;
  const bh = estadoCuadroRuta.boxH * canvas.height;
  const tx = estadoCuadroRuta.targetX * canvas.width;
  const ty = estadoCuadroRuta.targetY * canvas.height;

  ctx.save();
  ctx.strokeStyle = "#ef1d1d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(bx + 12, by + 24);
  ctx.lineTo(tx, ty - 6);
  ctx.moveTo(bx + 12, by + bh - 24);
  ctx.lineTo(tx, ty + 6);
  ctx.stroke();

  const radio = 22;
  ctx.fillStyle = "rgba(255, 255, 255, 0.30)";
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, radio);
  ctx.fill();

  ctx.strokeStyle = "#ef1d1d";
  ctx.lineWidth = 5;
  ctx.stroke();

  const textoDetalle = (document.getElementById("rutaDetalleTexto")?.value || "SACAR LLAVES EN...").toUpperCase();
  const padInterno = 22;
  const maxTextW = bw - padInterno * 2;
  const fontSize = 21;
  const lineHeight = 28;

  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const lineas = envolverTextoCanvas(ctx, textoDetalle, maxTextW);
  let curY = by + padInterno;

  lineas.forEach((linea) => {
    if (curY + lineHeight > by + bh - 12) return;
    ctx.lineJoin = "round";
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.strokeText(linea, bx + padInterno, curY);

    ctx.fillStyle = "#ef1d1d";
    ctx.fillText(linea, bx + padInterno, curY);
    curY += lineHeight;
  });

  ctx.restore();
}

/* =========================================================
   ARRASTRE DEL CUADRO ROJO EN PESTAÑA 5 (RUTA)
   ========================================================= */
(function habilitarArrastreCuadroRuta() {
  const canvas = document.getElementById("canvasRutaFinal");
  if (!canvas) return;
  let modoArrastre = null;
  let offsetX = 0;
  let offsetY = 0;

  const getCoords = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      nx: (e.clientX - r.left) / r.width,
      ny: (e.clientY - r.top) / r.height
    };
  };

  canvas.addEventListener("pointerdown", (e) => {
    const { nx, ny } = getCoords(e);
    const distTarget = Math.hypot(nx - estadoCuadroRuta.targetX, ny - estadoCuadroRuta.targetY);
    if (distTarget < 0.06) {
      modoArrastre = "target";
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (
      nx >= estadoCuadroRuta.boxX &&
      nx <= estadoCuadroRuta.boxX + estadoCuadroRuta.boxW &&
      ny >= estadoCuadroRuta.boxY &&
      ny <= estadoCuadroRuta.boxY + estadoCuadroRuta.boxH
    ) {
      modoArrastre = "box";
      offsetX = nx - estadoCuadroRuta.boxX;
      offsetY = ny - estadoCuadroRuta.boxY;
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!modoArrastre) return;
    const { nx, ny } = getCoords(e);
    if (modoArrastre === "target") {
      estadoCuadroRuta.targetX = Math.max(0.02, Math.min(0.95, nx));
      estadoCuadroRuta.targetY = Math.max(0.02, Math.min(0.95, ny));
    } else if (modoArrastre === "box") {
      estadoCuadroRuta.boxX = Math.max(0.02, Math.min(1 - estadoCuadroRuta.boxW - 0.02, nx - offsetX));
      estadoCuadroRuta.boxY = Math.max(0.02, Math.min(1 - estadoCuadroRuta.boxH - 0.02, ny - offsetY));
    }
    dibujarCanvasRutaFinal();
  });

  canvas.addEventListener("pointerup", () => {
    modoArrastre = null;
  });
})();

/* =========================================================
   NAVEGACIÓN, PERSISTENCIA Y EVENTOS GENERALES
   ========================================================= */
function dibujarTabActiva(tabId) {
  if (tabId === "tabSpat") dibujarSpat();
  else if (tabId === "tabPerimetro") dibujarPerimetro();
  else if (tabId === "tabTorre") dibujarTorreElevacion();
  else if (tabId === "tabEquipos") renderizarTodasLasFotosEquipos();
  else if (tabId === "tabRuta") {
    inicializarMapaRuta();
    setTimeout(() => {
      if (mapaRuta) mapaRuta.invalidateSize();
      dibujarCanvasRutaFinal();
    }, 150);
  } else {
    dibujarTodo();
  }
}

function dibujarTodo() {
  dibujarSpat();
  dibujarPerimetro();
  dibujarTorreElevacion();
  renderizarTodasLasFotosEquipos();
  dibujarCanvasRutaFinal();
}

const tabBtns = Array.from(document.querySelectorAll(".tab-btn"));
tabBtns.forEach((btn, idx) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-tab");
    if (targetId) activarTab(targetId, btn);
  });

  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const nextIdx = (idx + dir + tabBtns.length) % tabBtns.length;
      const nextBtn = tabBtns[nextIdx];
      nextBtn.focus();
      const targetId = nextBtn.getAttribute("data-tab");
      if (targetId) activarTab(targetId, nextBtn);
    }
  });
});

const allInputs = [
  "sitio", "globalTipoTorre", "globalAlturaTorre",
  "spatTipoTorre", "cantidadPozos", "val50", "val60", "val70",
  "perAncho", "perLargo", "perTipoTorre", "perFormatoCoord",
  "coordA", "coordB", "coordC", "coordD",
  "torreTipo", "alturaTorre", "alturaBase", "roldanaSup", "roldanaInf",
  "rol1Sup", "rol1Inf", "rol2Sup", "rol2Inf", "rol3Sup", "rol3Inf",
  "alturaEdificio", "alturaEscaleraGato",
  "equiposAlturaRef", "equiposAgrupar", "equiposFontSize",
  "rutaOrigen", "rutaDestino", "rutaDetalleTexto"
];

function guardarEstadoLocal() {
  try {
    const data = { inputs: {}, listaEquipos };
    allInputs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) data.inputs[id] = el.value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

function restaurarEstadoLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.inputs) {
      allInputs.forEach((id) => {
        const el = document.getElementById(id);
        if (el && typeof data.inputs[id] === "string") {
          el.value = data.inputs[id];
        }
      });
    }
    if (Array.isArray(data.listaEquipos) && data.listaEquipos.length > 0) {
      listaEquipos = data.listaEquipos;
    }
  } catch (_) {}
}

document.getElementById("rutaDestino")?.addEventListener("input", (e) => {
  if (e.currentTarget.value.trim()) {
    e.currentTarget.dataset.manualEdit = "1";
  } else {
    delete e.currentTarget.dataset.manualEdit;
  }
});

allInputs.forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;

  const onChangeHandler = () => {
    guardarEstadoLocal();

    if (id === "torreTipo" || id === "globalTipoTorre") {
      sincronizarModeloTorreGlobal(el.value, id);
      dibujarTodo();
    } else if (id === "spatTipoTorre" || id === "perTipoTorre") {
      sincronizarSimboloDesdePestana1o2(el.value, id);
      dibujarSpat();
      dibujarPerimetro();
    } else if (id === "alturaTorre" || id === "globalAlturaTorre" || id === "equiposAlturaRef") {
      sincronizarAlturaGlobal(el.value, id);
      dibujarTorreElevacion();
    } else if (id === "equiposFontSize") {
      renderizarTodasLasFotosEquipos();
    } else if (id === "equiposAgrupar") {
      recalcularYRenderizarTodasFotos();
    } else if (id === "rutaDetalleTexto") {
      dibujarCanvasRutaFinal();
    } else {
      dibujarTodo();
    }
  };

  el.addEventListener("input", onChangeHandler);
  el.addEventListener("change", onChangeHandler);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "F10") {
    e.preventDefault();
    document.getElementById("btnDescargarTodoLote")?.click();
  } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    const activePanel = document.querySelector(".tab-panel.active");
    if (!activePanel) return;
    if (activePanel.id === "tabSpat") document.getElementById("btnDescargarSpat")?.click();
    else if (activePanel.id === "tabPerimetro") document.getElementById("btnDescargarPer")?.click();
    else if (activePanel.id === "tabTorre") document.getElementById("btnDescargarTorre")?.click();
    else if (activePanel.id === "tabEquipos") document.getElementById("btnDescargarUnidaEquipos")?.click();
    else if (activePanel.id === "tabRuta") document.getElementById("btnDescargarRuta")?.click();
  }
});

document.getElementById("btnConvertirCoordsGMS")?.addEventListener("click", () => {
  const selFormato = document.getElementById("perFormatoCoord");
  if (selFormato) selFormato.value = "gms";
  ["coordA", "coordB", "coordC", "coordD"].forEach((cid) => {
    const inp = document.getElementById(cid);
    if (inp && inp.value.trim()) {
      inp.value = formatearCoordenadaSegunModo(inp.value);
    }
  });
  const destInput = document.getElementById("rutaDestino");
  if (destInput) delete destInput.dataset.manualEdit;
  guardarEstadoLocal();
  dibujarPerimetro();
});

document.getElementById("equiposFotos")?.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  const disponibles = 4 - fotosPanoramicas.length;
  if (disponibles <= 0) {
    setAviso("avisoEquipos", "Ya tienes el máximo de 4 fotos panorámicas cargadas.", "warning");
    e.target.value = "";
    return;
  }

  const seleccionados = files.slice(0, disponibles);
  const eraPrimeraFoto = fotosPanoramicas.length === 0;
  let pendientes = seleccionados.length;

  seleccionados.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const nuevaFoto = {
          id: Date.now() + i + Math.random(),
          nombreArchivo: file.name,
          img,
          canvas: null,
          callouts: [],
          topY: 0.14,
          bottomY: 0.86,
          calibratingStep: 0
        };
        const mejorPrevio = buscarMejorSitioAprendido();
        if (mejorPrevio && mejorPrevio.modeloTorre === (document.getElementById("torreTipo")?.value || "arbol")) {
          nuevaFoto.topY = mejorPrevio.topY;
          nuevaFoto.bottomY = mejorPrevio.bottomY;
        }
        calcularCalloutsParaFoto(nuevaFoto);
        fotosPanoramicas.push(nuevaFoto);

        if (eraPrimeraFoto && i === 0) {
          extraerMetadatosTimestampCamera(img);
        }

        pendientes--;
        if (pendientes === 0) construirGaleriaEquipos();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  e.target.value = "";
});

document.getElementById("inputExcelEquipos")?.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const lower = file.name.toLowerCase();
  const isImage = /\.(jpg|jpeg|png|webp|bmp)$/i.test(lower);

  if (isImage && typeof window.Tesseract !== "undefined") {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        setAviso("avisoEquipos", "Extrayendo listado de equipos desde la imagen...", "warning");
        const res = await window.Tesseract.recognize(ev.target.result, "spa+eng");
        const importados = parsearLineasInventario(res?.data?.text || "");
        if (importados.length > 0) {
          importados.sort((a, b) => b.altura - a.altura);
          listaEquipos = importados;
          guardarEstadoLocal();
          renderizarTablaEquipos();
          recalcularYRenderizarTodasFotos();
          setAviso("avisoEquipos", `Se importaron ${importados.length} equipos desde la imagen.`, "warning");
        } else {
          setAviso("avisoEquipos", "No se detectaron filas válidas de equipos en la imagen.", "warning");
        }
      } catch (_) {
        setAviso("avisoEquipos", "Error al procesar la imagen con OCR.", "error");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      let textoTabla = "";
      if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
        textoTabla = ev.target.result;
      } else if (typeof window.XLSX !== "undefined") {
        const workbook = window.XLSX.read(ev.target.result, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        textoTabla = window.XLSX.utils.sheet_to_csv(firstSheet, { FS: "\t" });
      }
      const importados = parsearLineasInventario(textoTabla);
      if (importados.length > 0) {
        importados.sort((a, b) => b.altura - a.altura);
        listaEquipos = importados;
        guardarEstadoLocal();
        renderizarTablaEquipos();
        recalcularYRenderizarTodasFotos();
        setAviso("avisoEquipos", "");
      } else {
        setAviso("avisoEquipos", "No se encontraron filas válidas (código y altura) en el archivo.", "warning");
      }
    } catch (_) {
      setAviso("avisoEquipos", "Error al leer el archivo Excel o CSV.", "error");
    }
  };

  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
  e.target.value = "";
});

document.getElementById("btnAgregarEquipo")?.addEventListener("click", () => {
  const maxH = listaEquipos.length ? Math.max(...listaEquipos.map((e) => parseFloat(e.altura) || 0)) : 28.0;
  listaEquipos.push({
    id: Date.now() + Math.random(),
    etiqueta: `RF ${listaEquipos.length + 1}`,
    altura: Number(Math.max(1, maxH - 0.5).toFixed(2)),
    lado: "AUTO"
  });
  listaEquipos.sort((a, b) => (parseFloat(b.altura) || 0) - (parseFloat(a.altura) || 0));
  guardarEstadoLocal();
  renderizarTablaEquipos();
  recalcularYRenderizarTodasFotos();
});

document.getElementById("btnPlantillasEquipos")?.addEventListener("click", () => {
  const p = document.getElementById("panelPlantillasEquipos");
  if (p) p.hidden = !p.hidden;
});
document.getElementById("btnCerrarPlantillas")?.addEventListener("click", () => {
  document.getElementById("panelPlantillasEquipos").hidden = true;
});
document.querySelectorAll(".btn-tpl").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tpl = PLANTILLAS_EQUIPOS[btn.getAttribute("data-tpl")];
    if (!tpl) return;
    listaEquipos = tpl.map((item, idx) => ({ id: Date.now() + idx + Math.random(), ...item }));
    guardarEstadoLocal();
    renderizarTablaEquipos();
    recalcularYRenderizarTodasFotos();
    document.getElementById("panelPlantillasEquipos").hidden = true;
  });
});

document.getElementById("btnPegarListaEquipos")?.addEventListener("click", () => {
  const p = document.getElementById("panelPegarEquipos");
  if (p) p.hidden = !p.hidden;
});
document.getElementById("btnCerrarPegadoEquipos")?.addEventListener("click", () => {
  document.getElementById("panelPegarEquipos").hidden = true;
});
document.getElementById("btnProcesarPegadoEquipos")?.addEventListener("click", () => {
  const raw = document.getElementById("txtPegarEquipos").value.trim();
  const nuevasFilas = parsearLineasInventario(raw);
  if (nuevasFilas.length > 0) {
    nuevasFilas.sort((a, b) => b.altura - a.altura);
    listaEquipos = nuevasFilas;
    guardarEstadoLocal();
    renderizarTablaEquipos();
    recalcularYRenderizarTodasFotos();
    document.getElementById("panelPegarEquipos").hidden = true;
    document.getElementById("txtPegarEquipos").value = "";
  }
});

document.getElementById("btnAjusteMasivoAlturas")?.addEventListener("click", () => {
  const p = document.getElementById("panelAjusteAlturas");
  if (p) p.hidden = !p.hidden;
});
document.getElementById("btnCerrarAjusteAlturas")?.addEventListener("click", () => {
  document.getElementById("panelAjusteAlturas").hidden = true;
});
document.getElementById("btnSumarDeltaAltura")?.addEventListener("click", () => {
  const delta = parseFloat(document.getElementById("inpDeltaAltura")?.value) || 0;
  listaEquipos.forEach((eq) => (eq.altura = Number(Math.max(0.5, (parseFloat(eq.altura) || 0) + delta).toFixed(2))));
  guardarEstadoLocal();
  renderizarTablaEquipos();
  recalcularYRenderizarTodasFotos();
});
document.getElementById("btnRestarDeltaAltura")?.addEventListener("click", () => {
  const delta = parseFloat(document.getElementById("inpDeltaAltura")?.value) || 0;
  listaEquipos.forEach((eq) => (eq.altura = Number(Math.max(0.5, (parseFloat(eq.altura) || 0) - delta).toFixed(2))));
  guardarEstadoLocal();
  renderizarTablaEquipos();
  recalcularYRenderizarTodasFotos();
});
document.getElementById("btnEscalarProporcional")?.addEventListener("click", () => {
  if (!listaEquipos.length) return;
  const alturaRef = Math.max(1, parseFloat(document.getElementById("equiposAlturaRef")?.value) || 30);
  const maxActual = Math.max(...listaEquipos.map((e) => parseFloat(e.altura) || 0));
  if (maxActual <= 0) return;
  const ratio = alturaRef / maxActual;
  listaEquipos.forEach((eq) => {
    eq.altura = Number(Math.max(0.5, (parseFloat(eq.altura) || 0) * ratio).toFixed(2));
  });
  guardarEstadoLocal();
  renderizarTablaEquipos();
  recalcularYRenderizarTodasFotos();
});

document.getElementById("btnGuardarPlantillaUsuario")?.addEventListener("click", () => {
  try {
    localStorage.setItem(USER_TEMPLATE_KEY, JSON.stringify(listaEquipos));
    setAviso("avisoEquipos", "Tu lista actual se guardó como plantilla personal.", "warning");
  } catch (_) {}
});
document.getElementById("btnCargarPlantillaUsuario")?.addEventListener("click", () => {
  try {
    const raw = localStorage.getItem(USER_TEMPLATE_KEY);
    if (!raw) {
      setAviso("avisoEquipos", "No tienes ninguna plantilla personal guardada.", "warning");
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      listaEquipos = parsed.map((item, idx) => ({ ...item, id: Date.now() + idx + Math.random() }));
      guardarEstadoLocal();
      renderizarTablaEquipos();
      recalcularYRenderizarTodasFotos();
      setAviso("avisoEquipos", "Plantilla personal cargada.", "warning");
    }
  } catch (_) {}
});

document.getElementById("btnGuardarPlantillaFlechas")?.addEventListener("click", () => {
  const inp = document.getElementById("inpNombrePlantillaFlechas");
  const nombre = (inp?.value || "").trim() || `${getSitio()} (${document.getElementById("torreTipo")?.value || "torre"})`;
  const firma = capturarFirmaSitioActual();
  const db = cargarBaseConocimiento();
  const nuevaTpl = {
    id: `tpl_${Date.now()}`,
    nombre,
    ...firma
  };
  db.plantillasFlechas.push(nuevaTpl);
  guardarBaseConocimiento(db);
  if (inp) inp.value = "";
  const sel = document.getElementById("selPlantillasGuardadas");
  if (sel) sel.value = nuevaTpl.id;
  setAviso("avisoEquipos", `Plantilla "${nombre}" guardada con ${firma.flechasAprendidas.length} flechas.`, "warning");
});

document.getElementById("btnAplicarPlantillaGuardada")?.addEventListener("click", () => {
  const sel = document.getElementById("selPlantillasGuardadas");
  if (!sel || !sel.value) {
    setAviso("avisoEquipos", "Selecciona una plantilla guardada primero.", "warning");
    return;
  }
  const db = cargarBaseConocimiento();
  const tpl = db.plantillasFlechas.find((t) => String(t.id) === String(sel.value));
  if (!tpl) return;
  aplicarGeometriaAprendidaAFotos(tpl, false);
  setAviso("avisoEquipos", `Plantilla "${tpl.nombre}" aplicada.`, "warning");
});

document.getElementById("btnEliminarPlantillaGuardada")?.addEventListener("click", () => {
  const sel = document.getElementById("selPlantillasGuardadas");
  if (!sel || !sel.value) return;
  const db = cargarBaseConocimiento();
  db.plantillasFlechas = db.plantillasFlechas.filter((t) => String(t.id) !== String(sel.value));
  guardarBaseConocimiento(db);
  setAviso("avisoEquipos", "Plantilla eliminada.", "warning");
});

document.getElementById("btnExportarCerebro")?.addEventListener("click", () => {
  const db = cargarBaseConocimiento();
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aprendizaje_esquemas_${getSitioSlug()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("inputImportarCerebro")?.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const incoming = JSON.parse(ev.target.result);
      const current = cargarBaseConocimiento();
      const mergedSitios = [...current.sitiosAprendidos];
      if (Array.isArray(incoming.sitiosAprendidos)) {
        incoming.sitiosAprendidos.forEach((s) => {
          const idx = mergedSitios.findIndex((x) => x.sitio === s.sitio);
          if (idx >= 0) mergedSitios[idx] = s;
          else mergedSitios.push(s);
        });
      }
      const mergedTpls = [...current.plantillasFlechas];
      if (Array.isArray(incoming.plantillasFlechas)) {
        incoming.plantillasFlechas.forEach((t) => {
          if (!mergedTpls.some((x) => String(x.id) === String(t.id))) mergedTpls.push(t);
        });
      }
      guardarBaseConocimiento({ sitiosAprendidos: mergedSitios, plantillasFlechas: mergedTpls });
      setAviso("avisoEquipos", "Base de aprendizaje importada y combinada correctamente.", "warning");
    } catch (_) {
      setAviso("avisoEquipos", "El archivo JSON seleccionado no es válido.", "error");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

document.getElementById("btnDescargarUnidaEquipos")?.addEventListener("click", descargarTodasFotosUnidas);
document.getElementById("btnAutoDistribuirEquipos")?.addEventListener("click", recalcularYRenderizarTodasFotos);
document.getElementById("btnAlinearMargenes")?.addEventListener("click", alinearEtiquetasEnMargen);
document.getElementById("btnLimpiarFotosEquipos")?.addEventListener("click", () => {
  fotosPanoramicas = [];
  construirGaleriaEquipos();
});

document.getElementById("btnToggleLockDrag")?.addEventListener("click", (e) => {
  bloqueoArrastre = !bloqueoArrastre;
  e.currentTarget.setAttribute("aria-pressed", String(bloqueoArrastre));
  e.currentTarget.textContent = bloqueoArrastre ? "Desbloquear Arrastre en Fotos" : "Bloquear Arrastre en Fotos";
  fotosPanoramicas.forEach((f) => f.canvas?.classList.toggle("scroll-unlocked", bloqueoArrastre));
});

document.getElementById("btnAprenderSitioActual")?.addEventListener("click", () => aprenderSitioActual(false));
document.getElementById("btnAplicarAprendizajeAuto")?.addEventListener("click", ejecutarAutoLlenadoDesdeAprendizaje);
document.getElementById("btnAutoAcomodarRapido")?.addEventListener("click", ejecutarAutoLlenadoDesdeAprendizaje);

document.getElementById("btnActualizarSpat")?.addEventListener("click", dibujarSpat);
document.getElementById("btnDescargarSpat")?.addEventListener("click", () => {
  dibujarSpat();
  descargarCanvas("canvasSpat", "1_ESQUEMA_SPAT");
});

document.getElementById("btnActualizarPer")?.addEventListener("click", dibujarPerimetro);
document.getElementById("btnDescargarPer")?.addEventListener("click", () => {
  dibujarPerimetro();
  descargarCanvas("canvasPerimetro", "2_ESQUEMA_PERIMETRO");
});

document.getElementById("btnActualizarTorre")?.addEventListener("click", dibujarTorreElevacion);
document.getElementById("btnDescargarTorre")?.addEventListener("click", () => {
  const modelo = document.getElementById("torreTipo").value.toUpperCase();
  dibujarTorreElevacion();
  descargarCanvas("canvasTorre", `3_ESQUEMA_TORRE_${modelo}`);
});

document.getElementById("btnCalcularRuta")?.addEventListener("click", calcularYTrazarRuta);
document.getElementById("btnRedibujarRuta")?.addEventListener("click", capturarMapaParaCanvasRuta);
document.getElementById("btnAbrirGoogleMaps")?.addEventListener("click", () => {
  const orig = encodeURIComponent(document.getElementById("rutaOrigen")?.value || "");
  const dest = encodeURIComponent(document.getElementById("rutaDestino")?.value || "");
  window.open(`https://www.google.com/maps/dir/?api=1&origin=${orig}&destination=${dest}&travelmode=driving`, "_blank", "noopener,noreferrer");
});
document.getElementById("btnDescargarRuta")?.addEventListener("click", () => {
  dibujarCanvasRutaFinal();
  descargarCanvas("canvasRutaFinal", "5_DIAGRAMA_RUTA_SITIO");
});

document.getElementById("btnDescargarTodoLote")?.addEventListener("click", () => {
  dibujarTodo();
  const modelo = (document.getElementById("torreTipo")?.value || "TORRE").toUpperCase();
  const tareas = [
    () => descargarCanvas("canvasSpat", "1_ESQUEMA_SPAT"),
    () => descargarCanvas("canvasPerimetro", "2_ESQUEMA_PERIMETRO"),
    () => descargarCanvas("canvasTorre", `3_ESQUEMA_TORRE_${modelo}`)
  ];
  if (fotosPanoramicas.length > 0) {
    tareas.push(() => descargarTodasFotosUnidas());
  }
  if (imagenMapaBase) {
    tareas.push(() => descargarCanvas("canvasRutaFinal", "5_DIAGRAMA_RUTA_SITIO"));
  }
  tareas.forEach((fn, idx) => {
    setTimeout(fn, idx * 750);
  });
});

document.getElementById("btnNuevoSitioConBase")?.addEventListener("click", () => {
  fotosPanoramicas = [];
  construirGaleriaEquipos();
  const sitioInput = document.getElementById("sitio");
  if (sitioInput) {
    sitioInput.value = "";
    sitioInput.focus();
  }
  ["coordA", "coordB", "coordC", "coordD", "rutaOrigen", "rutaDestino", "rutaDetalleTexto"].forEach((cid) => {
    const el = document.getElementById(cid);
    if (el) {
      el.value = "";
      delete el.dataset.manualEdit;
    }
  });
  imagenMapaBase = null;
  guardarEstadoLocal();
  dibujarTodo();
});

document.getElementById("btnResetTodo")?.addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  location.reload();
});

// Inicialización ordenada
restaurarEstadoLocal();
actualizarCamposTorre();
actualizarUIPlantillasAprendidas();
renderizarTablaEquipos();
dibujarTodo();
