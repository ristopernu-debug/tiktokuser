const $ = id => document.getElementById(id);

const regionNames = new Intl.DisplayNames(["fi"], { type: "region" });
const languageNames = new Intl.DisplayNames(["fi"], { type: "language" });

function cleanUsername(value = "") {
  return value.trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}

function compact(value) {
  const n = Number(value);
  return Number.isFinite(n)
    ? new Intl.NumberFormat("fi-FI", { notation: "compact", maximumFractionDigits: 1 }).format(n)
    : "–";
}

function yesNo(value) {
  if (value === true) return "Kyllä";
  if (value === false) return "Ei";
  return "–";
}

function prettyRegion(code) {
  if (!code) return "N/A";
  const c = String(code).toUpperCase();
  try {
    const name = regionNames.of(c);
    return name && name !== c ? `${c} · ${name}` : c;
  } catch {
    return c;
  }
}

function prettyLanguage(code) {
  if (!code) return "N/A";
  const c = String(code).toLowerCase().replace("_", "-");
  try {
    const base = c.split("-")[0];
    const name = languageNames.of(base);
    return name ? `${c} · ${name}` : c;
  } catch {
    return c;
  }
}

$("form").addEventListener("submit", async event => {
  event.preventDefault();

  const username = cleanUsername($("username").value);
  if (!username) return;

  $("username").value = username;
  $("result").classList.add("hidden");
  $("status").className = "status";
  $("status").textContent = "Haetaan julkisia profiilitietoja…";
  $("searchBtn").disabled = true;

  try {
    const response = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Haku epäonnistui.");

    const user = data.user || {};
    const stats = data.stats || {};

    $("nickname").textContent = user.nickname || username;
    $("handle").textContent = `@${user.uniqueId || username}`;
    $("region").textContent = prettyRegion(user.region);
    $("language").textContent = prettyLanguage(user.language);
    $("regionSource").textContent =
      data.regionSource === "profile"
        ? "TikTok-profiili"
        : data.regionSource === "video"
        ? "Julkisen videon metadata"
        : "Ei saatavilla";

    const avatar = $("avatar");
    const fallback = $("avatarFallback");
    fallback.textContent = (user.nickname || username).charAt(0).toUpperCase();

    if (user.avatar) {
      avatar.src = user.avatar;
      avatar.alt = `${user.nickname || username} profiilikuva`;
      avatar.classList.remove("hidden");
      fallback.classList.add("hidden");
    } else {
      avatar.classList.add("hidden");
      fallback.classList.remove("hidden");
    }

    if (user.signature) {
      $("bio").textContent = user.signature;
      $("bioWrap").classList.remove("hidden");
    } else {
      $("bioWrap").classList.add("hidden");
    }

    $("followers").textContent = compact(stats.followerCount);
    $("following").textContent = compact(stats.followingCount);
    $("likes").textContent = compact(stats.heartCount);
    $("videos").textContent = compact(stats.videoCount);

    $("userId").textContent = user.id || "–";
    $("secUid").textContent = user.secUid || "–";
    $("created").textContent = user.createTime
      ? new Date(Number(user.createTime) * 1000).toLocaleString("fi-FI")
      : "–";
    $("privateAccount").textContent = yesNo(user.privateAccount);
    $("verified").textContent = yesNo(user.verified);

    $("profileLink").href =
      `https://www.tiktok.com/@${encodeURIComponent(user.uniqueId || username)}`;

    $("result").classList.remove("hidden");
    $("status").textContent = "";
  } catch (error) {
    $("status").className = "status error";
    $("status").textContent = error?.message || "Haku epäonnistui.";
  } finally {
    $("searchBtn").disabled = false;
  }
});
