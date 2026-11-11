/* =========================================================
   BASIC HELPER
========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   DOM REFERENCES
========================================================= */

const sidebar = $("sidebar");
const sidebarOverlay = $("sidebarOverlay");

const input = $("claimInput");
const clearSearch = $("clearSearch");

const resultSection = $("resultSection");
const resultTitle = $("resultTitle");
const resultBadge = $("resultBadge");
const confidenceCard = $("confidenceCard");
const confidenceValue = $("confidenceValue");
const confidenceTrack = $("confidenceTrack");
const confidenceBar = $("confidenceBar");
const signalText = $("signalText");
const actionText = $("actionText");
const newsEvidence = $("newsEvidence");
const evidenceStatus = $("evidenceStatus");
const evidenceList = $("evidenceList");

const authModal = $("authModal");
const authSwitchLink = $("authSwitchLink");
const notificationToggle = $("notificationToggle");
const darkToggle = $("darkToggle");

const settingsPanel = $("settingsPanel");
const settingsActionBackdrop = $("settingsActionBackdrop");
const settingsActionTitle = $("settingsActionTitle");
const settingsActionSubtitle = $("settingsActionSubtitle");
const settingsActionContent = $("settingsActionContent");

let toastTimer;
let activeLanguage = "English";

function translateText(value) {
  const text = String(value ?? "");
  const messages = translations[activeLanguage]?.messages || {};
  if (messages[text]) return messages[text];
  if (activeLanguage !== "Hindi") return text;

  return Object.entries(messages)
    .sort(([first], [second]) => second.length - first.length)
    .reduce((translated, [source, target]) => translated.replaceAll(source, target), text)
    .replace(/\b(\d+) words analyzed\b/g, "$1 शब्दों का विश्लेषण किया गया");
}
/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

  const toast = $("toast");
  const toastText = $("toastText");

  if (!toast || !toastText) return;

  toastText.textContent = translateText(message);
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);

}

function showCheckNotification(title) {
  if (
    !notificationToggle.checked
    || !("Notification" in window)
    || Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    const notification = new Notification(`Fake News Detector: ${title}`, {
      body: translateText("Your check is complete. Open the browser to view the result.")
    });
    notification.addEventListener("click", () => {
      window.focus();
      notification.close();
    });
  } catch (error) {
    console.error("Could not show browser notification:", error);
    showToast("The browser could not display the notification.");
  }
}


function isLoggedIn() {
  return localStorage.getItem("fncDemoLoggedIn") === "true";
}


function getProfile() {
  try {
    return JSON.parse(localStorage.getItem("fncProfile") || "{}");
  } catch {
    return {};
  }
}

const ACCOUNT_STORAGE_KEY = "fncAccounts";
const PASSWORD_HASH_ITERATIONS = 210_000;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function getAccounts() {
  const savedAccounts = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (!savedAccounts) return [];

  const accounts = JSON.parse(savedAccounts);
  if (
    !Array.isArray(accounts) ||
    accounts.some((account) =>
      !account ||
      typeof account !== "object" ||
      typeof account.email !== "string" ||
      typeof account.salt !== "string" ||
      !/^[0-9a-f]{32}$/i.test(account.salt) ||
      typeof account.passwordHash !== "string" ||
      !/^[0-9a-f]{64}$/i.test(account.passwordHash)
    )
  ) {
    throw new Error("Saved account data is invalid. Clear this browser's saved account data and try again.");
  }
  return accounts;
}

function makePasswordSalt() {
  if (!window.crypto?.subtle || !window.crypto?.getRandomValues) {
    throw new Error("This browser cannot securely save demo credentials. Use the app on localhost in a modern browser.");
  }

  return Array.from(window.crypto.getRandomValues(new Uint8Array(16)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((byte) => parseInt(byte, 16)));
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PASSWORD_HASH_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  return Array.from(new Uint8Array(derivedBits))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
}


function updateAuthUI() {
  const loggedIn = isLoggedIn();
  const profile = getProfile();
  const source = (profile.name || profile.email || "U").trim();

  $("avatarLetter").textContent = source.charAt(0).toUpperCase() || "U";
  $("avatarBtn").title = profile.name || profile.email || "Account";
  $("openAuthBtn").classList.toggle("hidden", loggedIn);
  $("avatarBtn").classList.toggle("hidden", !loggedIn);
  $("sidebarLogin").classList.toggle("hidden", loggedIn);
  $("sidebarBottom").classList.toggle("hidden", !loggedIn);
}


$("avatarBtn").addEventListener("click", () => {
  settingsPanel.classList.add("open");
});


/* =========================================================
   DARK MODE
========================================================= */

function applyTheme(dark) {

  document.body.classList.toggle("dark", dark);

  darkToggle.checked = dark;

  $("themeBtn").innerHTML = dark
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';

  localStorage.setItem("fncDark", dark ? "true" : "false");

}


darkToggle.addEventListener("change", () => {
  applyTheme(darkToggle.checked);
  settingsPanel.classList.remove("open");
});


$("themeBtn").addEventListener("click", () => {
  applyTheme(!document.body.classList.contains("dark"));
});


/* =========================================================
   SIDEBAR
========================================================= */

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("show");
}


function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("show");
}


$("menuBtn").addEventListener("click", openSidebar);
$("closeSidebar").addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);


function openAuth(mode = "login") {
  authModal.classList.add("show");
  document.body.classList.add("modal-open");
  setAuthMode(mode);
}


function closeAuth() {
  authModal.classList.remove("show");
  document.body.classList.remove("modal-open");
}


$("openAuthBtn").addEventListener("click", () => openAuth("login"));

$("sidebarLogin").addEventListener("click", () => {
  closeSidebar();
  openAuth("login");
});

$("closeAuth").addEventListener("click", closeAuth);

authModal.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuth();
});


function setAuthMode(mode) {
  const signup = mode === "signup";

  $("authHeading").textContent = translateText(signup ? "Create Account" : "Sign In");
  $("authSubtitle").textContent = translateText(signup
    ? "Demo account stored only in this browser."
    : "Sign in with the email and password saved in this browser.");
  $("authSubmit").textContent = translateText(signup ? "Create Account" : "Login");
  $("authSubmit").dataset.mode = signup ? "signup" : "login";
  $("nameField").classList.toggle("hidden", !signup);
  $("confirmField").classList.toggle("hidden", !signup);
  $("loginOptions").classList.toggle("hidden", signup);

  $("switchPrompt").textContent = translateText(signup ? "Already have an account?" : "Need an account?");
  authSwitchLink.textContent = translateText(signup ? "Sign In" : "Create one");
  authSwitchLink.dataset.auth = signup ? "login" : "signup";
}


authSwitchLink.addEventListener("click", () => {
  setAuthMode(authSwitchLink.dataset.auth);
});


$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const signup = $("authSubmit").dataset.mode === "signup";
  const email = normalizeEmail($("authEmail").value);
  const password = $("authPassword").value;
  const submitButton = $("authSubmit");

  if (!email || !password) {
    showToast("Please fill in all required fields.");
    return;
  }

  if (signup) {
    const name = $("authName").value.trim();
    const confirmPassword = $("authConfirmPassword").value;

    if (!name) {
      showToast("Please enter your name.");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match.");
      return;
    }

  }

  submitButton.disabled = true;
  try {
    const accounts = getAccounts();
    const existingAccount = accounts.find(
      (account) => normalizeEmail(account.email || "") === email
    );

    if (signup && existingAccount) {
      setAuthMode("login");
      $("authEmail").value = email;
      $("authPassword").value = "";
      $("authPassword").focus();
      showToast("You already have an account. Please sign in.");
      return;
    }

    if (!signup && !existingAccount) {
      showToast("Email or password is incorrect.");
      return;
    }

    if (signup) {
      const salt = makePasswordSalt();
      const passwordHash = await hashPassword(password, salt);
      const latestAccounts = getAccounts();

      if (latestAccounts.some((account) => normalizeEmail(account.email || "") === email)) {
        setAuthMode("login");
        $("authEmail").value = email;
        $("authPassword").value = "";
        showToast("You already have an account. Please sign in.");
        return;
      }

      saveAccounts([...latestAccounts, { name, email, salt, passwordHash }]);
      $("authForm").reset();
      setAuthMode("login");
      $("authEmail").value = email;
      $("authPassword").focus();
      showToast("Account created successfully. Please sign in.");
      return;
    }

    const passwordHash = await hashPassword(password, existingAccount.salt);
    if (passwordHash !== existingAccount.passwordHash) {
      showToast("Email or password is incorrect.");
      return;
    }

    localStorage.setItem(
      "fncProfile",
      JSON.stringify({ name: existingAccount.name || "", email: existingAccount.email })
    );
    localStorage.setItem("fncDemoLoggedIn", "true");
    $("authForm").reset();
    updateAuthUI();
    closeAuth();
    showToast("Signed in.");
  } catch (error) {
    console.error("Could not complete demo account action:", error);
    showToast(error.message || "Could not complete this account action.");
  } finally {
    submitButton.disabled = false;
  }
});


