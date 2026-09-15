const $ = id => document.getElementById(id);
const regionNames = new Intl.DisplayNames(["fi"], {type:"region"});
const languageNames = new Intl.DisplayNames(["fi"], {type:"language"});

function cleanUsername(value="") {
  return value.trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}
function compact(value) {
  const n = Number(value);
  return Number.isFinite(n)
    ? new Intl.NumberFormat("fi-FI",{notation:"compact",maximumFractionDigits:1}).format(n)
    : "–";
}
function yesNo(v) {
  if (v === true) return "Kyllä";
  if (v === false) return "Ei";
  return "–";
}
function prettyRegion(code) {
  if (!code) return "N/A";
  const c = String(code).toUpperCase();
  try {
    const n = regionNames.of(c);
    return n && n !== c ? `${c} · ${n}` : c;
  } catch { return c; }
}
function prettyLanguage(code) {
  if (!code) return "N/A";
  const c = String(code).toLowerCase().replace("_","-");
  try {
    const n = languageNames.of(c.split("-")[0]);
    return n ? `${c} · ${n}` : c;
  } catch { return c; }
}

$("form").addEventListener("submit", async e => {
  e.preventDefault();
  const username = cleanUsername($("username").value);
  if (!username) return;

  $("username").value = username;
  $("result").classList.add("hidden");
  $("status").className = "status";
  $("status").textContent = "Haetaan profiilia ja videometadataa…";
  $("searchBtn").disabled = true;

  try {
    const res = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Haku epäonnistui.");

    const u = data.user || {};
    const s = data.stats || {};

    $("nickname").textContent = u.nickname || username;
    $("handle").textContent = `@${u.uniqueId || username}`;
    $("region").textContent = prettyRegion(u.region);
    $("language").textContent = prettyLanguage(u.language);
    $("regionSource").textContent =
      data.regionSource === "profile" ? "TikTok-profiilidata" :
      data.regionSource === "video_metadata" ? "TikTok-videometadata" :
      "Ei saatavilla";
    $("checkedVideos").textContent = String(data.checkedVideos ?? 0);
    $("videoStatus").textContent = data.videoStatus || "–";

    const avatar = $("avatar");
    const fallback = $("avatarFallback");
    fallback.textContent = (u.nickname || username).charAt(0).toUpperCase();
    if (u.avatar) {
      avatar.src = u.avatar;
      avatar.alt = `${u.nickname || username} profiilikuva`;
      avatar.classList.remove("hidden");
      fallback.classList.add("hidden");
    } else {
      avatar.classList.add("hidden");
      fallback.classList.remove("hidden");
    }

    if (u.signature) {
      $("bio").textContent = u.signature;
      $("bioWrap").classList.remove("hidden");
    } else {
      $("bioWrap").classList.add("hidden");
    }

    $("followers").textContent = compact(s.followerCount);
    $("following").textContent = compact(s.followingCount);
    $("likes").textContent = compact(s.heartCount);
    $("videos").textContent = compact(s.videoCount);
    $("userId").textContent = u.id || "–";
    $("secUid").textContent = u.secUid || "–";
    $("created").textContent = u.createTime
      ? new Date(Number(u.createTime)*1000).toLocaleString("fi-FI")
      : "–";
    $("privateAccount").textContent = yesNo(u.privateAccount);
    $("verified").textContent = yesNo(u.verified);
    $("profileLink").href = `https://www.tiktok.com/@${encodeURIComponent(u.uniqueId || username)}`;

    $("result").classList.remove("hidden");
    $("status").textContent = "";
  } catch (err) {
    $("status").className = "status error";
    $("status").textContent = err?.message || "Haku epäonnistui.";
  } finally {
    $("searchBtn").disabled = false;
  }
});
