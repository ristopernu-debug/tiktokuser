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
  const codes = items
    .map(item => String(item?.locationCreated || item?.location_created || "").toUpperCase())
    .filter(code => /^[A-Z]{2}$/.test(code));

  if (!codes.length) return null;

  const counts = new Map();
  for (const c of codes) counts.set(c, (counts.get(c) || 0) + 1);

  return [...counts.entries()]
    .sort((a,b) => b[1] - a[1])[0][0];
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
    await page.setExtraHTTPHeaders({"Accept-Language":"en-US,en;q=0.9"});

    await page.goto(`https://www.tiktok.com/@${encodeURIComponent(username)}`, {
      waitUntil:"domcontentloaded",
      timeout:20000
    });

    const profile = await page.evaluate(() => {
      const el = document.querySelector("#__UNIVERSAL_DATA_FOR_REHYDRATION__");
      if (!el?.textContent) return null;
      try {
        const data = JSON.parse(el.textContent);
        return data?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo || null;
      } catch {
        return null;
      }
    });

    if (!profile?.user) {
      return res.status(404).json({error:"TikTok ei palauttanut julkista profiilidataa."});
    }

    const u = profile.user;
    const s = profile.stats || profile.statsV2 || {};
    let region = u.region || null;
    let regionSource = region ? "profile" : null;
    let checkedVideos = 0;
    let videoStatus = "Ei haettu";

    if (!region && u.secUid) {
      const postResult = await page.evaluate(async (secUid) => {
        const params = new URLSearchParams({
          secUid,
          cursor:"0",
          count:"35"
        });

        const urls = [
          `/api/post/item_list/?${params.toString()}`,
          `/api/post/item_list/?aid=1988&${params.toString()}`
        ];

        for (const url of urls) {
          try {
            const r = await fetch(url, {
              method:"GET",
              credentials:"include",
              headers:{
                "accept":"application/json, text/plain, */*"
              }
            });

            const text = await r.text();
            let json = null;
            try { json = JSON.parse(text); } catch {}

            if (r.ok && json && (Array.isArray(json.itemList) || Array.isArray(json.items))) {
              return {
                ok:true,
                status:r.status,
                url,
                json
              };
            }
          } catch {}
        }

        return {ok:false};
      }, u.secUid);

      if (postResult?.ok) {
        const items = postResult.json.itemList || postResult.json.items || [];
        checkedVideos = items.length;
        videoStatus = `OK (${checkedVideos})`;

        const videoRegion = pickRegion(items);
        if (videoRegion) {
          region = videoRegion;
          regionSource = "video_metadata";
        }
      } else {
        videoStatus = "TikTok ei palauttanut videolistaa";
      }
    }

    return res.status(200).json({
      regionSource,
      checkedVideos,
      videoStatus,
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
