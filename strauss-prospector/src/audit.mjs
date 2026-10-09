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
  sin_web: {
    pts: 6,
    problema: "No he encontrado una web propia enlazada en vuestra ficha de Google: quien os busca no puede ver tratamientos, precios ni pedir cita.",
    solucion: "Una web propia sencilla y rápida, con tratamientos, reseñas reales y reserva online, enlazada desde Google Maps.",
  },
  web_caida: {
    pts: 5,
    problema: "Durante esta comprobación, el enlace de vuestra web devolvió un error o no llegó a cargar.",
    solucion: "Revisaría la causa del error y las opciones para recuperar el acceso estable a la web.",
  },
  lenta: {
    pts: 3,
    problema: "En esta comprobación, la respuesta de la web tardó más de 4 segundos.",
    solucion: "Revisaría los tiempos de carga y las mejoras posibles en imágenes y código.",
  },
  un_idioma: {
    pts: 2,
    problema: "No detecté enlaces a versiones en otros idiomas en la página revisada.",
    solucion: "Si atendéis en varios idiomas, podría preparar versiones adaptadas de las páginas principales.",
  },
  sin_reserva: {
    pts: 3,
    problema: "No encontré una opción clara para reservar cita online en la página revisada.",
    solucion: "Podría incorporar una reserva online visible y ajustada a vuestro proceso de citas.",
  },
  sin_chatbot: {
    pts: 1,
    problema: "No detecté un asistente de consultas en la página revisada.",
    solucion: "Podría valorar con vosotros si un asistente para preguntas frecuentes aportaría utilidad.",
  },
  antigua: {
    pts: 2,
    problema: "La página revisada no indica adaptación a móviles o usa maquetación HTML antigua.",
    solucion: "Podría rehacerla con un diseño adaptado a móvil y pensado para conseguir citas.",
  },
  tema_stock: {
    pts: 2,
    problema: "La página revisada incluye referencias a imágenes de banco o a una plantilla estándar.",
    solucion: "Podría dar más protagonismo a fotografías y contenidos propios del centro.",
  },
  constructor: {
    pts: 1,
    problema: "La página revisada parece estar creada con un constructor web.",
    solucion: "Revisaría si la plataforma actual permite las mejoras de diseño y contenido que necesitáis.",
  },
  kit_digital: {
    pts: 2,
    problema: "La página revisada menciona Kit Digital o financiación europea.",
    solucion: "Podría revisar con vosotros si la web actual cumple los objetivos que buscáis.",
  },
  visual_generica: { pts: 2, problema: "Visualmente, la página revisada se parece a muchas otras del sector y destaca poco.", solucion: "Podría proponer una dirección visual propia que refleje el nivel del centro." },
  visual_anticuada: { pts: 2, problema: "El aspecto visual de la página revisada (tipografías, banners, estructura) parece de hace años.", solucion: "Podría proponer un rediseño actual con jerarquía clara y llamadas a la acción visibles." },
  visual_rota: { pts: 3, problema: "En la revisión vi elementos visuales que fallaban (imágenes que no cargaban o secciones desalineadas).", solucion: "Revisaría y corregiría esos elementos para que la web se vea completa." },
  chatbot_mal: {
    pts: 3,
    problema: "En la revisión, el asistente de la web no pareció responder bien (sin respuesta, en otro idioma o sin ofrecer cita).",
    solucion: "Podría revisar su configuración con vuestros datos para que oriente hacia la cita.",
  },
};

export async function auditar(neg, { visual } = {}) {
  const flags = [];
  const info = { chatbot: null, reserva: false, idiomas: 1 };
  if (!neg.web) return { flags: ["sin_web"], pts: PROBLEMAS.sin_web.pts, info, motivo: "sin web" };
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
