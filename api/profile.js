import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function cleanUsername(value = "") {
  return String(value)
    .trim()
    .replace(/^@/, "")
    .replace(/[^A-Za-z0-9._]/g, "")
    .slice(0, 64);
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Vain GET-pyyntö on sallittu." });
  }

  const username = cleanUsername(req.query.username);
  if (!username) {
    return res.status(400).json({ error: "Virheellinen TikTok-käyttäjänimi." });
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
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
    const response = await page.goto(profileUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    const parsed = await page.evaluate(() => {
      const el = document.querySelector("#__UNIVERSAL_DATA_FOR_REHYDRATION__");
      if (!el?.textContent) {
        return {
          hydrationFound: false,
          hydrationParsed: false,
          userDetailFound: false,
          userInfoFound: false,
          userFound: false,
          regionKeyPresent: false,
          rawRegion: null,
          user: null,
          stats: null,
        };
      }

      let data;
      try {
        data = JSON.parse(el.textContent);
      } catch {
        return {
          hydrationFound: true,
          hydrationParsed: false,
          userDetailFound: false,
          userInfoFound: false,
          userFound: false,
          regionKeyPresent: false,
          rawRegion: null,
          user: null,
          stats: null,
        };
      }

      const scope = data?.__DEFAULT_SCOPE__;
      const detail = scope?.["webapp.user-detail"];
      const userInfo = detail?.userInfo;
      const user = userInfo?.user || null;
      const stats = userInfo?.stats || userInfo?.statsV2 || null;
      const regionKeyPresent = !!user && Object.prototype.hasOwnProperty.call(user, "region");

      return {
        hydrationFound: true,
        hydrationParsed: true,
        userDetailFound: !!detail,
        userInfoFound: !!userInfo,
        userFound: !!user,
        regionKeyPresent,
        rawRegion: regionKeyPresent ? user.region : null,
        user,
        stats,
      };
    });

    if (!parsed.user) {
      return res.status(404).json({
        error: "TikTok ei palauttanut julkista profiilidataa tästä sivusta.",
        diagnostics: {
          httpStatus: response?.status?.() ?? null,
          hydrationFound: parsed.hydrationFound,
          hydrationParsed: parsed.hydrationParsed,
          userDetailFound: parsed.userDetailFound,
          userInfoFound: parsed.userInfoFound,
          userFound: parsed.userFound,
          regionKeyPresent: parsed.regionKeyPresent,
          rawRegion: parsed.rawRegion,
        },
      });
    }

    const u = parsed.user;
    const s = parsed.stats || {};
    const region =
      typeof parsed.rawRegion === "string" && /^[A-Za-z]{2}$/.test(parsed.rawRegion)
        ? parsed.rawRegion.toUpperCase()
        : null;

    return res.status(200).json({
      regionSource: region ? "webapp.user-detail.userInfo.user.region" : null,
      diagnostics: {
        httpStatus: response?.status?.() ?? null,
        hydrationFound: parsed.hydrationFound,
        hydrationParsed: parsed.hydrationParsed,
        userDetailFound: parsed.userDetailFound,
        userInfoFound: parsed.userInfoFound,
        userFound: parsed.userFound,
        regionKeyPresent: parsed.regionKeyPresent,
        rawRegion: parsed.rawRegion,
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
    return res.status(502).json({
      error: "TikTok-haku epäonnistui.",
      detail: String(err?.message || err),
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}
