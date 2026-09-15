const API = "https://user.tikmatrix.com/api/user";

const $ = id => document.getElementById(id);

function cleanUsername(value="") {
  return value.trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}

function fmt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value ?? "–";
  return new Intl.NumberFormat("fi-FI", { notation:"compact", maximumFractionDigits:1 }).format(n);
}

function fullNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("fi-FI").format(n) : (value ?? "–");
}

function value(obj, ...keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
  }
  return null;
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = cleanUsername($("username").value);
  if (!username) return;

  $("username").value = username;
  $("result").classList.add("hidden");
  $("status").className = "status";
  $("status").textContent = "Haetaan…";
  $("searchBtn").disabled = true;

  try {
    const res = await fetch(`${API}?username=${encodeURIComponent(username)}`, {
      headers: { "Accept":"application/json" }
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Palvelu ei palauttanut kelvollista vastausta.");
    }

    if (!res.ok || data?.error) {
      if (res.status === 503) {
        throw new Error("Hakuraja tuli vastaan. Odota hetki ja yritä uudelleen.");
      }
      throw new Error(data?.error || "Käyttäjää ei löytynyt.");
    }

    const p = data.profile || {};
    const s = data.stats || {};

    const nickname = value(p, "Nickname", "nickname") || username;
    const avatar = value(p, "Avatar URL", "avatarUrl", "avatar");
    const country = value(p, "Country", "country") || "Ei tietoa";
    const language = value(p, "Language", "language") || "Ei tietoa";
    const about = value(p, "About", "about", "Bio", "bio");
    const userId = value(p, "User ID", "userId", "uid");
    const secUid = value(p, "SecUID", "secUid");
    const created = value(p, "Account Created", "accountCreated", "created");

    $("nickname").textContent = nickname;
    $("handle").textContent = `@${username}`;
    $("country").textContent = country;
    $("language").textContent = language;

    if (avatar) {
      $("avatar").src = avatar;
      $("avatar").alt = `${nickname} profiilikuva`;
    } else {
      $("avatar").removeAttribute("src");
      $("avatar").alt = "";
    }

    if (about) {
      $("about").textContent = about;
      $("aboutWrap").classList.remove("hidden");
    } else {
      $("aboutWrap").classList.add("hidden");
    }

    $("followers").textContent = fmt(value(s, "Followers", "followers"));
    $("following").textContent = fmt(value(s, "Following", "following"));
    $("hearts").textContent = fmt(value(s, "Hearts", "hearts", "likes"));
    $("videos").textContent = fmt(value(s, "Videos", "videos"));
    $("friends").textContent = fullNumber(value(s, "Friends", "friends"));
    $("userId").textContent = userId || "–";
    $("secUid").textContent = secUid || "–";
    $("created").textContent = created || "–";

    $("profileLink").href = `https://www.tiktok.com/@${encodeURIComponent(username)}`;

    $("result").classList.remove("hidden");
    $("status").textContent = "";
  } catch (err) {
    $("status").className = "status error";
    $("status").textContent = err?.message || "Haku epäonnistui.";
  } finally {
    $("searchBtn").disabled = false;
  }
});