$("forgotPasswordBtn").addEventListener("click", () => {
  showToast("Password recovery is not available.");
});


/* =========================================================
   INPUT CLEAR
========================================================= */

function updateClearButton() {
  clearSearch.classList.toggle("show", input.value.trim().length > 0);
}


input.addEventListener("input", updateClearButton);


clearSearch.addEventListener("click", () => {
  input.value = "";
  updateClearButton();
  input.focus();
});


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

  return String(value).replace(/[&<>'"]/g, (char) => {

    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char];

  });

}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}


/* =========================================================
   REAL ML ANALYSIS
========================================================= */

const resultPopup = $("resultPopup");
const resultChecks = $("resultChecks");
const resultIconI = $("resultIconI");
const articleDetails = $("articleDetails");
const resultSources = $("resultSources");


function openResult() {
  resultSection.classList.remove("hidden");
  resultSection.classList.add("show");
  resultSection.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}


function closeResult() {
  resultSection.classList.remove("show");
  resultSection.classList.add("hidden");
  resultSection.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}


$("closeResult").addEventListener("click", closeResult);

resultSection.addEventListener("click", (event) => {
  if (event.target === resultSection) closeResult();
});


function renderChecks(items) {
  resultChecks.innerHTML = items.map((item) => `
    <li class="${item.ok ? "ok" : "warn"}">
      <span class="check-icon"><i class="fa-solid ${item.icon}"></i></span>
      <span>${escapeHTML(translateText(item.text))}</span>
      <i class="fa-solid ${item.ok ? "fa-check" : "fa-triangle-exclamation"} check-mark"></i>
    </li>
  `).join("");
}


function buildSourceLinks(query) {
  const searchText = query.trim().slice(0, 200);
  const factCheckUrl = new URL("https://www.google.com/search");
  const sourceSearchUrl = new URL("https://news.google.com/search");

  factCheckUrl.searchParams.set("q", `${searchText} fact check`);
  sourceSearchUrl.searchParams.set("q", searchText);
  $("factCheckLink").href = factCheckUrl.href;
  $("independentSourcesLink").href = sourceSearchUrl.href;
  resultSources.classList.remove("hidden");
}


function checkListedAuthor() {
  const articleUrl = normalizeArticleUrl(input.value.trim());

  if (!articleUrl) {
    showToast("Paste an article URL to check its listed author.");
    input.focus();
    return;
  }

  investigate(articleUrl);
}


function crossReferenceSources() {
  const value = input.value.trim();

  if (!value) {
    showToast("Enter a claim or article URL to search for other coverage.");
    input.focus();
    return;
  }

  const query = normalizeArticleUrl(value) || value;
  resetResultExtras();
  setResult({
    state: "",
    icon: "fa-link",
    title: "Compare source coverage",
    subtitle: "Search for fact checks and other news coverage of this claim.",
    badge: "SOURCE SEARCH",
    action: "Search results are leads, not proof. Compare dates, evidence, and the original sources yourself.",
    checks: [
      { ok: true, icon: "fa-magnifying-glass", text: "Fact-check search prepared" },
      { ok: true, icon: "fa-newspaper", text: "News coverage search prepared" }
    ]
  });
  buildSourceLinks(query);
  openResult();
}


function resetResultExtras() {
  confidenceCard.classList.add("hidden");
  articleDetails.classList.add("hidden");
  resultSources.classList.add("hidden");
  newsEvidence.classList.add("hidden");
  newsEvidence.classList.remove("empty");
  evidenceList.innerHTML = "";
}

function renderNewsEvidence(evidence) {
  if (!evidence || typeof evidence !== "object") return;

  const articles = Array.isArray(evidence.articles) ? evidence.articles : [];
  evidenceList.innerHTML = articles
    .map((article) => {
      const safeUrl = safeHttpUrl(article.url);
      if (!safeUrl) return "";

      const description = article.description
        ? `<p>${escapeHTML(article.description)}</p>`
        : "";
      const date = article.published_at
        ? `<small>${escapeHTML(article.published_at)}</small>`
        : "";

      return `
        <li>
          <a href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">
            ${escapeHTML(article.title || "Untitled article")}
          </a>
          <span>${escapeHTML(article.publisher || "Unknown publisher")} ${date}</span>
          ${description}
        </li>
      `;
    })
    .join("");

  const hasArticles = evidenceList.childElementCount > 0;
  if (!evidence.available && !hasArticles) {
    newsEvidence.classList.add("hidden");
    newsEvidence.classList.remove("empty");
    evidenceStatus.textContent = "";
    return;
  }

  newsEvidence.classList.toggle("empty", !hasArticles);
  evidenceStatus.textContent = hasArticles
    ? translateText(evidence.message || "Related news coverage.")
    : translateText("No related articles found. Try the search links below.");
  newsEvidence.classList.remove("hidden");
}


function setResult({
  state,
  icon,
  title,
  subtitle,
  badge,
  action,
 checks,
 confidence = null
}) {
 resultPopup.className = "result-popup" + (state ? " " + state : "");
  resultIconI.className = "fa-solid " + icon;

  resultTitle.textContent = translateText(title);
  signalText.textContent = translateText(subtitle);
  actionText.textContent = translateText(action);

  resultBadge.textContent = translateText(badge);
  resultBadge.className = "result-badge" + (state ? " " + state : "");

  setConfidence(confidence);

  renderChecks(checks || []);
}


function setConfidence(confidence) {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    confidenceCard.classList.add("hidden");
    return;
  }

  const percentage = Math.round(confidence * 100);
  confidenceValue.textContent = `${percentage}%`;
  confidenceBar.style.width = `${percentage}%`;
  confidenceTrack.setAttribute("aria-valuenow", String(percentage));
  confidenceCard.classList.remove("hidden");
}


function normalizeArticleUrl(value) {
  const candidate = value.trim();

  if (/^https?:\/\//i.test(candidate)) return candidate;

  const bareDomain = /^(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s]*)?$/i;
  return bareDomain.test(candidate) ? `https://${candidate}` : null;
}


