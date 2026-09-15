const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function cleanUsername(value="") {
  return String(value)
    .trim()
    .replace(/^@/, "")
    .replace(/[^A-Za-z0-9._]/g, "")
    .slice(0, 64);
}

function findScriptJson(html, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`, "i");
  const m = html.match(re);
  if (!m) return null;

  let txt = m[1].trim();
  txt = txt.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  try { return JSON.parse(txt); } catch { return null; }
}

function deepFindUserInfo(obj) {
  if (!obj || typeof obj !== "object") return null;

  const direct = obj?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
  if (direct?.user) return direct;

  const userModule = obj?.UserModule;
  if (userModule?.users) {
    const users = Object.values(userModule.users);
    if (users.length) {
      const user = users[0];
      let stats = null;
      if (userModule.stats) {
        stats = Object.values(userModule.stats)[0] || null;
      }
      return {user, stats};
    }
  }

  return null;
}

function regexFallback(html) {
  const blockMatch = html.match(/webapp\.user-detail[\s\S]{0,250000}/i);
  const block = blockMatch ? blockMatch[0] : html;

  function str(name) {
    const m = block.match(new RegExp(`"${name}"\\s*:\\s*"([^"]*)"`, "i"));
    return m ? m[1] : null;
  }
  function num(name) {
    const m = block.match(new RegExp(`"${name}"\\s*:\\s*(\\d+)`, "i"));
    return m ? Number(m[1]) : null;
  }
  function bool(name) {
    const m = block.match(new RegExp(`"${name}"\\s*:\\s*(true|false)`, "i"));
    return m ? m[1] === "true" : null;
  }

  const user = {
    id: str("id"),
    uniqueId: str("uniqueId"),
    nickname: str("nickname"),
    signature: str("signature"),
    avatarLarger: str("avatarLarger"),
    avatarMedium: str("avatarMedium"),
    secUid: str("secUid"),
    region: str("region"),
    language: str("language"),
    createTime: num("createTime"),
    privateAccount: bool("privateAccount"),
    verified: bool("verified")
  };

  const stats = {
    followerCount: num("followerCount"),
    followingCount: num("followingCount"),
    heartCount: num("heartCount") ?? num("heart"),
    videoCount: num("videoCount")
  };

  if (!user.uniqueId && !user.id) return null;
  return {user, stats};
}

async function fetchOEmbed(username) {
  const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
  const url = `https://www.tiktok.com/oembed?url=${encodeURIComponent(profileUrl)}`;
  const r = await fetch(url, {headers:{"User-Agent":UA,"Accept":"application/json"}});
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

async function fetchProfileHtml(username) {
  const url = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
  const r = await fetch(url, {
    redirect:"follow",
    headers:{
      "User-Agent":UA,
      "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language":"en-US,en;q=0.9",
      "Cache-Control":"no-cache",
      "Pragma":"no-cache"
    }
  });

  if (!r.ok) throw new Error(`TikTok returned HTTP ${r.status}`);
  return await r.text();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    return res.status(405).json({error:"Vain GET-pyyntö on sallittu."});
  }

  const username = cleanUsername(req.query.username);
  if (!username) {
    return res.status(400).json({error:"Virheellinen TikTok-käyttäjänimi."});
  }

  try {
    const [html, oembed] = await Promise.all([
      fetchProfileHtml(username),
      fetchOEmbed(username).catch(() => null)
    ]);

    const universal = findScriptJson(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
    const sigi = findScriptJson(html, "SIGI_STATE") || findScriptJson(html, "sigi-persisted-data");

    let info =
      deepFindUserInfo(universal) ||
      deepFindUserInfo(sigi) ||
      regexFallback(html);

    if (!info?.user) {
      if (oembed) {
        return res.status(200).json({
          source:"TikTok oEmbed fallback",
          user:{
            uniqueId:username,
            nickname:oembed.author_name || username,
            region:null,
            language:null,
            signature:null,
            avatar:null
          },
          stats:{},
          warning:"TikTok ei palauttanut profiilisivun region-dataa tällä haulla."
        });
      }
      return res.status(404).json({
        error:"Julkista profiilidataa ei löytynyt. Tili voi olla yksityinen, poistettu tai TikTok esti automaattisen haun."
      });
    }

    const u = info.user || {};
    const s = info.stats || info.statsV2 || {};

    return res.status(200).json({
      source:"TikTok public profile HTML",
      user:{
        id:u.id ?? null,
        secUid:u.secUid ?? null,
        uniqueId:u.uniqueId ?? username,
        nickname:u.nickname ?? oembed?.author_name ?? username,
        signature:u.signature ?? null,
        avatar:u.avatarLarger ?? u.avatarMedium ?? u.avatarThumb ?? null,
        region:u.region ?? null,
        language:u.language ?? null,
        createTime:u.createTime ?? null,
        privateAccount:u.privateAccount ?? null,
        verified:u.verified ?? null
      },
      stats:{
        followerCount:s.followerCount ?? null,
        followingCount:s.followingCount ?? null,
        heartCount:s.heartCount ?? s.heart ?? null,
        videoCount:s.videoCount ?? null
      }
    });

  } catch (err) {
    return res.status(502).json({
      error:"TikTok-profiilin haku epäonnistui. TikTok voi hetkellisesti estää automaattisia pyyntöjä.",
      detail:String(err?.message || err)
    });
  }
}
