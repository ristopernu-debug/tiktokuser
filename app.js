const API = "https://user.tikmatrix.com/api/user";
const $ = id => document.getElementById(id);

function cleanUsername(value="") {
  return value.trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}

function get(obj, ...keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
  }
  return null;
}

function compact(value) {
  const n = Number(value);
  return Number.isFinite(n)
    ? new Intl.NumberFormat("fi-FI",{notation:"compact",maximumFractionDigits:1}).format(n)
    : (value ?? "–");
}

function full(value) {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("fi-FI").format(n) : (value ?? "–");
}

$("form").addEventListener("submit", async e => {
  e.preventDefault();

  const username = cleanUsername($("username").value);
  if (!username) return;

  $("username").value = username;
  $("result").classList.add("hidden");
  $("status").className = "status";
  $("status").textContent = "Haetaan julkisia profiilitietoja…";
  $("searchBtn").disabled = true;

  try {
    const response = await fetch(`${API}?username=${encodeURIComponent(username)}`, {
      headers:{"Accept":"application/json"}
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Tietolähde ei palauttanut kelvollista vastausta.");
    }

    if (!response.ok || data?.error) {
      if (response.status === 503) {
        throw new Error("Hakuraja tuli vastaan. Odota hetki ja yritä uudelleen.");
      }
      throw new Error(data?.error || "Käyttäjää ei löytynyt.");
    }

    const p = data.profile || {};
    const s = data.stats || {};

    const nickname = get(p,"Nickname","nickname") || username;
    const avatar = get(p,"Avatar URL","avatarUrl","avatar");
    const country = get(p,"Country","country");
    const language = get(p,"Language","language");
    const about = get(p,"About","about","Bio","bio");

    $("nickname").textContent = nickname;
    $("handle").textContent = `@${username}`;
    $("country").textContent = country || "N/A";
    $("language").textContent = language || "N/A";

    if (avatar) {
      $("avatar").src = avatar;
      $("avatar").alt = `${nickname} profiilikuva`;
      $("avatar").style.visibility = "visible";
    } else {
      $("avatar").removeAttribute("src");
      $("avatar").alt = "";
      $("avatar").style.visibility = "hidden";
    }

    if (about) {
      $("about").textContent = about;
      $("aboutWrap").classList.remove("hidden");
    } else {
      $("aboutWrap").classList.add("hidden");
    }

    $("followers").textContent = compact(get(s,"Followers","followers"));
    $("following").textContent = compact(get(s,"Following","following"));
    $("hearts").textContent = compact(get(s,"Hearts","hearts","likes"));
    $("videos").textContent = compact(get(s,"Videos","videos"));
    $("friends").textContent = full(get(s,"Friends","friends"));

    $("userId").textContent = get(p,"User ID","userId","uid") || "–";
    $("secUid").textContent = get(p,"SecUID","secUid") || "–";
    $("created").textContent = get(p,"Account Created","accountCreated","created") || "–";

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