async function investigate(value = input.value.trim()) {

  if (!value) {
    showToast("Enter a claim or article URL first.");
    input.focus();
    return;
  }

  const articleUrl = normalizeArticleUrl(value);
  const isUrl = articleUrl !== null;
  const analysisInput = articleUrl || value;
  resetResultExtras();

  setResult({
    state: "",
    icon: "fa-spinner fa-spin",
    title: "Checking...",
    subtitle: isUrl
      ? "Reading the article from this URL."
      : "Checking the claim text.",
    badge: "CHECKING",
    action: "One moment...",
    checks: []
  });

  openResult();

  input.value = "";
  updateClearButton();

  try {

    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: analysisInput, is_url: isUrl })
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("The Flask server returned an invalid response.");
    }

    if (!response.ok) {
      throw new Error(data.error || "The ML backend returned an error.");
    }

    renderNewsEvidence(data.evidence);

    let authorCheck = null;
    if (isUrl) {
      const article = data.article;
      const hasArticleDetails =
        article &&
        typeof article.title === "string" &&
        typeof article.publisher === "string" &&
        typeof article.preview === "string" &&
        typeof article.url === "string";

      if (!hasArticleDetails) {
        throw new Error("The backend did not return article details.");
      }

      const listedAuthor =
        typeof article.author === "string" ? article.author.trim() : "";
      authorCheck = {
        ok: Boolean(listedAuthor),
        icon: "fa-user",
        text: listedAuthor ? "Listed author found in article metadata" : "No listed author metadata found"
      };
      $("articleAuthor").textContent = listedAuthor || "No author metadata found";
      $("articleTitle").textContent = article.title;
      $("articlePublisher").textContent = article.publisher;
      $("articleSourceLink").href = article.url;
      $("articlePreview").textContent = article.preview;
      articleDetails.classList.remove("hidden");
      buildSourceLinks(article.title || article.preview || value);
    } else {
      buildSourceLinks(value);
    }

    const prediction = data.prediction;
    if (typeof data.uncertain !== "boolean") {
      throw new Error("Uncertainty status was not returned correctly by the backend.");
    }

    const abstained = data.uncertain;
    const hasValidConfidence =
      Number.isFinite(data.confidence) && data.confidence >= 0 && data.confidence <= 1;
    if (
      (abstained && (data.confidence !== null || prediction !== null)) ||
      (!abstained && (!hasValidConfidence || (prediction !== true && prediction !== false)))
    ) {
      throw new Error("The backend returned an invalid confidence score.");
    }

    const words = Number(data.word_count) || analysisInput.split(/\s+/).filter(Boolean).length;

    const wordsCheck = {
      ok: true,
      icon: "fa-file-lines",
      text: `${words} words analyzed`
    };
    if (data.uncertain) {
      const uncertaintyMessages = {
        unsupported_language: {
          reason: "Hindi text is not currently supported because the model was trained on English text.",
          action: "Translate the claim into English before checking it; this model does not verify facts."
        },
        unrecognized_text: {
          reason: "There is not enough recognizable claim text to analyze.",
          action: "Enter a meaningful claim or a few more details."
        },
        opinion_like: {
          reason: "This sounds subjective, speculative, or about a person's mental state, so it is not suitable for TRUE/FAKE text classification.",
          action: "For a fact-check, enter a specific claim that can be checked against evidence."
        },
        ambiguous: {
          reason: "The wording is unclear or uncertain.",
          action: "Add context and state the specific claim you want to check."
        },
        model_disagreement: {
          reason: "The model outputs point in different directions.",
          action: "The model estimates are inconclusive. Check reliable sources; this is not a fact-check."
        },
        weak_signal: {
          reason: "The model signal is too weak for a clear result.",
          action: "Add context and check reliable sources; this is not a fact-check."
        }
      };
      const uncertainty = uncertaintyMessages[data.uncertain_reason] || {
        reason: "The model could not produce a clear result.",
        action: "Add context and check reliable sources; this is not a fact-check."
      };
      setResult({
        state: "uncertain",
        icon: "fa-circle-question",
        title: "UNCERTAIN",
        subtitle: uncertainty.reason,
        badge: "NOT VERIFIED",
        action: uncertainty.action,
        confidence: null,
        checks: [
          wordsCheck,
          ...(authorCheck ? [authorCheck] : []),
          { ok: false, icon: "fa-link", text: "Verify with independent, trusted sources" }
        ]
      });

      showCheckNotification("Check complete");
      return;
    }


    if (prediction === true) {

      setResult({
        state: "real",
        icon: "fa-shield-halved",
        title: "Leans TRUE",
        subtitle: "This is a text-based estimate, not a fact-check.",
        badge: "TEXT PATTERN",
        action: "For important claims, check reliable sources before sharing.",
        confidence: data.confidence,
        checks: [
          { ok: true, icon: "fa-check", text: "The model's text analysis leans TRUE" },
          ...(isUrl ? [{ ok: true, icon: "fa-file-lines", text: "Article text was read from the link" }] : []),
          wordsCheck,
          ...(authorCheck ? [authorCheck] : []),
          { ok: false, icon: "fa-link", text: "Verify with a trusted source before sharing" }
        ]
      });

    } else {

      setResult({
        state: "fake",
        icon: "fa-triangle-exclamation",
        title: "Leans FAKE",
        subtitle: "This is a text-based estimate, not a fact-check.",
        badge: "TEXT PATTERN",
        action: "Check reliable sources before deciding whether the claim is false.",
        confidence: data.confidence,
        checks: [
          { ok: false, icon: "fa-circle-exclamation", text: "The model's text analysis leans FAKE" },
          ...(isUrl ? [{ ok: true, icon: "fa-file-lines", text: "Article text was read from the link" }] : []),
          wordsCheck,
          ...(authorCheck ? [authorCheck] : []),
          { ok: false, icon: "fa-link", text: "Do not share before checking the source" }
        ]
      });

    }

    showCheckNotification(prediction ? "Model leans TRUE" : "Model leans FAKE");

  } catch (error) {

    console.error("ML connection error:", error);
    resetResultExtras();

    if (!input.value) {
      input.value = value;
      updateClearButton();
    }

    const connectionFailed = error instanceof TypeError && error.message === "Failed to fetch";

    setResult({
      state: "fake",
      icon: "fa-circle-exclamation",
      title: "ERROR",
      subtitle: connectionFailed
        ? "The Flask API could not be reached."
        : error.message || "Unable to connect to the Python backend.",
      badge: "ERROR",
      action: "Make sure Flask is running with: .\\venv\\Scripts\\python.exe app.py",
      checks: []
    });

    showCheckNotification("Check could not be completed");

  }

}


/* =========================================================
   INVESTIGATE BUTTON
========================================================= */

$("investigateBtn").addEventListener("click", () => investigate());


input.addEventListener("keydown", (event) => {

  if (event.key === "Enter") {
    event.preventDefault();
    investigate();
  }

});


/* =========================================================
   METHOD CARDS
========================================================= */

document.querySelectorAll(".method-card").forEach((card) => {

  card.addEventListener("click", async () => {

    const method = card.dataset.method;

    if (method === "share") {

      const shareData = {
        title: "Fake News Detector",
        text: "Take a look at the Fake News Detector website.",
        url: window.location.href
      };

      if (navigator.share) {

        try {
          await navigator.share(shareData);
          showToast("Share sheet opened.");
        } catch {
          /* User cancelled share. */
        }

      } else {

        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast("Link copied. Share it anywhere.");
        } catch {
          showToast("Share is not available in this browser.");
        }

      }

      return;

    }

    input.focus();

    if (method === "link") {

      input.placeholder = translateText("Paste the article URL here...");

      showToast("Paste an article URL above, then select Investigate.");

    }

    if (method === "search") {
      input.placeholder = translateText("Type the claim or paste news text here...");
    }

    input.scrollIntoView({ behavior: "smooth", block: "center" });

  });

});


/* =========================================================
   SETTINGS PANEL
========================================================= */

document.querySelector('[data-section="settings"]').addEventListener("click", () => {
  closeSidebar();
  settingsPanel.classList.add("open");
});


$("closeSettings").addEventListener("click", () => {
  settingsPanel.classList.remove("open");
});


/* =========================================================
   SETTINGS ACTION MODAL
========================================================= */

function openSettingsAction(title, subtitle, contentHTML) {

  settingsActionTitle.textContent = translateText(title);
  settingsActionSubtitle.textContent = translateText(subtitle);
  settingsActionContent.innerHTML = contentHTML;

  settingsActionBackdrop.classList.add("show");
  settingsActionBackdrop.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

}


function closeSettingsAction() {

  settingsActionBackdrop.classList.remove("show");
  settingsActionBackdrop.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");

}


$("closeSettingsAction").addEventListener("click", closeSettingsAction);


settingsActionBackdrop.addEventListener("click", (event) => {

  if (event.target === settingsActionBackdrop) {
    closeSettingsAction();
  }

});


