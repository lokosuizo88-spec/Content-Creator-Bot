import { PROBLEMAS } from "./audit.mjs";

/** Email personalizado con los problemas detectados y la solución. Sin IA: determinista y siempre disponible. */
export function redactarEmail(neg, audit, demoUrl) {
  const nombre = neg.nombre.trim().replace(/[.\s]+$/, "");
  const fl = audit.flags.filter((f) => PROBLEMAS[f]).sort((a, b) => PROBLEMAS[b].pts - PROBLEMAS[a].pts).slice(0, 4);
  const extra = [];
  if (audit.info.chatbot === "WhatsApp (widget)") extra.push("He visto un enlace o integración de WhatsApp en la página revisada.");
  else if (audit.info.chatbot) extra.push(`He visto que usáis ${audit.info.chatbot} en la web.`);
  const items = fl.map((f) => `• ${PROBLEMAS[f].problema}\n  → ${PROBLEMAS[f].solucion}`).join("\n\n");
  return `Asunto: He revisado la web de ${nombre}${demoUrl ? " (y te he preparado algo)" : ""}

Hola, equipo de ${nombre}:

Soy Diego, de Strauss Digital. Os encontré en Google (${neg.nota}★ con ${neg.resenas} reseñas, muy buen trabajo) ${neg.web ? `y revisé vuestra web ${neg.web}.` : "y vi que no tenéis web propia enlazada."} ${extra.join(" ")}

Esto es lo que he visto:

${items}

${demoUrl ? `Para que lo veáis sin compromiso, he montado una maqueta con vuestra identidad: ${demoUrl}\n\n` : ""}¿Os va bien una llamada de 10 minutos esta semana para enseñároslo?

Un saludo,
Diego · Strauss Digital
`;
}

const csv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** CSV para combinar correspondencia: una fila por email, con su destinatario y la demo si se publicó. */
export function envioCsv(filas) {
  const lineas = filas.map(({ para, email, demo }) => {
    const m = email.match(/^Asunto: (.*)\r?\n\r?\n([\s\S]*)$/);
    return [para, m ? m[1] : "", m ? m[2].trim() : email, demo].map(csv).join(",");
  });
  const fin = "\r\n";
  return String.fromCharCode(0xfeff) + "para,asunto,cuerpo,demo" + fin + lineas.map((l) => l + fin).join("");
}
