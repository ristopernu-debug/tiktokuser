import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function cleanUsername(value="") {
  return String(value).trim().replace(/^@/,"").replace(/[^A-Za-z0-9._]/g,"").slice(0,64);
}

function readHydration(text) {
  try {
    const data = JSON.parse(text || "");
    return data;
  } catch {
    return null;
  }
}

function findVideoRegion(data) {
  const item =
    data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct ||
    (data?.ItemModule ? Object.values(data.ItemModule)[0] : null);

  const code = String(item?.locationCreated || item?.location_created || "").toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function chooseRegion(codes) {
  if (!codes.length) return null;
  const counts = new Map();
  for (const c of codes) counts.set(c, (counts.get(c) || 0) + 1);
  return [...counts.entries()].sort((a,b) => b[1] - a[1])[0][0];
}

export default async function handler(req,res) {
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","s-maxage=120, stale-while-revalidate=300");

  if (req.method !== "GET") return res.status(405).json({error:"Vain GET-pyyntö on sallittu."});

  const username = cleanUsername(req.query.username);
  if (!username) return res.status(400).json({error:"Virheellinen TikTok-käyttäjänimi."});

  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport:{width:1280,height:900},
      executablePath:await chromium.executablePath(),
      headless:chromium.headless
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({"Accept-Language":"en-US,en;q=0.9"});

    const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
    await page.goto(profileUrl,{waitUntil:"domcontentloaded",timeout:20000});

    await new Promise(r => setTimeout(r, 2500));

    const profile = await page.evaluate(() => {
      const el = document.querySelector("#__UNIVERSAL_DATA_FOR_REHYDRATION__");
      if (!el?.textContent) return null;
      try {
        const data = JSON.parse(el.textContent);
        return data?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo || null;
      } catch { return null; }
    });

    if (!profile?.user) {
      return res.status(404).json({error:"TikTok ei palauttanut julkista profiilidataa."});
    }

    // Let the real page render more of the public profile grid.
    for (let i=0; i<3; i++) {
      await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight, 900)));
      await new Promise(r => setTimeout(r, 1200));
    }

    const videoLinks = await page.evaluate(() => {
      const seen = new Set();
      for (const a of document.querySelectorAll('a[href*="/video/"]')) {
        try {
          const u = new URL(a.href, location.origin);
          if (u.hostname.endsWith("tiktok.com") && /\/video\/\d+/.test(u.pathname)) {
            seen.add(u.href.split("?")[0]);
          }
        } catch {}
      }
      return [...seen].slice(0, 8);
    });

    const u = profile.user;
    const s = profile.stats || profile.statsV2 || {};

    let region = u.region || null;
    let regionSource = region ? "profile" : null;
    const codes = [];
    let checkedVideos = 0;

    if (!region && videoLinks.length) {
      const videoPage = await browser.newPage();
      await videoPage.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      );
      await videoPage.setExtraHTTPHeaders({"Accept-Language":"en-US,en;q=0.9"});

      for (const url of videoLinks.slice(0,3)) {
        try {
          await videoPage.goto(url,{waitUntil:"domcontentloaded",timeout:15000});
          await new Promise(r => setTimeout(r,1000));

          const payload = await videoPage.evaluate(() => {
            const el = document.querySelector("#__UNIVERSAL_DATA_FOR_REHYDRATION__");
            if (!el?.textContent) return null;
            return el.textContent;
          });

          const data = readHydration(payload);
          let code = findVideoRegion(data);

          if (!code) {
            const html = await videoPage.content();
            const m = html.match(/"locationCreated"\s*:\s*"([A-Za-z]{2})"/i);
            if (m) code = m[1].toUpperCase();
          }

          checkedVideos += 1;
          if (code) codes.push(code);
        } catch {}
      }

      await videoPage.close();

      const picked = chooseRegion(codes);
      if (picked) {
        region = picked;
        regionSource = "video_page";
      }
    }

    return res.status(200).json({
      regionSource,
      videoLinksFound:videoLinks.length,
      checkedVideos,
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