/* =========================================================
   LANGUAGE
========================================================= */

const translations = {

  English: {

    navHome: "Home",
    navAbout: "About",
    signIn: "Sign In",

    dashboard: "Dashboard",
    history: "History",
    settings: "Settings",
    login: "Login",
    logout: "Logout",

    heroTitle: "Don't Just Read It.",

    heroDescription:
      "Check a claim, article or URL and uncover signals that help you decide whether the information looks Real, Fake or Uncertain.",

    investigate: "Investigate",

    quickAuthorship: "Find listed author",
    quickArticles: "Check articles",
    quickSources: "Cross-Reference Sources",
    aiDisclaimer: "AI can make mistakes. Verify important claims with trusted sources.",
    publisher: "Publisher",
    authorLabel: "Listed author",
    articlePreview: "Extracted text preview",
    openArticle: "Open original article",
    sourceLinks: "Look up this claim",
    factChecks: "Search fact checks",
    independentSources: "Search news coverage",
    authorLabel: "Listed author",

    methodsTitle: "What do you want to check?",

    methodsDescription:
      "Choose a link, claim, or sharing option.",

    linkTitle: "Check by Link",
    linkDescription: "Paste an article or website URL and inspect its source signals.",
    linkAction: "Start link check",

    searchTitle: "Search a Claim",
    searchDescription: "Enter a statement and compare it against your verification workflow.",
    searchAction: "Search claim",

    shareTitle: "Share this website",
    shareDescription: "Send a link to this website to someone.",
    shareAction: "Share link",

    page: {
      pageTitle: "Fake News Detector | Investigation Dashboard",
      brandTagline: "Detect • Verify • Investigate",
      sidebarCaseLabel: "CASE FILE SYSTEM",
      sidebarTitle: "Investigation",
      sidebarMainLabel: "Main",
      sidebarAccountLabel: "Preferences",
      heroTitleEmphasis: "Investigate It.",
      methodsKicker: "THREE WAYS TO INVESTIGATE",
      resultBadge: "RESULT",
      resultTitle: "Check result",
      signalText: "Your result appears here after you run a check.",
      actionText: "Enter a claim or article URL and select Investigate.",
      articleAuthor: "No author metadata found",
      confidenceLabel: "MODEL ESTIMATE",
      confidenceDescription: "An estimate for the model's label, not a measure of truth",
      confidenceDisclaimer: "This score cannot confirm whether the claim is true or false.",
      evidenceTitle: "Related news coverage",
      evidenceDisclaimer: "Not a fact-check verdict",
      fastText: "Fast",
      fastDescription: "investigation flow",
      multiText: "ML model",
      multiDescription: "text-pattern signal",
      historyStatText: "History",
      historyStatDescription: "of your checks",
      privateText: "Local",
      privateDescription: "preferences",
      aboutKicker: "ABOUT",
      aboutTitle: "Check a claim before sharing it.",
      aboutDescription: "Fake News Detector gives you a quick first check on suspicious claims and articles, and a starting point for deeper verification.",
      missionTitle: "Our mission",
      missionDescription: "Make misinformation easier to spot by giving everyone a simple first check for claims and news articles.",
      howItWorksTitle: "How it works",
      howItWorksDescription: "The model uses patterns learned from its training data to classify the text as likely real, likely fake, or uncertain. This is a machine-learning estimate, not a fact-check: it does not verify whether a claim is true.",
      limitationsTitle: "Limitations",
      limitationsDescription: "The model is trained on English text, does not currently support Hindi claims, and does not verify facts. Cross-check important claims with trusted publishers and official sources before sharing.",
      dataTitle: "Your data",
      dataDescription: "Investigation history is stored in the local SQLite database and may be visible to other users of this server. This app does not currently provide user accounts or per-user access controls.",
      authKicker: "CASE FILE ACCESS",
      nameLabel: "Full name",
      emailLabel: "Email",
      passwordLabel: "Password",
      confirmLabel: "Confirm password",
      rememberText: "Remember me",
      forgotPasswordBtn: "Forgot password?",
      authPrivacy: "Demo only: accounts are stored in this browser, and passwords are hashed locally. This is not secure server-side authentication.",
      settingsKicker: "PREFERENCES",
      settingsPanelTitle: "Settings",
      appearanceGroupLabel: "Appearance",
      darkText: "Dark mode",
      darkDescription: "Use a darker theme that is easier on the eyes.",
      languageGroupLabel: "Language & notifications",
      languageText: "Language",
      notificationsText: "Notifications",
      notificationsDescription: "Show a browser alert when a check finishes. Keep the browser open.",
      historyGroupLabel: "History & data",
      historySettingTitle: "History",
      historySettingDescription: "Review prior investigations and saved results.",
      settingNoteText: "Preferences are stored in this browser. Investigation history is stored on this server and is not separated by user accounts.",
      settingsActionKicker: "SETTINGS",
      settingsActionTitle: "Settings",
      changeLanguageButton: "Change",
      viewHistoryButton: "View",
      toastText: "Done",
      footerText: "© 2026 Fake News Detector • Investigation Dashboard"
    },

    attributes: {
      claimInput: { placeholder: "Enter a claim or paste an article URL to investigate..." },
      menuBtn: { "aria-label": "Open sidebar" },
      themeBtn: { "aria-label": "Toggle dark mode" },
      avatarBtn: { "aria-label": "Open settings" },
      closeSidebar: { "aria-label": "Close sidebar" },
      clearSearch: { "aria-label": "Clear" },
      closeResult: { "aria-label": "Close result" },
      confidenceCard: { "aria-label": "Model estimate" },
      confidenceTrack: { "aria-label": "Model estimate" },
      articleDetails: { "aria-label": "Fetched article details" },
      newsEvidence: { "aria-label": "Related news coverage" },
      authName: { placeholder: "Your name" },
      authEmail: { placeholder: "you@example.com" },
      authPassword: { placeholder: "Enter your password" },
      authConfirmPassword: { placeholder: "Repeat your password" },
      closeAuth: { "aria-label": "Close" },
      closeSettings: { "aria-label": "Close settings" },
      closeSettingsAction: { "aria-label": "Close" }
    },

    messages: {
      "The browser could not display the notification.": "ब्राउज़र सूचना नहीं दिखा सका।",
      "Please fill in all required fields.": "कृपया सभी ज़रूरी फ़ील्ड भरें।",
      "Please enter your name.": "कृपया अपना नाम लिखें।",
      "Passwords do not match.": "दोनों पासवर्ड एक जैसे नहीं हैं।",
      "You already have an account. Please sign in.": "इस ईमेल से खाता पहले से बना है। कृपया साइन इन करें।",
      "Email or password is incorrect.": "ईमेल या पासवर्ड गलत है।",
      "Account created successfully. Please sign in.": "खाता बन गया है। कृपया साइन इन करें।",
      "Signed in.": "आप साइन इन हो गए हैं।",
      "Could not complete this account action.": "खाते से जुड़ी यह कार्रवाई पूरी नहीं हो सकी।",
      "Password recovery is not available.": "पासवर्ड वापस पाने की सुविधा उपलब्ध नहीं है।",
      "Paste an article URL to check its listed author.": "लेख में दिए लेखक की जाँच के लिए लेख का वेब पता डालें।",
      "Enter a claim or article URL to search for other coverage.": "अन्य समाचार खोजने के लिए दावा या लेख का वेब पता लिखें।",
      "Enter a claim or article URL first.": "पहले कोई दावा या लेख का वेब पता लिखें।",
      "Share sheet opened.": "साझा करने का विकल्प खुल गया।",
      "Link copied. Share it anywhere.": "लिंक कॉपी हो गया है। अब इसे कहीं भी साझा करें।",
      "Share is not available in this browser.": "इस ब्राउज़र में साझा करने की सुविधा उपलब्ध नहीं है।",
      "Paste an article URL above, then select Investigate.": "ऊपर लेख का वेब पता डालें, फिर जाँच करें चुनें।",
      "Logged out.": "आप साइन आउट हो गए हैं।",
      "Notifications disabled.": "सूचनाएँ बंद कर दी गई हैं।",
      "This browser does not support notifications.": "यह ब्राउज़र सूचनाओं का समर्थन नहीं करता।",
      "Allow notifications in your browser settings to enable them.": "सूचनाएँ चालू करने के लिए ब्राउज़र सेटिंग्स में अनुमति दें।",
      "Notification permission was not granted.": "सूचनाएँ दिखाने की अनुमति नहीं मिली।",
      "You will be notified when a check finishes.": "जाँच पूरी होने पर आपको सूचना मिलेगी।",
      "Could not enable browser notifications.": "ब्राउज़र सूचनाएँ चालू नहीं हो सकीं।",
      "History cleared.": "जाँच का इतिहास मिटा दिया गया।",
      "Could not clear investigation history.": "जाँच का इतिहास नहीं मिटाया जा सका।",
      "Language set to Hindi.": "भाषा हिंदी पर सेट कर दी गई है।",
      "Language set to English.": "भाषा अंग्रेज़ी पर सेट कर दी गई है।",
      "Create Account": "खाता बनाएँ",
      "Sign In": "साइन इन करें",
      "Login": "लॉगिन",
      "Your check is complete. Open the browser to view the result.": "जाँच पूरी हो गई है। नतीजा देखने के लिए ब्राउज़र खोलें।",
      "Already have an account?": "क्या आपका खाता पहले से है?",
      "Need an account?": "क्या आपको नया खाता बनाना है?",
      "Create one": "खाता बनाएँ",
      "Demo account stored only in this browser.": "डेमो खाता केवल इसी ब्राउज़र में सहेजा जाएगा।",
      "Sign in with the email and password saved in this browser.": "इस ब्राउज़र में सहेजे गए ईमेल और पासवर्ड से साइन इन करें।",
      "Enter a claim or article URL and select Investigate.": "दावा या लेख का वेब पता लिखें और जाँच करें चुनें।",
      "Checking...": "जाँच हो रही है...",
      "Reading the article from this URL.": "इस वेब पते से लेख पढ़ा जा रहा है।",
      "Checking the claim text.": "दावे के पाठ की जाँच हो रही है।",
      "One moment...": "कृपया प्रतीक्षा करें...",
      "The Flask server returned an invalid response.": "Flask सर्वर से मिला जवाब मान्य नहीं है।",
      "The ML backend returned an error.": "मशीन लर्निंग सेवा में त्रुटि हुई।",
      "The backend returned an invalid confidence score.": "बैकएंड से मिला भरोसे का स्कोर मान्य नहीं है।",
      "The backend did not return article details.": "बैकएंड से लेख का विवरण नहीं मिला।",
      "Uncertainty status was not returned correctly by the backend.": "बैकएंड से अनिश्चितता की स्थिति सही ढंग से नहीं मिली।",
      "Prediction was not returned correctly by the backend.": "बैकएंड से अनुमान सही ढंग से नहीं मिला।",
      "There is not enough recognizable claim text to analyze.": "विश्लेषण के लिए दावे का पर्याप्त पहचाने जाने योग्य पाठ नहीं है।",
      "Hindi text is not currently supported because the model was trained on English text.": "मॉडल को अंग्रेज़ी पाठ पर प्रशिक्षित किया गया है, इसलिए अभी हिंदी पाठ समर्थित नहीं है।",
      "Translate the claim into English before checking it; this model does not verify facts.": "जाँच से पहले दावे का अंग्रेज़ी में अनुवाद करें; यह मॉडल तथ्यों की पुष्टि नहीं करता।",
      "Enter a meaningful claim or a few more details.": "कोई स्पष्ट दावा या कुछ और विवरण लिखें।",
      "This sounds subjective or opinion-based; the model cannot verify opinions.": "यह निजी राय जैसा है; मॉडल राय की पुष्टि नहीं कर सकता।",
      "This sounds subjective, speculative, or about a person's mental state, so it is not suitable for TRUE/FAKE text classification.": "यह निजी राय, अटकल या किसी व्यक्ति की मानसिक स्थिति से जुड़ा लगता है, इसलिए इसे सही/गलत पाठ-वर्गीकरण के लिए इस्तेमाल नहीं किया जा सकता।",
      "For a fact-check, enter a specific claim that can be checked against evidence.": "तथ्य-जाँच के लिए ऐसा स्पष्ट दावा लिखें जिसे प्रमाणों से परखा जा सके।",
      "The wording is unclear or uncertain.": "शब्दों का अर्थ स्पष्ट नहीं है या दावा अनिश्चित है।",
      "Add context and state the specific claim you want to check.": "थोड़ा संदर्भ दें और वह स्पष्ट दावा लिखें जिसकी जाँच करनी है।",
      "The model outputs point in different directions.": "मॉडल के नतीजे एक-दूसरे से अलग हैं।",
      "The model estimates are inconclusive. Check reliable sources; this is not a fact-check.": "मॉडल का अनुमान निर्णायक नहीं है। विश्वसनीय स्रोत देखें; यह तथ्य-जाँच नहीं है।",
      "The model signal is too weak for a clear result.": "स्पष्ट नतीजे के लिए मॉडल का संकेत बहुत कमज़ोर है।",
      "Add context and check reliable sources; this is not a fact-check.": "थोड़ा संदर्भ जोड़ें और विश्वसनीय स्रोत देखें; यह तथ्य-जाँच नहीं है।",
      "The model could not produce a clear result.": "मॉडल स्पष्ट नतीजा नहीं दे सका।",
      "Verify with independent, trusted sources": "स्वतंत्र और विश्वसनीय स्रोतों से पुष्टि करें",
      "Leans TRUE": "सही होने की संभावना",
      "Leans FAKE": "गलत होने की संभावना",
      "This is a text-based estimate, not a fact-check.": "यह पाठ पर आधारित अनुमान है, तथ्य-जाँच नहीं।",
      "For important claims, check reliable sources before sharing.": "ज़रूरी दावे साझा करने से पहले विश्वसनीय स्रोतों से जाँचें।",
      "Check reliable sources before deciding whether the claim is false.": "दावे को गलत मानने से पहले विश्वसनीय स्रोतों से जाँचें।",
      "The model's text analysis leans TRUE": "पाठ के मॉडल-विश्लेषण में सही होने का संकेत है",
      "The model's text analysis leans FAKE": "पाठ के मॉडल-विश्लेषण में गलत होने का संकेत है",
      "Article text was read from the link": "लेख का पाठ लिंक से पढ़ा गया",
      "Verify with a trusted source before sharing": "साझा करने से पहले विश्वसनीय स्रोत से पुष्टि करें",
      "Do not share before checking the source": "स्रोत की जाँच किए बिना इसे साझा न करें",
      "Listed author found in article metadata": "लेख के मेटाडेटा में लेखक का नाम मिला",
      "No listed author metadata found": "लेख के मेटाडेटा में लेखक का नाम नहीं मिला",
      "No author metadata found": "लेखक का विवरण नहीं मिला",
      "Compare source coverage": "विभिन्न स्रोतों की खबरों की तुलना करें",
      "Search for fact checks and other news coverage of this claim.": "इस दावे की तथ्य-जाँच और अन्य समाचार खोजें।",
      "Fact-check search prepared": "तथ्य-जाँच की खोज तैयार है",
      "News coverage search prepared": "समाचारों की खोज तैयार है",
      "Search results are leads, not proof. Compare dates, evidence, and the original sources yourself.": "खोज नतीजे केवल सुराग हैं, प्रमाण नहीं। तारीखों, साक्ष्यों और मूल स्रोतों की स्वयं तुलना करें।",
      "No investigations saved yet.": "अभी तक कोई जाँच सहेजी नहीं गई है।",
      "Run a news analysis and it will appear here.": "समाचार का विश्लेषण करें; वह यहाँ दिखाई देगा।",
      "Loading investigation history...": "जाँच का इतिहास लोड हो रहा है...",
      "Investigation history": "जाँच का इतिहास",
      "Stored in the local SQLite database on this server; records are shared with other users of this local app.": "इस सर्वर के स्थानीय SQLite डेटाबेस में सहेजा जाता है; इस ऐप के अन्य उपयोगकर्ता भी ये रिकॉर्ड देख सकते हैं।",
      "Could not load investigation history.": "जाँच का इतिहास लोड नहीं हो सका।",
      "Related article": "संबंधित लेख",
      "Unknown publisher": "अज्ञात प्रकाशक",
      "Clear history": "इतिहास मिटाएँ",
      "Clear investigation history shared by all users of this local app?": "क्या इस स्थानीय ऐप के सभी उपयोगकर्ताओं के साथ साझा किया गया जाँच इतिहास मिटाएँ?",
      "ERROR": "त्रुटि",
      "The Flask API could not be reached.": "Flask API तक पहुँचा नहीं जा सका।",
      "Unable to connect to the Python backend.": "Python बैकएंड से संपर्क नहीं हो सका।",
      "Make sure Flask is running with: .\\venv\\Scripts\\python.exe app.py": "जाँचें कि Flask इस कमांड से चल रहा है: .\\venv\\Scripts\\python.exe app.py",
      "Check complete": "जाँच पूरी हुई",
      "Check could not be completed": "जाँच पूरी नहीं हो सकी",
      "Model leans TRUE": "मॉडल के अनुसार सही होने की संभावना",
      "Model leans FAKE": "मॉडल के अनुसार गलत होने की संभावना",
      "This result is uncertain.": "यह नतीजा अनिश्चित है।",
      "words analyzed": "शब्दों का विश्लेषण किया गया",
      "TRUE": "सही",
      "FAKE": "गलत",
      "NOT VERIFIED": "पुष्टि नहीं हुई",
      "TEXT PATTERN": "पाठ का पैटर्न",
      "UNCERTAIN": "अनिश्चित",
      "LIKELY REAL": "सही होने की संभावना",
      "LIKELY FAKE": "गलत होने की संभावना",
      "CHECKING": "जाँच जारी",
      "RESULT": "नतीजा",
      "Language": "भाषा",
      "Choose your preferred interface language.": "अपनी पसंद की भाषा चुनें।",
      "Save language": "भाषा सहेजें",
      "Paste the article URL here...": "लेख का वेब पता यहाँ डालें...",
      "Type the claim or paste news text here...": "दावा लिखें या समाचार का पाठ यहाँ डालें...",
      "Related news coverage.": "इससे जुड़ी समाचार कवरेज।",
      "No related articles found. Try the search links below.": "कोई संबंधित लेख नहीं मिला। नीचे दिए खोज लिंक आज़माएँ।",
      "Related news coverage only. These articles are not a fact-check verdict.": "ये केवल संबंधित समाचार हैं, तथ्य-जाँच का निष्कर्ष नहीं।",
      "No author metadata found": "लेखक का विवरण नहीं मिला",
      "This website does not support notifications.": "यह वेबसाइट सूचनाओं का समर्थन नहीं करती।",
      "The article contains too little readable text to analyze.": "विश्लेषण के लिए लेख में पढ़ने योग्य पाठ बहुत कम है।",
      "No readable article text was found.": "लेख में पढ़ने योग्य पाठ नहीं मिला।",
      "The website address could not be resolved.": "वेबसाइट का पता नहीं मिला।",
      "Use a complete public http:// or https:// article URL.": "लेख का पूरा सार्वजनिक http:// या https:// वेब पता डालें।",
      "Text or URL cannot be empty.": "पाठ या वेब पता खाली नहीं हो सकता।",
      "Text or URL must be a string.": "पाठ या वेब पता सही प्रारूप में होना चाहिए।",
      "No news text or article URL provided.": "समाचार का पाठ या लेख का वेब पता नहीं दिया गया।",
      "Could not clear investigation history.": "जाँच का इतिहास मिटाया नहीं जा सका।"
    }

  },


  Hindi: {

    navHome: "होम",
    navAbout: "परिचय",
    signIn: "साइन इन",

    dashboard: "डैशबोर्ड",
    history: "इतिहास",
    settings: "सेटिंग्स",
    login: "लॉगिन",
    logout: "लॉगआउट",

    heroTitle: "केवल पढ़ें नहीं।",

    heroDescription:
      "किसी दावे, लेख या वेब पते की जाँच करें और जानें कि जानकारी सही, गलत या अनिश्चित लगती है।",

    investigate: "जाँच करें",

    quickAuthorship: "पाठ के पैटर्न जाँचें",
    quickArticles: "लेख की जाँच करें",
    quickSources: "अन्य स्रोतों से मिलान करें",
    aiDisclaimer: "कृत्रिम बुद्धिमत्ता से गलतियाँ हो सकती हैं। ज़रूरी दावों की विश्वसनीय स्रोतों से पुष्टि करें।",
    publisher: "प्रकाशक",
    authorLabel: "सूचीबद्ध लेखक",
    articlePreview: "लेख से लिया गया पाठ",
    openArticle: "मूल लेख खोलें",
    sourceLinks: "इस दावे के बारे में खोजें",
    factChecks: "तथ्य-जाँच खोजें",
    independentSources: "समाचारों में खोजें",

    methodsTitle: "आप किस चीज़ की जाँच करना चाहते हैं?",

    methodsDescription:
      "लेख का वेब पता जाँचें, किसी दावे का विश्लेषण करें या यह ऐप साझा करें।",

    linkTitle: "वेब पते से जाँचें",
    linkDescription: "लेख या वेबसाइट का वेब पता डालें और उसके स्रोतों से जुड़े संकेत देखें।",
    linkAction: "वेब पते की जाँच करें",

    searchTitle: "दावे की जाँच करें",
    searchDescription: "कोई दावा लिखें और जाँच के लिए उसका विश्लेषण करें।",
    searchAction: "दावे का विश्लेषण करें",

    shareTitle: "यह वेबसाइट साझा करें",
    shareDescription: "किसी को इस वेबसाइट का लिंक भेजें।",
    shareAction: "लिंक साझा करें",

    page: {
      pageTitle: "फेक न्यूज़ डिटेक्टर | जाँच डैशबोर्ड",
      brandTagline: "पहचानें • पुष्टि करें • जाँचें",
      sidebarCaseLabel: "जाँच प्रणाली",
      sidebarTitle: "जाँच",
      sidebarMainLabel: "मुख्य मेन्यू",
      sidebarAccountLabel: "प्राथमिकताएँ",
      heroTitleEmphasis: "जाँच करें।",
      methodsKicker: "जाँच करने के तीन तरीके",
      resultBadge: "नतीजा",
      resultTitle: "जाँच का नतीजा",
      signalText: "जाँच करने के बाद नतीजा यहाँ दिखाई देगा।",
      actionText: "दावा या लेख का वेब पता लिखें और जाँच करें चुनें।",
      articleAuthor: "लेखक का विवरण नहीं मिला",
      confidenceLabel: "मॉडल का अनुमान",
      confidenceDescription: "यह मॉडल के निष्कर्ष का अनुमान है, सच्चाई का माप नहीं।",
      confidenceDisclaimer: "यह स्कोर दावे को सही या गलत साबित नहीं करता।",
      evidenceTitle: "इससे जुड़ी समाचार कवरेज",
      evidenceDisclaimer: "यह तथ्य-जाँच का निष्कर्ष नहीं है।",
      fastText: "तेज़",
      fastDescription: "जाँच प्रक्रिया",
      multiText: "मशीन लर्निंग मॉडल",
      multiDescription: "पाठ के पैटर्न पर आधारित संकेत",
      historyStatText: "इतिहास",
      historyStatDescription: "आपकी जाँच का",
      privateText: "स्थानीय",
      privateDescription: "प्राथमिकताएँ",
      aboutKicker: "परिचय",
      aboutTitle: "दावा साझा करने से पहले उसकी जाँच करें।",
      aboutDescription: "फेक न्यूज़ डिटेक्टर संदिग्ध दावों और लेखों की शुरुआती जाँच करता है और आगे पुष्टि करने का आधार देता है।",
      missionTitle: "हमारा उद्देश्य",
      missionDescription: "हर व्यक्ति को दावों और समाचार लेखों की शुरुआती जाँच का सरल तरीका देकर भ्रामक जानकारी पहचानना आसान बनाना।",
      howItWorksTitle: "यह कैसे काम करता है",
      howItWorksDescription: "मॉडल अपने प्रशिक्षण डेटा से सीखे गए पैटर्न के आधार पर पाठ को संभावित रूप से सही, गलत या अनिश्चित बताता है। यह मशीन लर्निंग का अनुमान है, तथ्य-जाँच नहीं; यह दावे की सच्चाई की पुष्टि नहीं करता।",
      limitationsTitle: "सीमाएँ",
      limitationsDescription: "मॉडल को अंग्रेज़ी पाठ पर प्रशिक्षित किया गया है; यह अभी हिंदी दावों का विश्लेषण नहीं कर सकता और तथ्यों की पुष्टि भी नहीं करता। साझा करने से पहले ज़रूरी दावों की विश्वसनीय समाचार संस्थानों और आधिकारिक स्रोतों से जाँच करें।",
      dataTitle: "आपका डेटा",
      dataDescription: "जाँच का इतिहास इस कंप्यूटर के SQLite डेटाबेस में रखा जाता है और सर्वर के अन्य उपयोगकर्ताओं को दिख सकता है। इस ऐप में अभी उपयोगकर्ता खातों या अलग-अलग उपयोगकर्ताओं के लिए पहुँच नियंत्रण की सुविधा नहीं है।",
      authKicker: "खाते तक पहुँच",
      nameLabel: "पूरा नाम",
      emailLabel: "ईमेल",
      passwordLabel: "पासवर्ड",
      confirmLabel: "पासवर्ड की पुष्टि करें",
      rememberText: "मुझे याद रखें",
      forgotPasswordBtn: "पासवर्ड भूल गए?",
      authPrivacy: "यह केवल डेमो है: खाते इसी ब्राउज़र में रखे जाते हैं और पासवर्ड यहीं सुरक्षित रूप में हैश किए जाते हैं। यह सर्वर पर सुरक्षित प्रमाणीकरण नहीं है।",
      settingsKicker: "प्राथमिकताएँ",
      settingsPanelTitle: "सेटिंग्स",
      appearanceGroupLabel: "दिखावट",
      darkText: "डार्क मोड",
      darkDescription: "आँखों को आराम देने वाली गहरी रंग-योजना चुनें।",
      languageGroupLabel: "भाषा और सूचनाएँ",
      languageText: "भाषा",
      notificationsText: "सूचनाएँ",
      notificationsDescription: "जाँच पूरी होने पर ब्राउज़र में सूचना दिखाएँ। ब्राउज़र खुला रखें।",
      historyGroupLabel: "इतिहास और डेटा",
      historySettingTitle: "जाँच का इतिहास",
      historySettingDescription: "पहले की जाँच और सहेजे गए नतीजे देखें।",
      settingNoteText: "प्राथमिकताएँ इस ब्राउज़र में सहेजी जाती हैं। जाँच का इतिहास इस सर्वर पर रखा जाता है और उपयोगकर्ता खातों के अनुसार अलग नहीं होता।",
      settingsActionKicker: "सेटिंग्स",
      settingsActionTitle: "सेटिंग्स",
      changeLanguageButton: "बदलें",
      viewHistoryButton: "देखें",
      toastText: "हो गया",
      footerText: "© 2026 फेक न्यूज़ डिटेक्टर • जाँच डैशबोर्ड"
    },

    attributes: {
      claimInput: { placeholder: "जाँच के लिए दावा लिखें या लेख का वेब पता डालें..." },
      menuBtn: { "aria-label": "साइडबार खोलें" },
      themeBtn: { "aria-label": "डार्क मोड बदलें" },
      avatarBtn: { "aria-label": "सेटिंग्स खोलें" },
      closeSidebar: { "aria-label": "साइडबार बंद करें" },
      clearSearch: { "aria-label": "मिटाएँ" },
      closeResult: { "aria-label": "नतीजा बंद करें" },
      confidenceCard: { "aria-label": "मॉडल का अनुमान" },
      confidenceTrack: { "aria-label": "मॉडल का अनुमान" },
      articleDetails: { "aria-label": "प्राप्त लेख का विवरण" },
      newsEvidence: { "aria-label": "इससे जुड़ी समाचार कवरेज" },
      authName: { placeholder: "आपका नाम" },
      authEmail: { placeholder: "आपका ईमेल पता" },
      authPassword: { placeholder: "अपना पासवर्ड लिखें" },
      authConfirmPassword: { placeholder: "पासवर्ड दोबारा लिखें" },
      closeAuth: { "aria-label": "बंद करें" },
      closeSettings: { "aria-label": "सेटिंग्स बंद करें" },
      closeSettingsAction: { "aria-label": "बंद करें" }
    },

    messages: {}

  }

};


