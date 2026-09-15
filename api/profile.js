import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function cleanUsername(value="") {
  return String(value)
    .trim()
    .replace(/^@/, "")
    .replace(/[^A-Za-z0-9._]/g, "")
    .slice(0,64);
}

function pickRegion(items=[]) {
  const rows = items
    .map((item, index) => ({
      index,
      code: String(item?.locationCreated || item?.location_created || "").toUpperCase()
    }))
    .filter(x => /^[A-Z]{2}$/.test(x.code));

  if (!rows.length) return null;

  const counts = new Map();
  for (const row of rows) counts.set(row.code, (counts.get(row.code) || 0) + 1);

  let winner = rows[0].code;
  let best = counts.get(winner);

  for (const [code, count] of counts.entries()) {
    if (count > best) {
      winner = code;
      best = count;
    }
  }

  return winner;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","s-maxage=120, stale-while-revalidate=300");

  if (req.method !== "GET") {
    return res.status(405).json({error:"Vain GET-pyyntö on sallittu."});
  }

  const username = cleanUsername(req.query.username);
  if (!username) {
    return res.status(400).json({error:"Virheellinen TikTok-käyttäjänimi."});
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {width:1280,height:900},
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language":"en-US,en;q=0.9"
    });

    await page.setRequestInterception(true);
    page.on("request", req => {
      const type = req.resourceType();
      if (["image","media","font","stylesheet"].includes(type)) req.abort();
      else req.continue();
    });

    let postList = null;

    page.on("response", async response => {
      const url = response.url();
      if (!url.startsWith("https://www.tiktok.com/api/post/item_list/")) return;
      if (postList) return;

      try {
        const json = await response.json();
        if (Array.isArray(json?.itemList)) postList = json;
      } catch {}
    });

    const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;

    await page.goto(profileUrl, {
      waitUntil:"domcontentloaded",
      timeout:20000
    });

    // Give TikTok's own page scripts time to issue /api/post/item_list/.
    const started = Date.now();
    while (!postList && Date.now() - started < 9000) {
      await new Promise(r => setTimeout(r, 350));
    }

    const hydration = await page.evaluate(() => {
      const el = document.querySelector("#__UNIVERSAL_DATA_FOR_REHYDRATION__");
      if (!el?.textContent) return null;
      try { return JSON.parse(el.textContent); } catch { return null; }
    });

    const detail =
      hydration?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo || null;

    if (!detail?.user) {
      return res.status(404).json({
        error:"TikTok ei palauttanut julkista profiilidataa."
      });
    }

    const u = detail.user;
    const s = detail.stats || detail.statsV2 || {};
    const items = postList?.itemList || [];

    let region = u.region || null;
    let regionSource = region ? "profile" : null;

    if (!region) {
      const videoRegion = pickRegion(items);
      if (videoRegion) {
        region = videoRegion;
        regionSource = "video_metadata";
      }
    }

    return res.status(200).json({
      regionSource,
      checkedVideos: items.length,
      user:{
        id:u.id ?? null,
        secUid:u.secUid ?? null,
        uniqueId:u.uniqueId ?? username,
        nickname:u.nickname ?? username,
        signature:u.signature ?? null,
        avatar:u.avatarLarger ?? u.avatarMedium ?? u.avatarThumb ?? null,
        region,
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
      error:"TikTok-haku epäonnistui.",
      detail:String(err?.message || err)
    });
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
