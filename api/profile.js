const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function cleanUsername(value = "") {
  return String(value)
    .trim()
    .replace(/^@/, "")
    .replace(/[^A-Za-z0-9._]/g, "")
    .slice(0, 64);
}

function readJsonScript(html, id) {
  const safe = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(`<script[^>]+id=["']${safe}["'][^>]*>([\\s\\S]*?)<\\/script>`, "i")
  );
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
}

function findUserInfo(data) {
  if (!data || typeof data !== "object") return null;

  const detail = data?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
  if (detail?.user) return detail;

  if (data?.UserModule?.users) {
    const user = Object.values(data.UserModule.users)[0];
    const stats = data.UserModule.stats
      ? Object.values(data.UserModule.stats)[0]
      : null;
    if (user) return { user, stats };
  }
  return null;
}

function regexValue(html, name) {
  const match = html.match(new RegExp(`"${name}"\\s*:\\s*"([^"]*)"`, "i"));
  return match ? match[1] : null;
}

function regexNumber(html, name) {
  const match = html.match(new RegExp(`"${name}"\\s*:\\s*(\\d+)`, "i"));
  return match ? Number(match[1]) : null;
}

function regexBool(html, name) {
  const match = html.match(new RegExp(`"${name}"\\s*:\\s*(true|false)`, "i"));
  return match ? match[1] === "true" : null;
}

function regexFallback(html) {
  const user = {
    id: regexValue(html, "id"),
    secUid: regexValue(html, "secUid"),
    uniqueId: regexValue(html, "uniqueId"),
    nickname: regexValue(html, "nickname"),
    signature: regexValue(html, "signature"),
    avatarLarger: regexValue(html, "avatarLarger"),
    avatarMedium: regexValue(html, "avatarMedium"),
    avatarThumb: regexValue(html, "avatarThumb"),
    region: regexValue(html, "region"),
    language: regexValue(html, "language"),
    createTime: regexNumber(html, "createTime"),
    privateAccount: regexBool(html, "privateAccount"),
    verified: regexBool(html, "verified")
  };

  if (!user.uniqueId && !user.id) return null;

  return {
    user,
    stats: {
      followerCount: regexNumber(html, "followerCount"),
      followingCount: regexNumber(html, "followingCount"),
      heartCount: regexNumber(html, "heartCount") ?? regexNumber(html, "heart"),
      videoCount: regexNumber(html, "videoCount")
    }
  };
}

function collectVideoIdsFromObject(value, out, depth = 0) {
  if (!value || depth > 12 || out.size >= 10) return;

  if (Array.isArray(value)) {
    for (const item of value) collectVideoIdsFromObject(item, out, depth + 1);
    return;
  }

  if (typeof value !== "object") return;

  // Known SSR shapes often contain ItemModule keyed by aweme/video id.
  if (value.ItemModule && typeof value.ItemModule === "object") {
    for (const key of Object.keys(value.ItemModule)) {
      if (/^\d{15,22}$/.test(key)) out.add(key);
    }
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      ["id", "awemeId", "aweme_id", "itemId", "videoId"].includes(key) &&
      /^\d{15,22}$/.test(String(child))
    ) {
      out.add(String(child));
    }
    if (out.size < 10) collectVideoIdsFromObject(child, out, depth + 1);
  }
}

function collectVideoIds(html, ...objects) {
  const ids = new Set();

  for (const obj of objects) {
    collectVideoIdsFromObject(obj, ids);
  }

  const patterns = [
    /\/video\/(\d{15,22})/g,
    /"awemeId"\s*:\s*"(\d{15,22})"/g,
    /"itemId"\s*:\s*"(\d{15,22})"/g
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) && ids.size < 10) ids.add(m[1]);
  }

  return [...ids];
}

function findLocationCreated(data) {
  if (!data || typeof data !== "object") return null;

  const candidates = [
    data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct,
    data?.ItemModule ? Object.values(data.ItemModule)[0] : null
  ].filter(Boolean);

  for (const item of candidates) {
    const loc = item?.locationCreated ?? item?.location_created;
    if (typeof loc === "string" && /^[A-Za-z]{2}$/.test(loc)) {
      return loc.toUpperCase();
    }
  }

  return null;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache"
    }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
}

async function getVideoRegion(username, videoIds) {
  // Only a few public posts are checked to keep requests light.
  for (const videoId of videoIds.slice(0, 3)) {
    try {
      const html = await fetchHtml(
        `https://www.tiktok.com/@${encodeURIComponent(username)}/video/${videoId}`
      );

      const universal = readJsonScript(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
      const sigi =
        readJsonScript(html, "SIGI_STATE") ||
        readJsonScript(html, "sigi-persisted-data");

      const region =
        findLocationCreated(universal) ||
        findLocationCreated(sigi) ||
        (() => {
          const match = html.match(/"locationCreated"\s*:\s*"([A-Za-z]{2})"/i);
          return match ? match[1].toUpperCase() : null;
        })();

      if (region) return region;
    } catch {
      // Continue to next public post.
    }
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Vain GET-pyyntö on sallittu." });
  }

  const username = cleanUsername(req.query.username);
  if (!username) {
    return res.status(400).json({ error: "Virheellinen TikTok-käyttäjänimi." });
  }

  try {
    const profileHtml = await fetchHtml(
      `https://www.tiktok.com/@${encodeURIComponent(username)}`
    );

    const universal = readJsonScript(
      profileHtml,
      "__UNIVERSAL_DATA_FOR_REHYDRATION__"
    );
    const sigi =
      readJsonScript(profileHtml, "SIGI_STATE") ||
      readJsonScript(profileHtml, "sigi-persisted-data");

    const info =
      findUserInfo(universal) ||
      findUserInfo(sigi) ||
      regexFallback(profileHtml);

    if (!info?.user) {
      return res.status(404).json({
        error:
          "Julkista profiilidataa ei löytynyt. TikTok voi estää automaattisen haun tai profiili ei ole saatavilla."
      });
    }

    const user = info.user || {};
    const stats = info.stats || {};

    let region = user.region || null;
    let regionSource = region ? "profile" : null;

    if (!region) {
      const videoIds = collectVideoIds(profileHtml, universal, sigi);
      const videoRegion = await getVideoRegion(user.uniqueId || username, videoIds);

      if (videoRegion) {
        region = videoRegion;
        regionSource = "video";
      }
    }

    return res.status(200).json({
      regionSource,
      user: {
        id: user.id ?? null,
        secUid: user.secUid ?? null,
        uniqueId: user.uniqueId ?? username,
        nickname: user.nickname ?? username,
        signature: user.signature ?? null,
        avatar:
          user.avatarLarger ??
          user.avatarMedium ??
          user.avatarThumb ??
          null,
        region,
        language: user.language ?? null,
        createTime: user.createTime ?? null,
        privateAccount: user.privateAccount ?? null,
        verified: user.verified ?? null
      },
      stats: {
        followerCount: stats.followerCount ?? null,
        followingCount: stats.followingCount ?? null,
        heartCount: stats.heartCount ?? stats.heart ?? null,
        videoCount: stats.videoCount ?? null
      }
    });
  } catch {
    return res.status(502).json({
      error: "TikTok-profiilin haku epäonnistui."
    });
  }
}