translations.Hindi.messages = translations.English.messages;
delete translations.English.messages;


function applyLanguage(language) {

  activeLanguage = translations[language] ? language : "English";
  const t = translations[activeLanguage];

  $("navHome").textContent = t.navHome;
  $("navAbout").textContent = t.navAbout;
  $("signInText").textContent = t.signIn;

  $("dashboardText").textContent = t.dashboard;
  $("historyText").textContent = t.history;
  $("settingsText").textContent = t.settings;
  $("loginText").textContent = t.login;
  $("logoutText").textContent = t.logout;

  $("heroDescription").textContent = t.heroDescription;

  $("investigateText").textContent = t.investigate;

  $("quickAuthorship").textContent = t.quickAuthorship;
  $("quickArticles").textContent = t.quickArticles;
  $("quickSources").textContent = t.quickSources;
  $("aiDisclaimer").textContent = t.aiDisclaimer;
  $("publisherLabel").textContent = t.publisher;
  $("authorLabel").textContent = t.authorLabel;
  $("articlePreviewLabel").textContent = t.articlePreview;
  $("articleSourceLink").textContent = t.openArticle;
  $("sourceLinksLabel").textContent = t.sourceLinks;
  $("factCheckLink").textContent = t.factChecks;
  $("independentSourcesLink").textContent = t.independentSources;

  $("methodsTitle").textContent = t.methodsTitle;
  $("methodsDescription").textContent = t.methodsDescription;

  $("linkTitle").textContent = t.linkTitle;
  $("linkDescription").textContent = t.linkDescription;
  $("linkAction").textContent = t.linkAction;

  $("searchTitle").textContent = t.searchTitle;
  $("searchDescription").textContent = t.searchDescription;
  $("searchAction").textContent = t.searchAction;

  $("shareTitle").textContent = t.shareTitle;
  $("shareDescription").textContent = t.shareDescription;
  $("shareAction").textContent = t.shareAction;

  const heroTitle = $("heroTitle");
  const heroTitleLead = Array.from(heroTitle.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
  );
  if (heroTitleLead) {
    heroTitleLead.textContent = `\n          ${t.heroTitle}\n          `;
  }

  const isLanguageDialog = ["Language", "भाषा"].includes(
    $("settingsActionTitle").textContent
  );
  Object.entries(t.page).forEach(([id, value]) => {
    const element = $(id);
    if (element) element.textContent = value;
  });
  Object.entries(t.attributes).forEach(([id, attributes]) => {
    const element = $(id);
    if (element) {
      Object.entries(attributes).forEach(([name, value]) => {
        element.setAttribute(name, value);
      });
    }
  });

  if (isLanguageDialog) {
    $("settingsActionTitle").textContent = translateText("Language");
    $("settingsActionSubtitle").textContent = translateText(
      "Choose your preferred interface language."
    );
    const saveLanguageButton = $("saveLanguage");
    if (saveLanguageButton) {
      saveLanguageButton.textContent = translateText("Save language");
    }
  }

  $("languageSettingText").textContent = activeLanguage === "Hindi" ? "हिन्दी" : "English";
  document.title = t.page.pageTitle;
  setAuthMode($("authSubmit").dataset.mode || "login");

  document.documentElement.lang = activeLanguage === "Hindi" ? "hi" : "en";

}


