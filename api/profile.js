import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function cleanUsername(value = "") {
  return String(value).trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 64);
}
function twoLetter(v) {
  return typeof v === "string" && /^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : null;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Vain GET-pyyntö on sallittu." });
  const username = cleanUsername(req.query.username);
  if (!username) return res.status(400).json({ error: "Virheellinen TikTok-käyttäjänimi." });

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    const response = await page.goto(`https://www.tiktok.com/@${encodeURIComponent(username)}`, { waitUntil: "domcontentloaded", timeout: 20000 });
    const parsed = await page.evaluate(() => {
      const el = document.querySelector("#__UNIVERSAL_DATA_FOR_REHYDRATION__");
      if (!el?.textContent) return { user: null, stats: null, rawRegion: null, regionKeyPresent: false };
      try {
        const data = JSON.parse(el.textContent);
        const info = data?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
        const user = info?.user || null;
        return {
          user,
          stats: info?.stats || info?.statsV2 || null,
          regionKeyPresent: !!user && Object.prototype.hasOwnProperty.call(user, "region"),
          rawRegion: user && Object.prototype.hasOwnProperty.call(user, "region") ? user.region : null,
        };
      } catch { return { user: null, stats: null, rawRegion: null, regionKeyPresent: false }; }
    });
    if (!parsed.user) return res.status(404).json({ error: "TikTok ei palauttanut julkista profiilidataa tästä sivusta." });

    // Find a public video URL from links rendered on the public profile page.
    try { await page.waitForSelector('a[href*="/video/"]', { timeout: 7000 }); } catch {}
    const videoUrl = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href*="/video/"]')].map(a => a.href).filter(Boolean);
      return links.find(h => /\/video\/\d+/.test(h)) || null;
    });

    let video = { url: videoUrl, httpStatus: null, hydrationFound: false, videoDetailFound: false, locationCreated: null, regionLikeFields: [] };
    if (videoUrl) {
      const vp = await browser.newPage();
      await vp.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
      await vp.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
      const vr = await vp.goto(videoUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      video = await vp.evaluate(() => {
        const el = document.querySelector("#__UNIVERSAL_DATA_FOR_REHYDRATION__");
        if (!el?.textContent) return { hydrationFound: false, videoDetailFound: false, locationCreated: null, regionLikeFields: [] };
        try {
          const data = JSON.parse(el.textContent);
          const detail = data?.__DEFAULT_SCOPE__?.["webapp.video-detail"];
          const item = detail?.itemInfo?.itemStruct || null;
          const hits = [];
          const walk = (obj, path = "", depth = 0) => {
            if (!obj || typeof obj !== "object" || depth > 5 || hits.length >= 20) return;
            for (const [k, v] of Object.entries(obj)) {
              const p = path ? `${path}.${k}` : k;
              if (/region|locationcreated|country/i.test(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) hits.push({ path: p, value: String(v).slice(0, 80) });
              if (v && typeof v === "object") walk(v, p, depth + 1);
            }
          };
          walk(item);
          return {
            hydrationFound: true,
            videoDetailFound: !!item,
            locationCreated: item?.locationCreated ?? item?.location_created ?? null,
            regionLikeFields: hits,
          };
        } catch { return { hydrationFound: true, videoDetailFound: false, locationCreated: null, regionLikeFields: [] }; }
      });
      video.url = videoUrl;
      video.httpStatus = vr?.status?.() ?? null;
      await vp.close();
    }

    const u = parsed.user, s = parsed.stats || {};
    const profileRegion = twoLetter(parsed.rawRegion);
    const videoRegion = twoLetter(video.locationCreated);
    const region = profileRegion || videoRegion;
    const regionSource = profileRegion ? "TikTok-profiilidata" : videoRegion ? "TikTok-videometadata (locationCreated)" : null;

    return res.status(200).json({
      regionSource,
      diagnostics: {
        httpStatus: response?.status?.() ?? null,
        regionKeyPresent: parsed.regionKeyPresent,
        rawRegion: parsed.rawRegion,
        videoUrl: video.url,
        videoHttpStatus: video.httpStatus,
        videoHydrationFound: video.hydrationFound,
        videoDetailFound: video.videoDetailFound,
        locationCreated: video.locationCreated,
        regionLikeFields: video.regionLikeFields,
      },
      user: {
        id: u.id ?? null, secUid: u.secUid ?? null, uniqueId: u.uniqueId ?? username,
        nickname: u.nickname ?? username, signature: u.signature ?? null,
        avatar: u.avatarLarger ?? u.avatarMedium ?? u.avatarThumb ?? null,
        region, language: u.language ?? null, createTime: u.createTime ?? null,
        privateAccount: u.privateAccount ?? null, verified: u.verified ?? null,
      },
      stats: {
        followerCount: s.followerCount ?? null, followingCount: s.followingCount ?? null,
        heartCount: s.heartCount ?? s.heart ?? null, videoCount: s.videoCount ?? null,
      },
    });
  } catch (err) {
    return res.status(502).json({ error: "TikTok-haku epäonnistui.", detail: String(err?.message || err) });
  } finally { if (browser) try { await browser.close(); } catch {} }
}
