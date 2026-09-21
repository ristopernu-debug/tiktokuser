import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function cleanUsername(value = "") {
  return String(value).trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 64);
}

function twoLetter(v) {
  return typeof v === "string" && /^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : null;
}

function cleanVideoUrl(value = "", username = "") {
  if (!value) return null;
  try {
    const u = new URL(String(value).trim());
    if (!/(^|\.)tiktok\.com$/i.test(u.hostname)) return null;
    const m = u.pathname.match(/^\/@([^/]+)\/video\/(\d+)/i);
    if (!m) return null;
    if (username && m[1].toLowerCase() !== username.toLowerCase()) return null;
    return `https://www.tiktok.com/@${encodeURIComponent(m[1])}/video/${m[2]}`;
  } catch {
    return null;
  }
}

async function discoverVideoFromCreatorEmbed(browser, username) {
  const result = { url: null, error: null };
  let embedPage;

  try {
    const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(profileUrl)}`;
    const r = await fetch(oembedUrl, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    if (!r.ok) {
      result.error = `TikTok oEmbed palautti HTTP ${r.status}.`;
      return result;
    }

    const data = await r.json();
    if (!data?.html) {
      result.error = "TikTok oEmbed ei palauttanut creator-embed-koodia.";
      return result;
    }

    embedPage = await browser.newPage();
    await embedPage.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    await embedPage.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    await embedPage.setContent(
      `<!doctype html><html><head><meta charset="utf-8"></head><body>${data.html}</body></html>`,
      { waitUntil: "domcontentloaded", timeout: 15000 }
    );

    // Creator Profile Embed is an official TikTok surface and normally renders a selection
    // of recent public videos. The content may live in a child frame, so inspect all frames.
    for (let round = 0; round < 8 && !result.url; round += 1) {
      await new Promise((resolve) => setTimeout(resolve, round === 0 ? 2200 : 1000));

      for (const frame of embedPage.frames()) {
        try {
          const links = await frame.evaluate(() => {
            const all = [...document.querySelectorAll('a[href]')].map((a) => a.href).filter(Boolean);
            return all.filter((href) => /tiktok\.com\/@[^/]+\/video\/\d+/i.test(href)).slice(0, 20);
          });

          for (const href of links) {
            const cleaned = cleanVideoUrl(href, username);
            if (cleaned) {
              result.url = cleaned;
              break;
            }
          }
        } catch {
          // A frame may disappear while the embed is re-rendering; keep checking others.
        }
        if (result.url) break;
      }
    }

    if (!result.url) result.error = "Creator Profile Embed ei paljastanut videolinkkiä odotusajan kuluessa.";
    return result;
  } catch (err) {
    result.error = String(err?.message || err);
    return result;
  } finally {
    if (embedPage) {
      try { await embedPage.close(); } catch {}
    }
  }
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



function decodeHtmlEntities(text = "") {
  return String(text)
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function findScriptJson(html, id) {
  const escaped = String(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`, "i");
  const match = String(html || "").match(re);
  if (!match) return null;
  try { return JSON.parse(decodeHtmlEntities(match[1].trim())); } catch { return null; }
}

