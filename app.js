const API_URL = "https://script.google.com/macros/s/AKfycbwvynEdDojC9HU637AmejjAHruV1RtsXgbnw8iqGfcrL_xF5Y9hIHXAVGHBmAiT_yLImQ/exec";
let datos = null;

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
  document.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", cerrarModal));
  document.querySelector(".announcement button").addEventListener("click", () => document.querySelector(".announcement").hidden = true);
  try {
    const respuesta = await fetch(API_URL, { redirect: "follow" });
    if (!respuesta.ok) throw new Error("No se pudo consultar el panel");
    datos = await respuesta.json();
    aplicarConfiguracion(datos.configuracion || {});
    pintarBiblioteca(datos.biblioteca || []);
    pintarTrabajos(datos.trabajos || []);
  } catch (error) {
    document.querySelector("#recursos").innerHTML = '<p class="empty">La biblioteca se está actualizando. Intenta nuevamente en unos minutos.</p>';
    console.error(error);
  }
}

function aplicarConfiguracion(config) {
  const nombre = config["Nombre del sitio"] || "GOMEZA";
  document.querySelectorAll(".brand span, #nombreSitio").forEach(el => el.textContent = nombre);
  const frase = config["Frase de bienvenida"];
  if (frase) document.querySelector("#fraseBienvenida").textContent = frase;
  const aviso = document.querySelector("#anuncio");
  if (si(config["Mostrar mensaje temporal"]) && config["Mensaje temporal"]) {
    document.querySelector("#anuncioTexto").textContent = config["Mensaje temporal"];
    aviso.hidden = false;
    document.body.classList.add("has-announcement");
  }
  const enlaceConfigurado = String(config["Enlace de WhatsApp"] || "").trim();
  const enlaceSeguro = seguro(enlaceConfigurado);
  const whatsapp = enlaceSeguro !== "#" ? enlaceSeguro : "#contacto";
  document.querySelectorAll(".whatsapp-link").forEach(el => {
    el.href = whatsapp;
    el.target = whatsapp !== "#contacto" ? "_blank" : "";
    el.rel = whatsapp !== "#contacto" ? "noopener noreferrer" : "";
  });
  const redes = [["Facebook", "Facebook"], ["Instagram", "Instagram"], ["TikTok", "TikTok"]].filter(([clave]) => config[clave]);
  document.querySelector("#redes").innerHTML = redes.map(([clave, nombreRed]) => `<a href="${seguro(config[clave])}" target="_blank" rel="noopener">${nombreRed}</a>`).join("");
  document.documentElement.dataset.tema = normalizar(config["Tema visual"] || "Normal");
}

function pintarBiblioteca(lista) {
  const publicados = lista.filter(item => si(item.Publicar));
  const categorias = [...new Set(publicados.map(item => item["Categoría"]).filter(Boolean))];
  const tabs = document.querySelector("#categorias");
  tabs.innerHTML = ['Todos', ...categorias].map((cat, i) => `<button class="${i === 0 ? 'active' : ''}" data-category="${escapar(cat)}">${escapar(cat)}</button>`).join("");
  tabs.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    tabs.querySelectorAll("button").forEach(b => b.classList.remove("active")); btn.classList.add("active"); mostrarRecursos(publicados, btn.dataset.category);
  }));
  mostrarRecursos(publicados, "Todos");
}

function mostrarRecursos(lista, categoria) {
  const filtrados = categoria === "Todos" ? lista : lista.filter(x => x["Categoría"] === categoria);
  const contenedor = document.querySelector("#recursos");
  if (!filtrados.length) { contenedor.innerHTML = '<p class="empty">Próximamente publicaremos recursos en esta categoría.</p>'; return; }
  contenedor.innerHTML = filtrados.sort((a,b) => Number(a.Orden)-Number(b.Orden)).map(item => `<button class="resource-row" data-id="${escapar(item["ID automático"])}"><span>${escapar(item["Categoría"] || "Recurso")}</span><strong>${escapar(item["Nombre público"])}</strong><b>Ver detalle ↗</b></button>`).join("");
  contenedor.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => abrirDetalle(btn.dataset.id)));
}

function abrirDetalle(id) {
  const recurso = (datos.biblioteca || []).find(x => x["ID automático"] === id);
  const detalle = (datos.detalles || []).find(x => x.Recurso === recurso?.["Nombre público"]);
  if (!recurso) return;
  document.querySelector("#modalCategoria").textContent = recurso["Categoría"] || "Biblioteca";
  document.querySelector("#modalTitulo").textContent = recurso["Nombre público"];
  document.querySelector("#modalDescripcion").textContent = detalle?.["Descripción"] || "Consulta la información disponible para este recurso.";
  const acceso = detalle?.["Tipo de acceso"] || "Consultar";
  const precio = detalle?.Precio || "";
  document.querySelector("#modalPrecio").textContent = acceso === "Pago" ? precio : acceso === "Gratis" ? "Gratis" : "Consulta personalizada";
  const accion = document.querySelector("#modalAccion");
  accion.textContent = `${detalle?.["Texto del botón"] || "Consultar"} ↗`;
  accion.href = detalle?.["Enlace de destino"] || document.querySelector(".whatsapp-link").href;
  document.querySelector("#modal").hidden = false;
  document.body.classList.add("modal-open");
}

function cerrarModal() { document.querySelector("#modal").hidden = true; document.body.classList.remove("modal-open"); }

function pintarTrabajos(lista) {
  const publicados = lista.filter(item => si(item.Publicar));
  const contenedor = document.querySelector("#listaTrabajos");
  contenedor.innerHTML = publicados.length ? publicados.map(item => `<article><div class="project-media">${item["Foto o video"] ? `<img src="${seguro(item["Foto o video"])}" alt="${escapar(item["Nombre del trabajo"])}">` : '<span>G</span>'}</div><small>${escapar(item["Categoría"] || "Proyecto")}</small><h3>${escapar(item["Nombre del trabajo"])}</h3><p>${escapar(item["Descripción breve"] || "")}</p></article>`).join("") : '<p class="empty light">Los próximos trabajos publicados desde Google Sheets aparecerán aquí.</p>';
}

function si(valor) { return ["si", "sí", "yes", "true", "1"].includes(String(valor || "").trim().toLowerCase()); }
function normalizar(valor) { return String(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-"); }
function escapar(valor) { const div = document.createElement("div"); div.textContent = valor || ""; return div.innerHTML; }
function seguro(valor) { try { const u = new URL(valor); return ["http:", "https:"].includes(u.protocol) ? u.href : "#"; } catch { return "#"; } }
