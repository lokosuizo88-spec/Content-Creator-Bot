export async function buscar(sector, zona, max) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("falta GOOGLE_PLACES_API_KEY");
  const out = [];
  let pageToken;
  do {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.displayName,places.websiteUri,places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,nextPageToken",
      },
      body: JSON.stringify({ textQuery: `${sector} en ${zona}`, languageCode: "es", pageSize: 20, ...(pageToken && { pageToken }) }),
    });
    if (!r.ok) throw new Error(`Places ${r.status}: ${await r.text()}`);
    const d = await r.json();
    for (const p of d.places ?? [])
      out.push({
        nombre: p.displayName?.text,
        web: p.websiteUri,
        nota: p.rating ?? 0,
        resenas: p.userRatingCount ?? 0,
        direccion: p.formattedAddress,
        telefono: p.nationalPhoneNumber,
      });
    pageToken = d.nextPageToken;
  } while (pageToken && out.length < max);
  return out.slice(0, max);
}