function deepFindUserInfo(obj, username = "") {
  if (!obj || typeof obj !== "object") return null;
  const wanted = String(username || "").toLowerCase();

  const direct = obj?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
  if (direct?.user && (!wanted || String(direct.user.uniqueId || "").toLowerCase() === wanted)) return direct;

  const module = obj?.UserModule;
  if (module?.users && typeof module.users === "object") {
    const users = Object.values(module.users);
    const user = users.find((candidate) => String(candidate?.uniqueId || "").toLowerCase() === wanted) || null;
    if (user) {
      let stats = null;
      if (module.stats && typeof module.stats === "object") {
        stats = module.stats[user.id] || Object.values(module.stats).find((candidate) => {
          const unique = candidate?.uniqueId || candidate?.unique_id;
          return unique && String(unique).toLowerCase() === wanted;
        }) || null;
      }
      return { user, stats };
    }
  }

  // TikTok occasionally moves the same public user object to another hydration branch.
  // Search parsed JSON recursively for an object whose uniqueId is an exact match.
  // This is intentionally strict so region/language cannot be borrowed from another account.
  const seen = new WeakSet();
  let foundUser = null;
  let foundStats = null;

  const isStatsLike = (value) => value && typeof value === "object" && (
    Object.prototype.hasOwnProperty.call(value, "followerCount") ||
    Object.prototype.hasOwnProperty.call(value, "followingCount") ||
    Object.prototype.hasOwnProperty.call(value, "videoCount") ||
    Object.prototype.hasOwnProperty.call(value, "heartCount")
  );

  const normalizeCandidate = (candidate) => {
    if (!candidate || typeof candidate !== "object") return candidate;
    const user = { ...candidate };
    if (!user.region) user.region = user.registerRegion || user.register_region || user.country || null;
    if (!user.language) user.language = user.languageCode || user.language_code || user.lang || null;
    return user;
  };

  const walk = (value, parent = null, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 14 || foundUser) return;
    if (seen.has(value)) return;
    seen.add(value);

    if (!Array.isArray(value)) {
      const unique = value.uniqueId ?? value.unique_id ?? value.username;
      if (unique && String(unique).toLowerCase() === wanted) {
        const looksUserLike = value.nickname || value.secUid || value.sec_uid || value.id || value.avatarThumb || value.avatar_thumb || value.region || value.language;
        if (looksUserLike) {
          foundUser = normalizeCandidate({
            ...value,
            uniqueId: value.uniqueId ?? value.unique_id ?? value.username,
            secUid: value.secUid ?? value.sec_uid ?? null,
            avatarLarger: value.avatarLarger ?? value.avatar_larger ?? null,
            avatarMedium: value.avatarMedium ?? value.avatar_medium ?? null,
            avatarThumb: value.avatarThumb ?? value.avatar_thumb ?? value.avatar ?? null,
            createTime: value.createTime ?? value.create_time ?? null,
            privateAccount: value.privateAccount ?? value.private_account ?? null,
          });

          if (parent && typeof parent === "object") {
            for (const sibling of Object.values(parent)) {
              if (isStatsLike(sibling)) { foundStats = sibling; break; }
            }
          }
          return;
        }
      }
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") walk(child, value, depth + 1);
      if (foundUser) break;
    }
  };

  walk(obj);
  return foundUser ? { user: foundUser, stats: foundStats } : null;
}