function openLanguageSettings() {

  const savedLanguage = localStorage.getItem("fncLanguage") || "English";

  openSettingsAction(

    translateText("Language"),

    translateText("Choose your preferred interface language."),

    `
      <div class="language-options">

        <label class="language-option">
          <input type="radio" name="language" value="English" ${savedLanguage === "English" ? "checked" : ""} />
          <span>English</span>
        </label>

        <label class="language-option">
          <input type="radio" name="language" value="Hindi" ${savedLanguage === "Hindi" ? "checked" : ""} />
          <span>Hindi</span>
        </label>

      </div>

      <button type="button" class="auth-submit settings-save-btn" id="saveLanguage">
        ${escapeHTML(translateText("Save language"))}
      </button>
    `

  );

  $("saveLanguage").addEventListener("click", () => {

    const choice =
      document.querySelector('input[name="language"]:checked')?.value || "English";

    localStorage.setItem("fncLanguage", choice);

    applyLanguage(choice);

    showToast(`Language set to ${choice}.`);

    closeSettingsAction();
    settingsPanel.classList.remove("open");

  });

}


/* =========================================================
   HISTORY RENDER
========================================================= */

function renderHistory(history) {

  if (!history.length) {

    return `
      <div class="empty-history">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <p>${escapeHTML(translateText("No investigations saved yet."))}</p>
        <small>${escapeHTML(translateText("Run a news analysis and it will appear here."))}</small>
      </div>
    `;

  }

  return `
    <div class="history-list">

      ${history.map((item) => {

    const isReal = item.prediction === "TRUE" || item.prediction === "LIKELY REAL";
    const isFake = item.prediction === "FAKE" || item.prediction === "LIKELY FAKE";
    const className = isReal ? "real" : isFake ? "fake" : "uncertain";
    const evidenceLinks = (Array.isArray(item.evidence) ? item.evidence : [])
      .map((article) => {
        const url = safeHttpUrl(article.url);
        if (!url) return "";
        return `<li><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(article.title || translateText("Related article"))}</a> — ${escapeHTML(article.publisher || translateText("Unknown publisher"))}</li>`;
      })
      .join("");

    return `
          <div class="history-entry">

            <div class="history-entry-top">
              <span class="history-chip ${className}">${escapeHTML(translateText(item.prediction))}</span>
              <small>${escapeHTML(item.date)}</small>
            </div>

            <p>${escapeHTML(item.text)}</p>
            ${evidenceLinks ? `<ul class="history-evidence">${evidenceLinks}</ul>` : ""}

          </div>
        `;

  }).join("")}

    </div>
  `;

}

