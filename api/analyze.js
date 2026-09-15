const COUNTRIES = [
  { name:"Finland", fi:"Suomi", flag:"🇫🇮", terms:["finland","suomi","finnish","helsinki","espoo","vantaa","tampere","turku","oulu","rovaniemi"] },
  { name:"Sweden", fi:"Ruotsi", flag:"🇸🇪", terms:["sweden","sverige","swedish","stockholm","göteborg","gothenburg","malmö","uppsala"] },
  { name:"Estonia", fi:"Viro", flag:"🇪🇪", terms:["estonia","eesti","estonian","tallinn","tartu","pärnu"] },
  { name:"Norway", fi:"Norja", flag:"🇳🇴", terms:["norway","norge","norwegian","oslo","bergen","trondheim"] },
  { name:"Denmark", fi:"Tanska", flag:"🇩🇰", terms:["denmark","danmark","danish","copenhagen","københavn","aarhus"] },
  { name:"Germany", fi:"Saksa", flag:"🇩🇪", terms:["germany","deutschland","german","berlin","hamburg","münchen","munich","frankfurt"] },
  { name:"United Kingdom", fi:"Yhdistynyt kuningaskunta", flag:"🇬🇧", terms:["united kingdom","england","britain","british","london","manchester","birmingham","liverpool"] },
  { name:"United States", fi:"Yhdysvallat", flag:"🇺🇸", terms:["united states","usa","american","new york","los angeles","chicago","miami","seattle","boston"] },
  { name:"France", fi:"Ranska", flag:"🇫🇷", terms:["france","french","paris","lyon","marseille"] },
  { name:"Spain", fi:"Espanja", flag:"🇪🇸", terms:["spain","españa","spanish","madrid","barcelona","valencia"] },
  { name:"Italy", fi:"Italia", flag:"🇮🇹", terms:["italy","italia","italian","rome","roma","milan","milano"] },
  { name:"Netherlands", fi:"Alankomaat", flag:"🇳🇱", terms:["netherlands","nederland","dutch","amsterdam","rotterdam"] },
  { name:"Poland", fi:"Puola", flag:"🇵🇱", terms:["poland","polska","polish","warsaw","warszawa","krakow","kraków"] }
];

function normalize(s="") {
  return s.toLowerCase().normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s#@.,-]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

function inferCountry(text="") {
  const t = normalize(text);
  if (!t) {
    return { country:null, flag:null, confidence:0,
      reason:"Julkisesta profiilista ei saatu maahan viittaavaa tietoa." };
  }

  const scored = COUNTRIES.map(c => {
    const hits = c.terms.filter(term => t.includes(normalize(term)));
    return { ...c, score:hits.length, hits };
  }).filter(x => x.score > 0).sort((a,b) => b.score - a.score);

  if (!scored.length) {
    return { country:null, flag:null, confidence:0,
      reason:"Julkisessa profiilissa ei ole riittävän selvää maaviitettä." };
  }

  const top = scored[0];
  const total = scored.reduce((n,x)=>n+x.score,0);
  const confidence = Math.min(95, Math.max(45, Math.round((top.score/total)*80 + Math.min(15, top.score*5))));

  return {
    country: top.fi,
    flag: top.flag,
    confidence,
    reason:`Arvio perustuu julkisen profiilin vihjeisiin: ${top.hits.join(", ")}.`
  };
}

async function getOEmbed(username) {
  const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
  const url = `https://www.tiktok.com/oembed?url=${encodeURIComponent(profileUrl)}`;
  const r = await fetch(url, {
    headers: { "User-Agent":"Mozilla/5.0 TikTokLocation/1.0" }
  });
  if (!r.ok) throw new Error("TikTok-profiilia ei löytynyt tai sitä ei voi upottaa.");
  return await r.json();
}

async function getResearchProfile(username) {
  const token = process.env.TIKTOK_RESEARCH_ACCESS_TOKEN;
  if (!token) return null;

  const fields = [
    "username","display_name","bio_description","avatar_url",
    "is_verified","follower_count","following_count","likes_count","video_count","bio_url"
  ].join(",");

  const r = await fetch(
    `https://open.tiktokapis.com/v2/research/user/info/?fields=${encodeURIComponent(fields)}`,
    {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({username})
    }
  );

  if (!r.ok) return null;
  const json = await r.json();
  if (json?.error?.code && json.error.code !== "ok") return null;
  return json?.data || null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({error:"Vain GET-pyyntö on sallittu."});
  }

  let username = String(req.query.username || "").trim()
    .replace(/^@/,"")
    .replace(/[^A-Za-z0-9._]/g,"");

  if (!username || username.length > 64) {
    return res.status(400).json({error:"Virheellinen TikTok-käyttäjänimi."});
  }

  try {
    const profileUrl = `https://www.tiktok.com/@${username}`;
    const [oembed, research] = await Promise.all([
      getOEmbed(username),
      getResearchProfile(username)
    ]);

    const displayName =
      research?.display_name ||
      oembed?.author_name ||
      username;

    const bio =
      research?.bio_description ||
      "";

    // Official oEmbed can verify a public profile but normally does not expose the bio.
    // If Research API access is configured, the bio is used for the coarse country estimate.
    const location = inferCountry([displayName, bio].join(" "));

    if (!research && !location.country) {
      location.reason =
        "Profiili löytyi, mutta TikTokin julkinen oEmbed ei paljasta bioa tai käyttäjän maata. " +
        "Tarkempi automaattinen arvio vaatii TikTok Research API -käyttöoikeuden.";
    }

    return res.status(200).json({
      profile:{
        username,
        displayName,
        url:profileUrl,
        avatarUrl:research?.avatar_url || null,
        verified:research?.is_verified ?? null,
        source:research ? "TikTok Research API + oEmbed" : "TikTok oEmbed"
      },
      location,
      limitations:{
        exactLocation:false,
        realtimeLocation:false,
        ipAddress:false
      }
    });
  } catch (e) {
    return res.status(404).json({
      error:e?.message || "Profiilia ei löytynyt."
    });
  }
}