function regexProfileFallback(html, username = "") {
  const wanted = String(username || "").toLowerCase();
  const source = String(html || "");
  const marker = source.toLowerCase().indexOf('"uniqueid":"' + wanted.replace(/"/g, ""));
  const markerAlt = source.toLowerCase().indexOf('"uniqueid" : "' + wanted.replace(/"/g, ""));
  const index = marker >= 0 ? marker : markerAlt;
  if (index < 0) return null;

  const start = Math.max(0, index - 12000);
  const end = Math.min(source.length, index + 90000);
  const block = source.slice(start, end);

  const str = (name) => {
    const m = block.match(new RegExp(`"${name}"\\s*:\\s*"([^"\\]*(?:\\.[^"\\]*)*)"`, "i"));
    if (!m) return null;
    try { return JSON.parse(`"${m[1]}"`); } catch { return m[1]; }
  };
  const num = (name) => {
    const m = block.match(new RegExp(`"${name}"\\s*:\\s*(\\d+)`, "i"));
    return m ? Number(m[1]) : null;
  };
  const bool = (name) => {
    const m = block.match(new RegExp(`"${name}"\\s*:\\s*(true|false)`, "i"));
    return m ? m[1].toLowerCase() === "true" : null;
  };

  const uniqueId = str("uniqueId");
  if (!uniqueId || uniqueId.toLowerCase() !== wanted) return null;

  return {
    user: {
      id: str("id"),
      uniqueId,
      nickname: str("nickname"),
      signature: str("signature"),
      avatarLarger: str("avatarLarger"),
      avatarMedium: str("avatarMedium"),
      avatarThumb: str("avatarThumb"),
      secUid: str("secUid"),
      region: str("region"),
      language: str("language"),
      createTime: num("createTime"),
      privateAccount: bool("privateAccount"),
      verified: bool("verified"),
    },
    stats: {
      followerCount: num("followerCount"),
      followingCount: num("followingCount"),
      heartCount: num("heartCount") ?? num("heart"),
      videoCount: num("videoCount"),
    },
  };
}

function enrichUserAliases(user) {
  if (!user || typeof user !== "object") return user;
  return {
    ...user,
    region: user.region || user.registerRegion || user.register_region || user.country || null,
    language: user.language || user.languageCode || user.language_code || user.lang || null,
  };
}

function extractProfileFromHtml(html, username = "") {
  const universal = findScriptJson(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
  const sigi = findScriptJson(html, "SIGI_STATE") || findScriptJson(html, "sigi-persisted-data");
  const found = deepFindUserInfo(universal, username) || deepFindUserInfo(sigi, username) || regexProfileFallback(html, username);
  if (found?.user) found.user = enrichUserAliases(found.user);
  return found;
}

async function fetchProfileOEmbed(username) {
  const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(profileUrl)}`;
  const response = await fetch(oembedUrl, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) return null;
  try { return await response.json(); } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") return res.status(405).json({ error: "Vain GET-pyyntö on sallittu." });

  const username = cleanUsername(req.query.username);
  if (!username) return res.status(400).json({ error: "Virheellinen TikTok-käyttäjänimi." });
  const suppliedVideoRaw = String(req.query.videoUrl || "").trim();
  const suppliedVideoUrl = cleanVideoUrl(suppliedVideoRaw, username);
  if (suppliedVideoRaw && !suppliedVideoUrl) {
    return res.status(400).json({ error: "Videolinkin pitää olla saman käyttäjän julkinen TikTok-video." });
  }

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

    // Listen BEFORE navigation. We prefer the request generated by TikTok's own frontend
    // over constructing /api/post/item_list/ ourselves. This preserves the browser session,
    // cookies and any parameters that TikTok's page itself adds to the request.
    let capturedPostResponse = null;
    let resolvePostCapture;
    const postCapturePromise = new Promise((resolve) => { resolvePostCapture = resolve; });

    const onResponse = async (networkResponse) => {
      try {
        const url = networkResponse.url();
        if (!/\/api\/post\/item_list\//.test(url) || capturedPostResponse) return;

        const status = networkResponse.status();
        const text = await networkResponse.text();
        let data = null;
        try { data = JSON.parse(text); } catch {}

        capturedPostResponse = { url, status, text, data };
        resolvePostCapture(capturedPostResponse);
      } catch {
        // Ignore individual response parsing errors and keep listening.
      }
    };

    page.on("response", onResponse);

    const response = await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

    let parsed = await page.evaluate(() => {
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

    // Some valid public accounts (especially accounts with no public posts) do not expose
    // webapp.user-detail through the same hydration node on every request. Inspect the full
    // rendered HTML and older TikTok state containers before treating the account as missing.
    if (!parsed.user) {
      try {
        const html = await page.content();
        const fallbackInfo = extractProfileFromHtml(html, username);
        if (fallbackInfo?.user) {
          const fallbackUser = fallbackInfo.user;
          parsed = {
            user: fallbackUser,
            stats: fallbackInfo.stats || fallbackInfo.statsV2 || null,
            regionKeyPresent: Object.prototype.hasOwnProperty.call(fallbackUser, "region"),
            rawRegion: Object.prototype.hasOwnProperty.call(fallbackUser, "region") ? fallbackUser.region : null,
          };
        }
      } catch {}
    }

    // Last-resort existence check: TikTok's public oEmbed endpoint can still identify a creator
    // even when the profile page omits hydration data. In that case return the profile with the
    // fields TikTok actually exposed instead of incorrectly reporting "user not found".
    if (!parsed.user) {
      const oembed = await fetchProfileOEmbed(username).catch(() => null);
      if (oembed) {
        return res.status(200).json({
          regionSource: null,
          diagnostics: {
            httpStatus: response?.status?.() ?? null,
            profileFallback: "TikTok oEmbed",
            limitedProfileData: true,
          },
          user: {
            id: null,
            secUid: null,
            uniqueId: username,
            nickname: oembed.author_name || username,
            signature: null,
            avatar: oembed.thumbnail_url || null,
            region: null,
            language: null,
            createTime: null,
            privateAccount: null,
            verified: null,
          },
          stats: {
            followerCount: null,
            followingCount: null,
            heartCount: null,
            videoCount: null,
          },
        });
      }
      return res.status(404).json({ error: "TikTok ei palauttanut julkista profiilidataa tästä sivusta." });
    }

    parsed.user = enrichUserAliases(parsed.user);
    const u = parsed.user;
    const s = parsed.stats || {};
    const profileHasNoVideos = Number(s.videoCount) === 0;

    // Give TikTok's own frontend a chance to request the user's post list. A small scroll
    // helps lazy-loaded profile grids start their normal browser request when available.
    if (!profileHasNoVideos) {
      try {
        await page.evaluate(() => window.scrollTo(0, Math.max(document.body.scrollHeight * 0.45, 700)));
      } catch {}

      try {
        await Promise.race([
          postCapturePromise,
          new Promise((resolve) => setTimeout(resolve, 9000)),
        ]);
      } catch {}
    }

    page.off("response", onResponse);

    const parseItems = (data) => {
      if (!data || typeof data !== "object") return [];
      if (Array.isArray(data.itemList)) return data.itemList;
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data?.body?.itemListData)) return data.body.itemListData;
      return [];
    };

    const makePostResult = (source, httpStatus, data, text, error = null) => {
      const items = parseItems(data);
      const item = items[0] || null;
      const id = item ? (item.id || item.itemId || item?.itemStruct?.id || null) : null;
      const unique = u.uniqueId || username;
      const regionLikeFields = item ? scanRegionFields(item) : [];

      return {
        attempted: true,
        source,
        httpStatus,
        ok: items.length > 0,
        itemCount: items.length,
        firstVideoId: id ? String(id) : null,
        firstVideoUrl: id ? `https://www.tiktok.com/@${encodeURIComponent(unique)}/video/${id}` : null,
        locationCreated: item?.locationCreated ?? item?.location_created ?? item?.itemStruct?.locationCreated ?? null,
        regionLikeFields,
        error: error || (items.length ? null : (data
          ? `TikTokin post-lista ei palauttanut videoita (statusCode: ${data.statusCode ?? data.status_code ?? "?"}).`
          : `TikTokin oma post-listavastaus ei sisältänyt JSON-dataa (${String(text || "tyhjä").slice(0, 80)}).`)),
      };
    };

    // 1) Primary path: use the /api/post/item_list/ response emitted by TikTok's own frontend.
    let postApi = capturedPostResponse
      ? makePostResult(
          "TikTokin oman sivun verkkovastaus",
          capturedPostResponse.status,
          capturedPostResponse.data,
          capturedPostResponse.text
        )
      : {
          attempted: true,
          source: "TikTokin oman sivun verkkovastaus",
          httpStatus: null,
          ok: false,
          itemCount: 0,
          firstVideoId: null,
          firstVideoUrl: null,
          locationCreated: null,
          regionLikeFields: [],
          error: "TikTokin sivu ei tehnyt post/item_list-pyyntöä odotusajan kuluessa.",
        };

    // Optional fallback: if TikTok did not emit the request at all, try the same endpoint from
    // inside the live page context. This is diagnostic only; it does not replace the primary path.
    if (!profileHasNoVideos && !postApi.ok && !capturedPostResponse && u.secUid) {
      const fallback = await page.evaluate(async ({ secUid, uniqueId }) => {
        const result = { status: null, text: "", data: null, error: null };
        try {
          const params = new URLSearchParams({ secUid, cursor: "0", count: "6" });
          const r = await fetch(`/api/post/item_list/?${params.toString()}`, {
            method: "GET",
            credentials: "include",
            headers: { accept: "application/json, text/plain, */*" },
          });
          result.status = r.status;
          result.text = await r.text();
          try { result.data = JSON.parse(result.text); } catch {}
        } catch (err) {
          result.error = String(err?.message || err);
        }
        return result;
      }, { secUid: u.secUid, uniqueId: u.uniqueId || username });

      if (fallback.data || fallback.status) {
        postApi = makePostResult(
          "Sivukontekstin fallback",
          fallback.status,
          fallback.data,
          fallback.text,
          fallback.error
        );
      }
    }

    // 2) Automatic fallback: discover one public video from the same profile.
    // TikTok changes its profile rendering frequently, so try several public page surfaces:
    // normal DOM links first, then the rendered HTML source. No external API or API key is used.
    let domVideoUrl = null;
    let htmlVideoUrl = null;

    if (!profileHasNoVideos && !postApi.firstVideoUrl) {
      try { await page.waitForSelector('a[href*="/video/"]', { timeout: 5000 }); } catch {}

      domVideoUrl = await page.evaluate((expectedUsername) => {
        const links = [...document.querySelectorAll('a[href*="/video/"]')]
          .map((a) => a.href)
          .filter(Boolean);

        const expected = String(expectedUsername || "").toLowerCase();
        return links.find((href) => {
          try {
            const u = new URL(href);
            const m = u.pathname.match(/^\/@([^/]+)\/video\/(\d+)/i);
            return !!m && (!expected || m[1].toLowerCase() === expected);
          } catch {
            return false;
          }
        }) || null;
      }, u.uniqueId || username);

      domVideoUrl = cleanVideoUrl(domVideoUrl || "", u.uniqueId || username);
    }

    if (!profileHasNoVideos && !postApi.firstVideoUrl && !domVideoUrl) {
      try {
        const html = await page.content();
        const escaped = String(u.uniqueId || username).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`https?:\\/\\/(?:www\\.)?tiktok\\.com\\/@${escaped}\\/video\\/(\\d+)`, "i");
        const direct = html.match(re);

        if (direct) {
          htmlVideoUrl = cleanVideoUrl(direct[0].replaceAll("&amp;", "&"), u.uniqueId || username);
        } else {
          // Some script payloads escape slashes as \/. Normalize a copy only for matching.
          const normalized = html.replaceAll("\\/", "/");
          const normalizedMatch = normalized.match(re);
          if (normalizedMatch) {
            htmlVideoUrl = cleanVideoUrl(normalizedMatch[0].replaceAll("&amp;", "&"), u.uniqueId || username);
          }
        }
      } catch {}
    }

    // 2b) Official Creator Profile Embed fallback. TikTok documents that the creator embed
    // can contain up to ten recent public videos. This route needs no API key.
    let embedVideoUrl = null;
    let embedVideoError = null;
    if (!profileHasNoVideos && !postApi.firstVideoUrl && !domVideoUrl && !htmlVideoUrl) {
      const embedDiscovery = await discoverVideoFromCreatorEmbed(browser, u.uniqueId || username);
      embedVideoUrl = embedDiscovery.url;
      embedVideoError = embedDiscovery.error;
    }

    const automaticVideoUrl = postApi.firstVideoUrl || domVideoUrl || htmlVideoUrl || embedVideoUrl;
    const videoUrl = suppliedVideoUrl || automaticVideoUrl;
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
        parserVersion: "v12-recursive-user-match",
        regionKeyPresent: parsed.regionKeyPresent,
        rawRegion: parsed.rawRegion,
        postApiAttempted: postApi.attempted,
        postApiSource: postApi.source,
        postApiHttpStatus: postApi.httpStatus,
        postApiOk: postApi.ok,
        postApiItemCount: postApi.itemCount,
        postApiError: postApi.error,
        firstVideoId: postApi.firstVideoId,
        automaticVideoUrl,
        automaticVideoSource: postApi.firstVideoUrl
          ? "post-list"
          : domVideoUrl
            ? "profile-dom"
            : htmlVideoUrl
              ? "profile-html"
              : embedVideoUrl
                ? "creator-embed"
                : null,
        embedVideoError,
        videoUrl: video.url,
        suppliedVideoUrlUsed: !!suppliedVideoUrl,
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
