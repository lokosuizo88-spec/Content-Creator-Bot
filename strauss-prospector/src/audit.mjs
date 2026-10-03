import { fetchText } from "./util.mjs";
import { paginaRenderizada } from "./brand.mjs";

const CHATBOTS = {
  Tidio: /code\.tidio\.co|tidiochat/i,
  Intercom: /widget\.intercom\.io|intercomSettings/i,
  Drift: /js\.driftt\.com|drift\.com\/include/i,
  Crisp: /client\.crisp\.chat|\$crisp/i,
  Tawk: /embed\.tawk\.to/i,
  Landbot: /landbot\.io|landbot\.online/i,
  ManyChat: /manychat\.com/i,
  Zendesk: /static\.zdassets\.com|zopim/i,
  HubSpot: /js\.hs-scripts\.com|hubspot\.com\/conversations/i,
  "Botpress/Voiceflow": /botpress|voiceflow/i,
  "WhatsApp (widget)": /wa\.me\/|api\.whatsapp\.com\/send|elfsight.*whatsapp|joinchat/i,
};
const BOOKING =
  /doctoralia|calendly|treatwell|simplybook|appointlet|acuity|setmore|reservio|booksy|fresha|agenda|reserva(r)?\s*(tu\s*)?cita|pedir\s*cita|solicitar\s*cita|book\s*(an\s*)?appointment|cita\s*online|cita\s*previa/i;
const STOCK = /(unsplash|pexels|shutterstock|istockphoto|freepik|pixabay)\.com|\/themes\/(flatsome|avada|divi|astra|oceanwp)\//i;
const BUILDERS = /wix\.com|wixstatic|squarespace|weebly|jimdo|godaddysites|webnode/i;
const KIT_DIGITAL = /kit\s*digital|next\s*generation|financiado\s*por\s*la\s*uni[oó]n\s*europea/i;

/** Textos para el email: problema + solución. */
export const PROBLEMAS = {
  web_caida: {
    pts: 5,
    problema: "Tu web no carga o devuelve errores, así que quien te busca en Google se va a la competencia.",
    solucion: "Te dejo la web operativa y estable en un hosting rápido, con monitorización para avisarnos si vuelve a caerse.",
  },
  lenta: {
    pts: 3,
    problema: "La web tarda más de 4 segundos en responder; más de la mitad de las visitas móviles abandona antes.",
    solucion: "Reconstruyo la web optimizando imágenes y código para que cargue en menos de 2 segundos.",
  },
  un_idioma: {
    pts: 2,
    problema: "La web solo está en un idioma, y en Mallorca buena parte de tus clientes potenciales son turistas y residentes extranjeros.",
    solucion: "Versión multilingüe (ES/EN/DE) con textos adaptados, no traducciones automáticas.",
  },
  sin_reserva: {
    pts: 3,
    problema: "No hay forma de reservar cita online: el paciente tiene que llamar y muchos no lo hacen fuera de horario.",
    solucion: "Sistema de reserva online integrado en la web, con recordatorios automáticos por WhatsApp/email.",
  },
  sin_chatbot: {
    pts: 1,
    problema: "No tienes un asistente que atienda las consultas cuando la clínica está cerrada.",
    solucion: "Un chatbot entrenado con tus tratamientos y precios que responde en varios idiomas y deriva a cita.",
  },
  antigua: {
    pts: 2,
    problema: "El diseño de la web se ve anticuado y no refleja la calidad del centro; en móvil se ve mal.",
    solucion: "Rediseño moderno, responsive y centrado en conseguir citas. Te preparé una demo con tu identidad.",
  },
  tema_stock: {
    pts: 2,
    problema: "La web usa una plantilla genérica con imágenes de banco que no muestran tu equipo ni tu centro reales.",
    solucion: "Diseño propio con tus fotos, tus tratamientos y tu forma de trabajar.",
  },
  constructor: {
    pts: 1,
    problema: "La web está en un constructor básico (Wix/Squarespace…) con poco margen de SEO y personalización.",
    solucion: "Web propia, más rápida y optimizada para aparecer en Google Maps y búsquedas locales.",
  },
  kit_digital: {
    pts: 2,
    problema: "La web parece hecha vía Kit Digital: suele ser una plantilla mínima sin optimización real.",
    solucion: "Una web pensada para convertir visitas en citas, no solo para cumplir la subvención.",
  },
  visual_generica: { pts: 2, problema: "A nivel visual la web transmite poco: no destaca frente a otras clínicas de la zona.", solucion: "Dirección visual propia que refleje el nivel real del centro." },
  visual_anticuada: { pts: 2, problema: "El aspecto visual es de hace años (tipografías, banners, estructura).", solucion: "Rediseño actual con jerarquía clara y llamadas a la acción visibles." },
  visual_rota: { pts: 3, problema: "Hay elementos visuales rotos (imágenes que no cargan, secciones desalineadas).", solucion: "Reconstrucción limpia sin errores en móvil ni escritorio." },
  chatbot_mal: {
    pts: 3,
    problema: "Tienes un chatbot instalado pero no responde bien (no contesta, no habla el idioma del cliente o no ofrece cita).",
    solucion: "Reconfiguro el chatbot con tus datos reales y un flujo que termina en una cita.",
  },
};

export async function auditar(neg, { visual } = {}) {
  const flags = [];
  const info = { chatbot: null, reserva: false, idiomas: 1 };
  if (!neg.web) return { flags: ["web_caida"], pts: PROBLEMAS.web_caida.pts, info, motivo: "sin web" };
  let r = await fetchText(neg.web);
  if (!r.ok || r.html.length < 500) {
    // 403/anti-bot no significa web caída: reintentar con navegador real
    const rr = await paginaRenderizada(neg.web);
    if (rr.ok && rr.html.length >= 500) r = rr;
  }
  if (!r.ok || r.html.length < 500) return { flags: ["web_caida"], pts: PROBLEMAS.web_caida.pts, info, motivo: r.error || `HTTP ${r.status}` };
  const h = r.html;
  if (r.ms > 4000) flags.push("lenta");
  const langs = new Set([...h.matchAll(/hreflang=["']([a-z]{2})/gi)].map((m) => m[1].toLowerCase()));
  info.idiomas = Math.max(1, langs.size);
  if (langs.size < 2 && !/\/(en|de)\/|lang=en|googtrans/i.test(h)) flags.push("un_idioma");
  info.reserva = BOOKING.test(h);
  if (!info.reserva) flags.push("sin_reserva");
  for (const [n, re] of Object.entries(CHATBOTS)) if (re.test(h)) { info.chatbot = n; break; }
  if (!info.chatbot) flags.push("sin_chatbot");
  if (STOCK.test(h)) flags.push("tema_stock");
  if (BUILDERS.test(h)) flags.push("constructor");
  if (KIT_DIGITAL.test(h)) flags.push("kit_digital");
  if (!/viewport/i.test(h) || /<table[^>]+width=|<font |<marquee|<center>/i.test(h)) flags.push("antigua");
  if (visual) {
    try { for (const f of await visual(neg)) if (PROBLEMAS[f] && !flags.includes(f)) flags.push(f); } catch (e) { info.visual_error = e.message; }
  }
  return { flags, pts: flags.reduce((s, f) => s + (PROBLEMAS[f]?.pts ?? 0), 0), info };
}
