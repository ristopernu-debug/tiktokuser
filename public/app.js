const form = document.getElementById("form");
const usernameInput = document.getElementById("username");
const submit = document.getElementById("submit");
const statusEl = document.getElementById("status");
const result = document.getElementById("result");

function cleanUsername(value="") {
  return value.trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}

function setStatus(text="", error=false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", error);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  result.classList.add("hidden");
  setStatus("");

  const username = cleanUsername(usernameInput.value);
  if (!username) {
    setStatus("Syötä käyttäjänimi.", true);
    return;
  }

  usernameInput.value = username;
  submit.disabled = true;
  submit.textContent = "Haetaan…";
  setStatus("Haetaan julkista profiilia…");

  try {
    const res = await fetch(`/api/analyze?username=${encodeURIComponent(username)}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Hakua ei voitu suorittaa.");

    document.getElementById("displayName").textContent = data.profile.displayName || username;
    document.getElementById("handle").textContent = `@${username}`;
    document.getElementById("profileLink").href = data.profile.url;

    const avatar = document.getElementById("avatar");
    const fallback = document.getElementById("avatarFallback");
    fallback.textContent = username.charAt(0).toUpperCase();

    if (data.profile.avatarUrl) {
      avatar.src = data.profile.avatarUrl;
      avatar.classList.remove("hidden");
      fallback.classList.add("hidden");
    } else {
      avatar.classList.add("hidden");
      fallback.classList.remove("hidden");
    }

    document.getElementById("country").textContent =
      data.location.country
        ? `${data.location.flag || "🌍"} ${data.location.country}`
        : "Ei riittävästi tietoa";

    document.getElementById("confidence").textContent =
      data.location.country && data.location.confidence
        ? `Arvio ${data.location.confidence} %`
        : "";

    document.getElementById("reason").textContent = data.location.reason;
    result.classList.remove("hidden");
    setStatus("");
  } catch (err) {
    setStatus(err.message || "Tapahtui virhe.", true);
  } finally {
    submit.disabled = false;
    submit.textContent = "Hae";
  }
});
