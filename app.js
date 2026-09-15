const placeDatabase = [
  { country: "Finland", cities: ["Helsinki","Espoo","Vantaa","Tampere","Turku","Oulu","Jyväskylä","Kuopio","Lahti","Pori","Vaasa","Rovaniemi"], aliases: ["finland","suomi","finnish","suomalainen"] },
  { country: "Sweden", cities: ["Stockholm","Göteborg","Gothenburg","Malmö","Uppsala","Västerås"], aliases: ["sweden","sverige","swedish","svenska"] },
  { country: "Estonia", cities: ["Tallinn","Tartu","Pärnu"], aliases: ["estonia","eesti","estonian"] },
  { country: "Norway", cities: ["Oslo","Bergen","Trondheim","Stavanger"], aliases: ["norway","norge","norwegian"] },
  { country: "Denmark", cities: ["Copenhagen","København","Aarhus","Odense"], aliases: ["denmark","danmark","danish"] },
  { country: "Germany", cities: ["Berlin","Hamburg","Munich","München","Cologne","Köln","Frankfurt"], aliases: ["germany","deutschland","german"] },
  { country: "United Kingdom", cities: ["London","Manchester","Birmingham","Liverpool","Glasgow","Edinburgh"], aliases: ["uk","united kingdom","england","britain","british"] },
  { country: "United States", cities: ["New York","Los Angeles","Chicago","Miami","Seattle","Boston","Austin"], aliases: ["usa","united states","america","american"] }
];

const flagFor = {
  "Finland":"🇫🇮","Sweden":"🇸🇪","Estonia":"🇪🇪","Norway":"🇳🇴","Denmark":"🇩🇰",
  "Germany":"🇩🇪","United Kingdom":"🇬🇧","United States":"🇺🇸"
};

function normalizeText(value = "") {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}#@.\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function occurrences(haystack, needle) {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

function cleanUsername(value) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}

function analyzeSignals(text) {
  const normalized = normalizeText(text);
  const countryScores = [];
  const foundSignals = [];

  for (const place of placeDatabase) {
    let score = 0;
    const reasons = [];
    let bestCity = null;
    let bestCityScore = 0;

    for (const alias of place.aliases) {
      const a = normalizeText(alias);
      const count = occurrences(normalized, a);
      if (count > 0) {
        const points = count * 3;
        score += points;
        reasons.push({ label: alias, points, type: "country" });
      }
    }

    for (const city of place.cities) {
      const c = normalizeText(city);
      const count = occurrences(normalized, c);
      if (count > 0) {
        const points = count * 5;
        score += points;
        reasons.push({ label: city, points, type: "city" });
        if (points > bestCityScore) {
          bestCity = city;
          bestCityScore = points;
        }
      }
    }

    if (score > 0) {
      countryScores.push({
        country: place.country,
        score,
        city: bestCity,
        reasons
      });
      reasons.forEach(r => foundSignals.push({
        location: bestCity || place.country,
        country: place.country,
        ...r
      }));
    }
  }

  countryScores.sort((a,b) => b.score - a.score);
  foundSignals.sort((a,b) => b.points - a.points);

  return { countryScores, foundSignals };
}

function confidenceFor(topScore, totalScore, signalCount) {
  if (!topScore || !totalScore) return 0;
  const dominance = topScore / totalScore;
  const signalBonus = Math.min(18, signalCount * 4);
  return Math.min(96, Math.max(28, Math.round(dominance * 72 + signalBonus)));
}

