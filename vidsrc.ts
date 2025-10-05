async function tmdbScrape(tmdbId: string, type: "movie" | "tv", season?: number, episode?: number) {
  const vidsrcBase = "https://vidsrc.me";
  const embedPath = type === "movie" ? `/embed/movie/${tmdbId}` : `/embed/tv/${tmdbId}/${season}/${episode}`;
  const embedUrl = `${vidsrcBase}${embedPath}`;

  const response = await fetch(embedUrl);
  const html = await response.text();

  const sources: { name: string; image: string; mediaId: string; stream: string }[] = [];

  const sourceRegex = /<source src="([^"]+\.m3u8)"[^>]*>/g;
  let match;
  while ((match = sourceRegex.exec(html)) !== null) {
    sources.push({
      name: "Vidsrc Stream",
      image: "",
      mediaId: tmdbId,
      stream: match[1]
    });
  }

  return sources;
}

export default tmdbScrape;