/* =========================================================
   INVESTIGATION HISTORY
========================================================= */

async function showHistory() {

  openSettingsAction(

    "Investigation history",

    "Stored in the local SQLite database on this server; records are shared with other users of this local app.",

    `
      <p>${escapeHTML(translateText("Loading investigation history..."))}</p>
    `

  );

  try {
    const response = await fetch("/history");
    const history = await response.json();

    if (!response.ok) {
      throw new Error(history.error || "Could not load investigation history.");
    }

    settingsActionContent.innerHTML = `
      ${renderHistory(history)}
      <button type="button" class="settings-secondary-btn" id="clearHistoryBtn">
        <i class="fa-solid fa-trash"></i>
        ${escapeHTML(translateText("Clear history"))}
      </button>
    `;

    $("clearHistoryBtn").addEventListener("click", async () => {
      if (!window.confirm(translateText("Clear investigation history shared by all users of this local app?"))) {
        return;
      }

      try {
        const clearResponse = await fetch("/history", { method: "DELETE" });
        const clearResult = await clearResponse.json();

        if (!clearResponse.ok) {
          throw new Error(clearResult.error || "Could not clear investigation history.");
        }

        showToast("History cleared.");
        showHistory();
      } catch (error) {
        showToast(error.message || "Could not clear investigation history.");
      }
    });
  } catch (error) {
    settingsActionContent.innerHTML = `<p>${escapeHTML(translateText(error.message || "Could not load investigation history."))}</p>`;
  }

}


