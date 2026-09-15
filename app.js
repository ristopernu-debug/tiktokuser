const places = [
  { country: "Finland", cities: ["Helsinki","Espoo","Vantaa","Tampere","Turku","Oulu","Jyväskylä","Kuopio","Lahti","Vaasa","Rovaniemi"], aliases: ["finland","suomi","finnish","suomalainen"] },
  { country: "Sweden", cities: ["Stockholm","Göteborg","Gothenburg","Malmö","Uppsala"], aliases: ["sweden","sverige","swedish","svenska"] },
  { country: "Estonia", cities: ["Tallinn","Tartu","Pärnu"], aliases: ["estonia","eesti","estonian"] },
  { country: "Norway", cities: ["Oslo","Bergen","Trondheim"], aliases: ["norway","norge","norwegian"] },
  { country: "Denmark", cities: ["Copenhagen","København","Aarhus"], aliases: ["denmark","danmark","danish"] },
  { country: "Germany", cities: ["Berlin","Hamburg","Munich","München","Frankfurt"], aliases: ["germany","deutschland","german"] },
  { country: "United Kingdom", cities: ["London","Manchester","Birmingham","Liverpool"], aliases: ["uk","united kingdom","england","britain","british"] },
  { country: "United States", cities: ["New York","Los Angeles","Chicago","Miami","Seattle","Boston"], aliases: ["usa","united states","america","american"] }
];

const flags = {
  Finland:"🇫🇮", Sweden:"🇸🇪", Estonia:"🇪🇪", Norway:"🇳🇴",
  Denmark:"🇩🇰", Germany:"🇩🇪", "United Kingdom":"🇬🇧", "United States":"🇺🇸"
};

function norm(s="") {
  return s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s#@.-]/gu, " ");
}

function analyzeText(text) {
  const t = norm(text);
  const scores = [];

  for (const p of places) {
    let score = 0;
    let bestCity = null;
    const hits = [];

    for (const alias of p.aliases) {
      if (t.includes(norm(alias))) {
        score += 3;
        hits.push(alias);
      }
    }

    for (const city of p.cities) {
      if (t.includes(norm(city))) {
        score += 5;
        bestCity = city;
        hits.push(city);
      }
    }

    if (score > 0) scores.push({ ...p, score, bestCity, hits });
  }

  scores.sort((a,b) => b.score - a.score);
  return scores;
}

document.getElementById("analyzeBtn").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const bio = document.getElementById("bio").value.trim();

  const result = document.getElementById("result");
  const location = document.getElementById("location");
  const confidence = document.getElementById("confidence");
  const reason = document.getElementById("reason");

  result.classList.remove("hidden");

  if (!username && !bio) {
    location.textContent = "Ei tietoa";
    confidence.textContent = "";
    reason.textContent = "Syötä käyttäjänimi tai lisää julkisia vihjeitä.";
    return;
  }

  const scores = analyzeText(bio);

  if (!scores.length) {
    location.textContent = "Ei vielä tietoa";
    confidence.textContent = "";
    reason.textContent = "Tämä versio ei vielä hae TikTok-profiilin tietoja automaattisesti. Lisää julkisia vihjeitä käsin.";
    return;
  }

  const total = scores.reduce((sum, x) => sum + x.score, 0);
  const top = scores[0];
  const pct = Math.min(95, Math.round((top.score / total) * 100));
  const name = top.bestCity ? `${top.bestCity}, ${top.country}` : top.country;

  location.textContent = `${flags[top.country] || "📍"} ${name}`;
  confidence.textContent = `Arvio ${pct} %`;
  reason.textContent = `Perustuu vihjeisiin: ${[...new Set(top.hits)].join(", ")}`;
});
