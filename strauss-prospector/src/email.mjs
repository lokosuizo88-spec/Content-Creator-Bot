import { PROBLEMAS } from "./audit.mjs";

/** Email personalizado con los problemas detectados y la solución. Sin IA: determinista y siempre disponible. */
export function redactarEmail(neg, audit, demoUrl) {
  const fl = audit.flags.filter((f) => PROBLEMAS[f]).sort((a, b) => PROBLEMAS[b].pts - PROBLEMAS[a].pts).slice(0, 4);
  const extra = [];
  if (audit.info.chatbot) extra.push(`He visto que usáis ${audit.info.chatbot} en la web.`);
  const items = fl.map((f) => `• ${PROBLEMAS[f].problema}\n  → ${PROBLEMAS[f].solucion}`).join("\n\n");
  return `Asunto: He revisado la web de ${neg.nombre} (y te he preparado algo)

Hola, equipo de ${neg.nombre}:

Soy Diego, de Strauss Digital. Os encontré en Google (${neg.nota}★ con ${neg.resenas} reseñas, muy buen trabajo) y revisé vuestra web ${neg.web || ""}. ${extra.join(" ")}

Esto es lo que he visto:

${items}

${demoUrl ? `Para que lo veáis sin compromiso, he montado una maqueta con vuestra identidad: ${demoUrl}\n\n` : ""}¿Os va bien una llamada de 10 minutos esta semana para enseñároslo?

Un saludo,
Diego · Strauss Digital
`;
}
