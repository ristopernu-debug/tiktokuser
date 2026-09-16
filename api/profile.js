import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function cleanUsername(value = "") {
  return String(value).trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 64);
}

function twoLetter(v) {
  return typeof v === "string" && /^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : null;
}

function scanRegionFields(obj, maxHits = 30) {
  const hits = [];
  const seen = new WeakSet();

  const walk = (value, path = "", depth = 0) => {
    if (!value || typeof value !== "object" || depth > 7 || hits.length >= maxHits) return;
    if (seen.has(value)) return;
    seen.add(value);

    for (const [key, child] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (/region|locationcreated|country/i.test(key) && ["string", "number", "boolean"].includes(typeof child)) {
        hits.push({ path: nextPath, value: String(child).slice(0, 120) });
      }
      if (child && typeof child === "object") walk(child, nextPath, depth + 1);
      if (hits.length >= maxHits) break;
    }
  };

  walk(obj);
  return hits;
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
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
    const response = await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

    const parsed = await page.evaluate(() => {
      const el = document.querySelector("#__UNIVERSAL_DATA_FOR_REHYDRATION__");
      if (!el?.textContent) {
        return { user: null, stats: null, rawRegion: null, regionKeyPresent: false };
      }

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
      } catch {
        return { user: null, stats: null, rawRegion: null, regionKeyPresent: false };
      }
    });

    if (!parsed.user) {
      return res.status(404).json({ error: "TikTok ei palauttanut julkista profiilidataa tästä sivusta." });
    }

    const u = parsed.user;
    const s = parsed.stats || {};

    // 1) Try TikTok's own post-list request inside the already-open TikTok browser session.
    // This keeps TikTok cookies, browser context and request environment together.
    let postApi = {
      attempted: false,
      httpStatus: null,
      ok: false,
      itemCount: 0,
      firstVideoId: null,
      firstVideoUrl: null,
      locationCreated: null,
      regionLikeFields: [],
      error: null,
    };

    if (u.secUid) {
      postApi = await page.evaluate(async ({ secUid, uniqueId }) => {
        const result = {
          attempted: true,
          httpStatus: null,
          ok: false,
          itemCount: 0,
          firstVideoId: null,
          firstVideoUrl: null,
          locationCreated: null,
          regionLikeFields: [],
          error: null,
        };

        try {
          const params = new URLSearchParams({
            secUid,
            cursor: "0",
            count: "6",
          });

          const r = await fetch(`/api/post/item_list/?${params.toString()}`, {
            method: "GET",
            credentials: "include",
            headers: {
              accept: "application/json, text/plain, */*",
            },
          });

          result.httpStatus = r.status;
          const text = await r.text();
          let data = null;
          try { data = JSON.parse(text); } catch {}

          if (!data || typeof data !== "object") {
            result.error = `TikTok palautti muun kuin JSON-vastauksen (${text.slice(0, 80) || "tyhjä"}).`;
            return result;
          }

          const items = Array.isArray(data.itemList)
            ? data.itemList
            : Array.isArray(data.items)
              ? data.items
              : Array.isArray(data?.body?.itemListData)
                ? data.body.itemListData
                : [];

          result.ok = r.ok && items.length > 0;
          result.itemCount = items.length;

          const item = items[0] || null;
          if (item) {
            const id = item.id || item.itemId || item?.itemStruct?.id || null;
            result.firstVideoId = id ? String(id) : null;
            result.firstVideoUrl = id ? `https://www.tiktok.com/@${encodeURIComponent(uniqueId)}/video/${id}` : null;
            result.locationCreated = item.locationCreated ?? item.location_created ?? item?.itemStruct?.locationCreated ?? null;

            const hits = [];
            const seen = new WeakSet();
            const walk = (value, path = "", depth = 0) => {
              if (!value || typeof value !== "object" || depth > 7 || hits.length >= 30) return;
              if (seen.has(value)) return;
              seen.add(value);
              for (const [key, child] of Object.entries(value)) {
                const nextPath = path ? `${path}.${key}` : key;
                if (/region|locationcreated|country/i.test(key) && ["string", "number", "boolean"].includes(typeof child)) {
                  hits.push({ path: nextPath, value: String(child).slice(0, 120) });
                }
                if (child && typeof child === "object") walk(child, nextPath, depth + 1);
                if (hits.length >= 30) break;
              }
            };
            walk(item);
            result.regionLikeFields = hits;
          }

          if (!result.ok && !result.error) {
            result.error = `TikTokin post-lista ei palauttanut videoita (statusCode: ${data.statusCode ?? data.status_code ?? "?"}).`;
          }
        } catch (err) {
          result.error = String(err?.message || err);
        }

        return result;
      }, { secUid: u.secUid, uniqueId: u.uniqueId || username });
    }

    // 2) Fallback: use a rendered profile video link if TikTok exposed one in the DOM.
    let domVideoUrl = null;
    if (!postApi.firstVideoUrl) {
      try { await page.waitForSelector('a[href*="/video/"]', { timeout: 5000 }); } catch {}
      domVideoUrl = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a[href*="/video/"]')]
          .map((a) => a.href)
          .filter(Boolean);
        return links.find((href) => /\/video\/\d+/.test(href)) || null;
      });
    }

    const videoUrl = postApi.firstVideoUrl || domVideoUrl;
    let video = {
      url: videoUrl,
      httpStatus: null,
      hydrationFound: false,
      videoDetailFound: false,
      locationCreated: null,
      regionLikeFields: [],
    };

    // 3) Open one public video page and inspect its hydration JSON too.
    if (videoUrl) {
      const vp = await browser.newPage();
      await vp.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      );
      await vp.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

      const vr = await vp.goto(videoUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      const inspected = await vp.evaluate(() => {
        const el = document.querySelector("#__UNIVERSAL_DATA_FOR_REHYDRATION__");
        if (!el?.textContent) {
          return { hydrationFound: false, videoDetailFound: false, locationCreated: null, regionLikeFields: [] };
        }

        try {
          const data = JSON.parse(el.textContent);
          const detail = data?.__DEFAULT_SCOPE__?.["webapp.video-detail"];
          const item = detail?.itemInfo?.itemStruct || null;
          const hits = [];
          const seen = new WeakSet();

          const walk = (value, path = "", depth = 0) => {
            if (!value || typeof value !== "object" || depth > 7 || hits.length >= 30) return;
            if (seen.has(value)) return;
            seen.add(value);

            for (const [key, child] of Object.entries(value)) {
              const nextPath = path ? `${path}.${key}` : key;
              if (/region|locationcreated|country/i.test(key) && ["string", "number", "boolean"].includes(typeof child)) {
                hits.push({ path: nextPath, value: String(child).slice(0, 120) });
              }
              if (child && typeof child === "object") walk(child, nextPath, depth + 1);
              if (hits.length >= 30) break;
            }
          };

          walk(item);
          return {
            hydrationFound: true,
            videoDetailFound: !!item,
            locationCreated: item?.locationCreated ?? item?.location_created ?? null,
            regionLikeFields: hits,
          };
        } catch {
          return { hydrationFound: true, videoDetailFound: false, locationCreated: null, regionLikeFields: [] };
        }
      });

      video = {
        ...inspected,
        url: videoUrl,
        httpStatus: vr?.status?.() ?? null,
      };
      await vp.close();
    }

    const profileRegion = twoLetter(parsed.rawRegion);
    const postRegion = twoLetter(postApi.locationCreated);
    const videoRegion = twoLetter(video.locationCreated);
    const region = profileRegion || postRegion || videoRegion;
    const regionSource = profileRegion
      ? "TikTok-profiilidata"
      : postRegion
        ? "TikTok-postilista (locationCreated)"
        : videoRegion
          ? "TikTok-videometadata (locationCreated)"
          : null;

    const allRegionFields = [
      ...(Array.isArray(postApi.regionLikeFields) ? postApi.regionLikeFields.map((x) => ({ ...x, path: `postApi.${x.path}` })) : []),
      ...(Array.isArray(video.regionLikeFields) ? video.regionLikeFields.map((x) => ({ ...x, path: `video.${x.path}` })) : []),
    ].slice(0, 40);

    return res.status(200).json({
      regionSource,
      diagnostics: {
        httpStatus: response?.status?.() ?? null,
        regionKeyPresent: parsed.regionKeyPresent,
        rawRegion: parsed.rawRegion,
        postApiAttempted: postApi.attempted,
        postApiHttpStatus: postApi.httpStatus,
        postApiOk: postApi.ok,
        postApiItemCount: postApi.itemCount,
        postApiError: postApi.error,
        firstVideoId: postApi.firstVideoId,
        videoUrl: video.url,
        videoHttpStatus: video.httpStatus,
        videoHydrationFound: video.hydrationFound,
        videoDetailFound: video.videoDetailFound,
        postLocationCreated: postApi.locationCreated,
        locationCreated: video.locationCreated,
        regionLikeFields: allRegionFields,
      },
      user: {
        id: u.id ?? null,
        secUid: u.secUid ?? null,
        uniqueId: u.uniqueId ?? username,
        nickname: u.nickname ?? username,
        signature: u.signature ?? null,
        avatar: u.avatarLarger ?? u.avatarMedium ?? u.avatarThumb ?? null,
        region,
        language: u.language ?? null,
        createTime: u.createTime ?? null,
        privateAccount: u.privateAccount ?? null,
        verified: u.verified ?? null,
      },
      stats: {
        followerCount: s.followerCount ?? null,
        followingCount: s.followingCount ?? null,
        heartCount: s.heartCount ?? s.heart ?? null,
        videoCount: s.videoCount ?? null,
      },
    });
  } catch (err) {
    return res.status(502).json({ error: "TikTok-haku epäonnistui.", detail: String(err?.message || err) });
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