function openHistorySettings() {
  showHistory();
}


/* =========================================================
   SETTINGS BUTTONS
========================================================= */

document.querySelectorAll(".setting-action").forEach((button) => {

  button.addEventListener("click", () => {

    const action = button.dataset.settingAction;

    if (action === "language") {
      openLanguageSettings();
      return;
    }

    if (action === "history") {
      openHistorySettings();
      return;
    }

  });

});


$("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("fncDemoLoggedIn");
  closeSidebar();
  settingsPanel.classList.remove("open");
  updateAuthUI();
  showToast("Logged out.");
});


/* =========================================================
   NOTIFICATIONS
========================================================= */

const savedNotifications = localStorage.getItem("fncNotifications") === "true";
notificationToggle.checked = Boolean(
  savedNotifications
  && "Notification" in window
  && Notification.permission === "granted"
);
localStorage.setItem("fncNotifications", notificationToggle.checked ? "true" : "false");

notificationToggle.addEventListener("change", async () => {
  if (!notificationToggle.checked) {
    localStorage.setItem("fncNotifications", "false");
    showToast("Notifications disabled.");
    return;
  }

  if (!("Notification" in window)) {
    notificationToggle.checked = false;
    localStorage.setItem("fncNotifications", "false");
    showToast("This browser does not support notifications.");
    return;
  }

  try {
    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

    if (permission !== "granted") {
      notificationToggle.checked = false;
      localStorage.setItem("fncNotifications", "false");
      showToast(
        permission === "denied"
          ? "Allow notifications in your browser settings to enable them."
          : "Notification permission was not granted."
      );
      return;
    }

    localStorage.setItem("fncNotifications", "true");
    showToast("You will be notified when a check finishes.");
  } catch (error) {
    console.error("Could not enable browser notifications:", error);
    notificationToggle.checked = false;
    localStorage.setItem("fncNotifications", "false");
    showToast("Could not enable browser notifications.");
  }
});


/* =========================================================
   SIDEBAR SECTIONS
========================================================= */

document.querySelectorAll(".side-link[data-section]").forEach((button) => {

  button.addEventListener("click", () => {

    document.querySelectorAll(".side-link[data-section]").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    const section = button.dataset.section;

    if (section === "dashboard") {

      closeSidebar();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;

    }

    if (section === "history") {

      closeSidebar();
      openHistorySettings();
      return;

    }

  });

});


/* =========================================================
   HOME LINK
========================================================= */

$("homeLink").addEventListener("click", (event) => {

  event.preventDefault();

  closeSidebar();

  window.scrollTo({ top: 0, behavior: "smooth" });

});


/* =========================================================
   QUICK TOOLS
========================================================= */

document.querySelectorAll(".quick-tools [data-tool]").forEach((tool) => {
  tool.addEventListener("click", () => {
    if (tool.dataset.tool === "article") {
      checkListedAuthor();
    } else if (tool.dataset.tool === "sources") {
      crossReferenceSources();
    } else {
      investigate();
    }
  });
});


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener("keydown", (event) => {

  if (event.key === "Escape") {

    closeSidebar();
    closeAuth();
    closeResult();
    closeSettingsAction();

    settingsPanel.classList.remove("open");

  }

});


/* =========================================================
   STARTUP
========================================================= */

localStorage.removeItem("fncBackground");

const startupLanguage = localStorage.getItem("fncLanguage") || "English";

applyLanguage(startupLanguage);

const savedDark = localStorage.getItem("fncDark");

applyTheme(
  savedDark !== null
    ? savedDark === "true"
    : window.matchMedia("(prefers-color-scheme: dark)").matches
);

updateAuthUI();
updateClearButton();