function render() {
  const usernameRaw = document.getElementById("username").value;
  const profileUrl = document.getElementById("profileUrl").value.trim();
  const bio = document.getElementById("bio").value.trim();
  const posts = document.getElementById("posts").value.trim();

  const username = cleanUsername(usernameRaw || profileUrl);
  const combined = [bio, posts, profileUrl].join("\n");

  const results = document.getElementById("results");
  const profileName = document.getElementById("profileName");
  const avatar = document.getElementById("avatar");
  const profileUrlText = document.getElementById("profileUrlText");

  results.classList.remove("hidden");
  profileName.textContent = username ? `@${username}` : "@tuntematon";
  avatar.textContent = username ? username[0].toUpperCase() : "?";
  profileUrlText.textContent = profileUrl || (username ? `https://www.tiktok.com/@${username}` : "");

  const { countryScores, foundSignals } = analyzeSignals(combined);

  const topLocation = document.getElementById("topLocation");
  const confidenceValue = document.getElementById("confidenceValue");
  const confidenceBar = document.getElementById("confidenceBar");
  const confidenceText = document.getElementById("confidenceText");
  const scoreRing = document.querySelector(".score-ring");
  const signals = document.getElementById("signals");
  const signalCount = document.getElementById("signalCount");
  const alternatives = document.getElementById("alternatives");

  signals.innerHTML = "";
  alternatives.innerHTML = "";

  if (!countryScores.length) {
    topLocation.textContent = "Ei riittäviä vihjeitä";
    confidenceValue.textContent = "0%";
    confidenceBar.style.width = "0%";
    scoreRing.style.setProperty("--score", "0%");
    confidenceText.textContent = "Lisää bio- tai julkaisutekstiä, jossa on julkisia maa-, kaupunki- tai paikkaviitteitä.";
    signalCount.textContent = "0";
    signals.innerHTML = `<div class="empty">Sijaintivihjeitä ei löytynyt.</div>`;
    alternatives.innerHTML = `<div class="empty">Ei vaihtoehtoisia sijainteja.</div>`;
    return;
  }

  const totalScore = countryScores.reduce((sum, item) => sum + item.score, 0);
  const top = countryScores[0];
  const confidence = confidenceFor(top.score, totalScore, foundSignals.length);
  const displayLocation = top.city ? `${top.city}, ${top.country}` : top.country;

  topLocation.textContent = `${flagFor[top.country] || "📍"} ${displayLocation}`;
  confidenceValue.textContent = `${confidence}%`;
  confidenceBar.style.width = `${confidence}%`;
  scoreRing.style.setProperty("--score", `${confidence}%`);
  confidenceText.textContent =
    confidence >= 80
      ? "Useita julkisia vihjeitä tukee samaa sijaintiarviota."
      : confidence >= 55
      ? "Arvio on kohtalainen, mutta lisävihjeet parantaisivat luotettavuutta."
      : "Arvio on heikko ja sitä kannattaa käsitellä vain suuntaa-antavana.";

  const uniqueSignals = [];
  const seen = new Set();

  for (const s of foundSignals) {
    const key = `${s.country}|${s.label}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSignals.push(s);
    }
  }

  signalCount.textContent = String(uniqueSignals.length);

  uniqueSignals.slice(0, 8).forEach(s => {
    const row = document.createElement("div");
    row.className = "signal";
    row.innerHTML = `
      <div class="signal-icon">${s.type === "city" ? "⌖" : "◎"}</div>
      <div>
        <strong>${s.label}</strong>
        <small>${s.type === "city" ? "Kaupunkiviite" : "Maa- tai kieliviite"} • ${s.country}</small>
      </div>
    `;
    signals.appendChild(row);
  });

  const altItems = countryScores.slice(1, 5);
  if (!altItems.length) {
    alternatives.innerHTML = `<div class="empty">Muita vahvoja sijaintivaihtoehtoja ei löytynyt.</div>`;
  } else {
    altItems.forEach(item => {
      const pct = Math.max(1, Math.round((item.score / totalScore) * 100));
      const loc = item.city ? `${item.city}, ${item.country}` : item.country;
      const row = document.createElement("div");
      row.className = "alt-row";
      row.innerHTML = `
        <div>${flagFor[item.country] || "📍"} ${loc}</div>
        <div class="alt-percent">${pct}%</div>
      `;
      alternatives.appendChild(row);
    });
  }

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.getElementById("analyzeBtn").addEventListener("click", render);

document.getElementById("demoBtn").addEventListener("click", () => {
  document.getElementById("username").value = "demo.traveller";
  document.getElementById("profileUrl").value = "https://www.tiktok.com/@demo.traveller";
  document.getElementById("bio").value = "Photographer based in Helsinki, Finland.";
  document.getElementById("posts").value =
    "#helsinki evening walk. Weekend in Tampere. Back home in Helsinki tomorrow. #finland";
  document.querySelector(".advanced").open = true;
});

document.getElementById("profileUrl").addEventListener("input", (e) => {
  const usernameField = document.getElementById("username");
  if (!usernameField.value.trim()) {
    const u = cleanUsername(e.target.value);
    if (u) usernameField.value = u;
  }
});
