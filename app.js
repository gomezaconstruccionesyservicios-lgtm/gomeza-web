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
  aplicarTipografias(config);
  aplicarTitulo(config);
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
  const tema = normalizar(config["Tema visual"] || "Normal");
  document.documentElement.dataset.tema = tema;
  aplicarBandera(config);
  aplicarFotoPortada(config);
  aplicarEfectos(config, tema);
}

function aplicarTitulo(config) {
  const lineas = [1, 2, 3].map(n => String(config[`Texto de la línea ${n}`] || "").trim());
  const hayLineas = lineas.some(Boolean);
  if (!hayLineas) {
    lineas[0] = String(config["Frase de bienvenida"] || "Construimos tu próxima gran idea.").trim();
  }
  lineas.forEach((texto, i) => {
    const elemento = document.querySelector(`#tituloLinea${i + 1}`);
    elemento.textContent = texto;
    elemento.hidden = !texto;
    elemento.style.color = colorTitulo(config[`Color de la línea ${i + 1}`], config["Color de texto personalizado"]);
  });
  const titulo = document.querySelector("#fraseBienvenida");
  titulo.dataset.tamano = normalizar(config["Tamaño de títulos"] || "Normal");
  titulo.style.setProperty("--title-length", Math.max(...lineas.map(x => x.length), 8));
}

function aplicarTipografias(config) {
  const titulo = String(config["Fuente de títulos"] || "Syne").trim();
  const texto = String(config["Fuente de textos"] || "Manrope").trim();
  const familias = [...new Set([titulo, texto])].map(x => `family=${encodeURIComponent(x).replace(/%20/g, "+")}:wght@400;600;700;800`).join("&");
  let link = document.querySelector("#fuentesDinamicas");
  if (!link) { link = document.createElement("link"); link.id = "fuentesDinamicas"; link.rel = "stylesheet"; document.head.appendChild(link); }
  link.href = `https://fonts.googleapis.com/css2?${familias}&display=swap`;
  document.documentElement.style.setProperty("--font-display", `"${titulo}"`);
  document.documentElement.style.setProperty("--font-body", `"${texto}"`);
}

function colorTitulo(nombre, personalizado) {
  const colores = { rojo: "#ef3636", blanco: "#ffffff", negro: "#071719", turquesa: "#45c7ce", dorado: "#e6bd55", verde: "#42c98a", azul: "#4da3ff" };
  const clave = normalizar(nombre || "Blanco");
  if (clave === "personalizado" && /^#[0-9a-f]{6}$/i.test(String(personalizado || ""))) return personalizado;
  return colores[clave] || "#ffffff";
}

function aplicarBandera(config) {
  const bandera = document.querySelector("#banderaDecorativa");
  bandera.hidden = !si(config["Mostrar bandera"]);
  if (bandera.hidden) return;
  bandera.dataset.posicion = normalizar(config["Posición de la bandera"] || "Junto al título");
  bandera.dataset.animacion = normalizar(config["Animación de la bandera"] || "Ondear suave");
  bandera.dataset.intensidad = normalizar(config["Intensidad de la bandera"] || "Normal");
  const imagen = urlImagen(config["Imagen de bandera"]);
  const img = document.querySelector("#banderaImagen");
  img.hidden = !imagen;
  if (imagen) img.src = imagen;
  bandera.classList.toggle("custom-image", Boolean(imagen));
  const posicion = bandera.dataset.posicion;
  if (posicion === "sobre-el-logo") document.querySelector(".hero-visual").appendChild(bandera);
  else if (posicion === "como-fondo") document.querySelector(".hero").appendChild(bandera);
  else document.querySelector("#fraseBienvenida").after(bandera);
}

function aplicarFotoPortada(config) {
  const foto = document.querySelector("#fotoPortada");
  const url = urlImagen(config["Foto principal de portada"]);
  foto.hidden = !si(config["Mostrar foto de portada"]) || !url;
  if (foto.hidden) return;
  foto.style.backgroundImage = `url("${url.replace(/"/g, "%22")}")`;
  document.querySelector(".hero").dataset.ubicacionFoto = normalizar(config["Ubicación de la foto"] || "Lado derecho");
  foto.dataset.animacion = normalizar(config["Animación de la foto"] || "Ninguna");
  foto.dataset.oscurecer = normalizar(config["Oscurecer la foto"] || "Normal");
}

function aplicarEfectos(config, tema) {
  const contenedor = document.querySelector("#efectosTematicos");
  contenedor.innerHTML = "";
  if (!si(config["Mostrar decoración temática"])) return;
  let efecto = normalizar(config["Efecto festivo"] || "Automático");
  if (efecto === "automatico" && si(config["Usar efecto automático del tema"])) {
    const automaticos = { "fiestas-patrias":"bandera-ondeando", navidad:"nieve", "ano-nuevo":"fuegos-artificiales", "dia-de-la-madre":"petalos", "dia-del-padre":"destellos", "dia-de-la-mujer":"petalos", halloween:"luces", "aniversario-gomeza":"confeti" };
    efecto = automaticos[tema] || "destellos";
  }
  if (["ninguno", "automatico"].includes(efecto)) return;
  contenedor.dataset.efecto = efecto;
  contenedor.dataset.animacion = normalizar(config["Animación del efecto"] || "Suave");
  contenedor.dataset.intensidad = normalizar(config["Intensidad del efecto"] || "Normal");
  const cantidad = { discreta: 12, normal: 20, alegre: 32, intensa: 48 }[contenedor.dataset.intensidad] || 20;
  for (let i = 0; i < cantidad; i++) {
    const particula = document.createElement("i");
    particula.style.setProperty("--x", `${(i * 37) % 100}%`);
    particula.style.setProperty("--delay", `${-(i % 12)}s`);
    particula.style.setProperty("--dur", `${6 + (i % 7)}s`);
    contenedor.appendChild(particula);
  }
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
function urlImagen(valor) {
  const texto = String(valor || "").trim();
  if (!texto || /IDENTIFICADOR/i.test(texto)) return "";
  const drive = texto.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (drive) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(drive[1])}&sz=w1600`;
  const url = seguro(texto);
  return url === "#" ? "" : url;
}
