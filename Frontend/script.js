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
let lastResult = null;
/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

  const toast = $("toast");
  const toastText = $("toastText");

  if (!toast || !toastText) return;

  toastText.textContent = message;
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
      body: tr("notificationBody")
    });
    notification.addEventListener("click", () => {
      window.focus();
      notification.close();
    });
  } catch (error) {
    console.error("Could not show browser notification:", error);
    showToast(tr("notificationFailure"));
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

  $("authHeading").textContent = signup ? tr("authCreate") : tr("authSignIn");
  $("authSubtitle").textContent = signup
    ? tr("authSignupSubtitle")
    : tr("authLoginSubtitle");
  $("authSubmit").textContent = signup ? tr("authCreate") : tr("authLogin");
  $("authSubmit").dataset.mode = signup ? "signup" : "login";
  $("nameField").classList.toggle("hidden", !signup);
  $("confirmField").classList.toggle("hidden", !signup);
  $("loginOptions").classList.toggle("hidden", signup);

  $("switchPrompt").textContent = signup ? tr("authAlreadyAccount") : tr("authNeedAccount");
  authSwitchLink.textContent = signup ? tr("authSignIn") : tr("authCreateOne");
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
    showToast(tr("authPleaseFill"));
    return;
  }

  if (signup) {
    const name = $("authName").value.trim();
    const confirmPassword = $("authConfirmPassword").value;

    if (!name) {
      showToast(tr("authEnterName"));
      return;
    }
    if (password !== confirmPassword) {
      showToast(tr("authPasswordMismatch"));
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
      showToast(tr("authExists"));
      return;
    }

    if (!signup && !existingAccount) {
      showToast(tr("authInvalid"));
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
        showToast(tr("authExists"));
        return;
      }

      saveAccounts([...latestAccounts, { name, email, salt, passwordHash }]);
      $("authForm").reset();
      setAuthMode("login");
      $("authEmail").value = email;
      $("authPassword").focus();
      showToast(tr("authCreated"));
      return;
    }

    const passwordHash = await hashPassword(password, existingAccount.salt);
    if (passwordHash !== existingAccount.passwordHash) {
      showToast(tr("authInvalid"));
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
    showToast(tr("authSignedIn"));
  } catch (error) {
    console.error("Could not complete demo account action:", error);
    showToast(tr("authFailure"));
  } finally {
    submitButton.disabled = false;
  }
});


$("forgotPasswordBtn").addEventListener("click", () => {
  showToast(tr("passwordRecovery"));
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
      <span>${escapeHTML(item.text)}</span>
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
    showToast(tr("authorUrlPrompt"));
    input.focus();
    return;
  }

  investigate(articleUrl);
}


function crossReferenceSources() {
  const value = input.value.trim();

  if (!value) {
    showToast(tr("sourceSearchPrompt"));
    input.focus();
    return;
  }

  const query = normalizeArticleUrl(value) || value;
  resetResultExtras();
  setResult({
    state: "",
    icon: "fa-link",
    title: tr("compareCoverage"),
    subtitle: tr("sourceSearchDescription"),
    badge: tr("sourceSearchBadge"),
    action: tr("sourceSearchAction"),
    checks: [
      { ok: true, icon: "fa-magnifying-glass", text: tr("factCheckPrepared") },
      { ok: true, icon: "fa-newspaper", text: tr("newsSearchPrepared") }
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
            ${escapeHTML(article.title || tr("untitledArticle"))}
          </a>
          <span>${escapeHTML(article.publisher || tr("unknownPublisher"))} ${date}</span>
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
    ? translateUiMessage(evidence.message || tr("relatedCoverage"))
    : tr("noArticles");
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
   lastResult = {
     state,
     icon,
     title,
     subtitle,
     badge,
     action,
     checks: checks || [],
     confidence
   };
  resultPopup.className = "result-popup" + (state ? " " + state : "");
  resultIconI.className = "fa-solid " + icon;

  resultTitle.textContent = title;
  signalText.textContent = subtitle;
  actionText.textContent = action;

  resultBadge.textContent = badge;
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
    showToast(tr("enterClaimPrompt"));
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
    title: tr("checking"),
    subtitle: isUrl
      ? tr("readingArticle")
      : tr("checkingClaim"),
    badge: tr("checkingBadge"),
    action: tr("checkWait"),
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
      throw new Error(tr("invalidResponse"));
    }

    if (!response.ok) {
      throw new Error(translateUiMessage(data.error) || tr("backendError"));
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
        throw new Error(tr("articleDetailsMissing"));
      }

      const listedAuthor =
        typeof article.author === "string" ? article.author.trim() : "";
      authorCheck = {
        ok: Boolean(listedAuthor),
        icon: "fa-user",
        text: listedAuthor ? tr("authorFound") : tr("noAuthorCheck")
      };
      $("articleAuthor").textContent = listedAuthor || tr("noAuthor");
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
      throw new Error(tr("uncertaintyStatusMissing"));
    }

    const abstained = data.uncertain;
    const hasValidConfidence =
      Number.isFinite(data.confidence) && data.confidence >= 0 && data.confidence <= 1;
    if (
      (abstained && (data.confidence !== null || prediction !== null)) ||
      (!abstained && (!hasValidConfidence || (prediction !== true && prediction !== false)))
    ) {
      throw new Error(tr("invalidConfidence"));
    }

    const words = Number(data.word_count) || analysisInput.split(/\s+/).filter(Boolean).length;

    const wordsCheck = {
      ok: true,
      icon: "fa-file-lines",
      text: tr("wordsAnalyzed", { count: words })
    };
    if (data.uncertain) {
      const uncertaintyMessages = {
        unrecognized_text: {
          reason: tr("reasonUnrecognized"),
          action: tr("actionUnrecognized")
        },
        opinion_like: {
          reason: tr("reasonOpinion"),
          action: tr("actionOpinion")
        },
        ambiguous: {
          reason: tr("reasonAmbiguous"),
          action: tr("actionAmbiguous")
        },
        model_disagreement: {
          reason: tr("reasonDisagreement"),
          action: tr("actionDisagreement")
        },
        weak_signal: {
          reason: tr("reasonWeak"),
          action: tr("actionWeak")
        }
      };
      const uncertainty = uncertaintyMessages[data.uncertain_reason] || {
        reason: tr("reasonGenericUncertain"),
        action: tr("actionWeak")
      };
      setResult({
        state: "uncertain",
        icon: "fa-circle-question",
        title: tr("uncertain"),
        subtitle: uncertainty.reason,
        badge: tr("notVerified"),
        action: uncertainty.action,
        confidence: null,
        checks: [
          wordsCheck,
          ...(authorCheck ? [authorCheck] : []),
          { ok: false, icon: "fa-link", text: tr("verifyIndependent") }
        ]
      });

      showCheckNotification("Check complete");
      return;
    }


    if (prediction === true) {

      setResult({
        state: "real",
        icon: "fa-shield-halved",
        title: tr("trueTitle"),
        subtitle: tr("textEstimate"),
        badge: tr("textPattern"),
        action: tr("checkImportant"),
        confidence: data.confidence,
        checks: [
          { ok: true, icon: "fa-check", text: tr("modelTrue") },
          ...(isUrl ? [{ ok: true, icon: "fa-file-lines", text: tr("articleRead") }] : []),
          wordsCheck,
          ...(authorCheck ? [authorCheck] : []),
          { ok: false, icon: "fa-link", text: tr("verifyBeforeShare") }
        ]
      });

    } else {

      setResult({
        state: "fake",
        icon: "fa-triangle-exclamation",
        title: tr("fakeTitle"),
        subtitle: tr("textEstimate"),
        badge: tr("textPattern"),
        action: tr("checkFalse"),
        confidence: data.confidence,
        checks: [
          { ok: false, icon: "fa-circle-exclamation", text: tr("modelFake") },
          ...(isUrl ? [{ ok: true, icon: "fa-file-lines", text: tr("articleRead") }] : []),
          wordsCheck,
          ...(authorCheck ? [authorCheck] : []),
          { ok: false, icon: "fa-link", text: tr("doNotShareUnchecked") }
        ]
      });

    }

    showCheckNotification(prediction ? tr("trueTitle") : tr("fakeTitle"));

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
      title: tr("error"),
      subtitle: connectionFailed
        ? tr("serverUnavailable")
        : translateUiMessage(error.message || tr("backendUnavailable")),
      badge: tr("error"),
      action: tr("runFlask"),
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
        text: currentLanguage === "Hindi"
          ? "फेक न्यूज़ डिटेक्टर वेबसाइट देखें।"
          : "Take a look at the Fake News Detector website.",
        url: window.location.href
      };

      if (navigator.share) {

        try {
          await navigator.share(shareData);
          showToast(tr("shareSheetOpened"));
        } catch {
          /* User cancelled share. */
        }

      } else {

        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast(tr("linkCopied"));
        } catch {
          showToast(tr("shareUnavailable"));
        }

      }

      return;

    }

    input.focus();

    if (method === "link") {

      input.placeholder = "Paste the article URL here...";

      showToast(tr("articleUrlPrompt"));

    }

    if (method === "search") {
      input.placeholder = "Type the claim or paste news text here...";
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

  settingsActionTitle.textContent = title;
  settingsActionSubtitle.textContent = subtitle;
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
    navHome: "Home", navAbout: "About", signIn: "Sign In",
    dashboard: "Dashboard", history: "History", settings: "Settings",
    login: "Login", logout: "Logout",
    brandTagline: "Detect • Verify • Investigate", caseFileLabel: "CASE FILE SYSTEM",
    sidebarTitle: "Investigation", sidebarMainLabel: "Main", sidebarAccountLabel: "Preferences",
    heroTitleFirst: "Don't Just Read It.", heroTitleSecond: "Investigate It.",
    heroDescription: "Check a claim, article or URL and uncover signals that help you decide whether the information looks Real, Fake or Uncertain.",
    claimPlaceholder: "Enter a claim or paste an article URL to investigate...",
    clear: "Clear", investigate: "Investigate",
    quickAuthorship: "Analyze text patterns", quickArticles: "Check articles",
    quickSources: "Search sources online",
    methodsKicker: "THREE WAYS TO INVESTIGATE", methodsTitle: "Start an investigation.",
    methodsDescription: "Analyze text or an article URL with the model, or share this app. The model provides a signal, not verified evidence.",
    linkTitle: "Check by Link", linkDescription: "Paste an article or website URL and inspect its source signals.", linkAction: "Start link check",
    searchTitle: "Search a Claim", searchDescription: "Enter a statement and compare it against your verification workflow.", searchAction: "Search claim",
    shareTitle: "Share this website", shareDescription: "Send a link to this website to someone.", shareAction: "Share link",
    confidenceLabel: "MODEL ESTIMATE", confidenceDescription: "An estimate for the model's label, not a measure of truth",
    confidenceDisclaimer: "This score cannot confirm whether the claim is true or false.",
    publisher: "Publisher", authorLabel: "Listed author", noAuthor: "No author metadata found",
    articlePreview: "Extracted text preview", openArticle: "Open original article",
    newsEvidenceTitle: "Related news coverage", newsEvidenceDisclaimer: "Not a fact-check verdict",
    actionText: "Enter a claim or article URL and select Investigate.",
    aiDisclaimer: "Please check reliable sources before trusting or sharing a claim.",
    sourceLinks: "Look up this claim", factChecks: "Search fact checks", independentSources: "Search independent sources",
    fastText: "Fast", fastDescription: "investigation flow", multiText: "ML model", multiDescription: "text-pattern signal",
    historyStatText: "History", historyStatDescription: "of your checks", privateText: "Local", privateDescription: "preferences",
    aboutKicker: "ABOUT", aboutTitle: "Check a claim before sharing it.",
    aboutDescription: "Fake News Detector gives you a quick first check on suspicious claims and articles, and a starting point for deeper verification.",
    missionTitle: "Our mission", missionDescription: "Make misinformation easier to spot by giving everyone a simple first check for claims and news articles.",
    howItWorksTitle: "How it works", howItWorksDescription: "The model uses patterns learned from its training data to classify the text as likely real, likely fake, or uncertain. This is a machine-learning estimate, not a fact-check: it does not verify whether a claim is true.",
    limitationsTitle: "Limitations", limitationsDescription: "The model does not verify facts. Always cross-check important claims with trusted publishers and official sources before sharing.",
    yourDataTitle: "Your data", yourDataDescription: "Investigation history is stored in the local SQLite database and may be visible to other users of this server. This app does not currently provide user accounts or per-user access controls.",
    caseAccessLabel: "CASE FILE ACCESS", authSubtitle: "Demo sign-in only; no secure account is created.",
    nameLabel: "Full name", emailLabel: "Email", passwordLabel: "Password", confirmLabel: "Confirm password",
    namePlaceholder: "Your name", emailPlaceholder: "you@example.com", passwordPlaceholder: "Enter your password",
    confirmPlaceholder: "Repeat your password", rememberText: "Remember me", forgotPassword: "Forgot password?",
    switchPrompt: "Need an account?", createOne: "Create one", authPrivacy: "Demo only: accounts are stored in this browser, and passwords are hashed locally. This is not secure server-side authentication.",
    preferencesLabel: "PREFERENCES", appearanceGroupLabel: "Appearance", darkText: "Dark mode",
    darkDescription: "Use a darker theme that is easier on the eyes.", languageGroupLabel: "Language & notifications",
    languageText: "Language", change: "Change", notificationsText: "Notifications",
    notificationsDescription: "Show a browser alert when a check finishes. Keep the browser open.",
    historyGroupLabel: "History & data", historySettingTitle: "History",
    historySettingDescription: "Review prior investigations and saved results.", view: "View",
    settingNoteText: "Preferences are stored in this browser. Investigation history is stored on this server and is not separated by user accounts.",
    settingsActionKicker: "SETTINGS", footerText: "© 2026 Fake News Detector • Investigation Dashboard",
    languageName: "English", languageTitle: "Language", languageSubtitle: "Choose your preferred interface language.",
    languageEnglish: "English", languageHindi: "Hindi", saveLanguage: "Save language",
    historyEmpty: "No investigations yet.", historyLoading: "Loading history...",
    historyError: "Could not load investigation history.", clearHistory: "Clear history",
    result: "RESULT", checkResult: "Check result", resultPending: "Your result appears here after you run a check.",
    confidenceAria: "Model estimate", articleDetailsAria: "Fetched article details",
    menuAria: "Open sidebar", closeSidebarAria: "Close sidebar", themeAria: "Toggle dark mode",
    openSettingsAria: "Open settings", closeAria: "Close", closeResultAria: "Close result",
    closeSettingsAria: "Close settings", notificationsAria: "Notifications",
    toastDone: "Done", stateTrue: "Likely real", stateFake: "Likely fake", stateUncertain: "Uncertain",
    noArticles: "No related articles found. Try the search links below.", relatedCoverage: "Related news coverage.",
    untitledArticle: "Untitled article", unknownPublisher: "Unknown publisher",
    languageChanged: "Language set to {language}.",
    authCreate: "Create Account", authSignIn: "Sign In", authLogin: "Login",
    authSignupSubtitle: "Demo account stored only in this browser.",
    authLoginSubtitle: "Sign in with the email and password saved in this browser.",
    authAlreadyAccount: "Already have an account?", authNeedAccount: "Need an account?",
    authCreateOne: "Create one", authPleaseFill: "Please fill in all required fields.",
    authEnterName: "Please enter your name.", authPasswordMismatch: "Passwords do not match.",
    authExists: "You already have an account. Please sign in.",
    authInvalid: "Email or password is incorrect.",
    authCreated: "Account created successfully. Please sign in.", authSignedIn: "Signed in.",
    authFailure: "Could not complete this account action.", passwordRecovery: "Password recovery is not available.",
    authorUrlPrompt: "Paste an article URL to check its listed author.",
    sourceSearchPrompt: "Enter a claim or article URL to search for other coverage.",
    compareCoverage: "Compare source coverage", sourceSearchDescription: "Search for fact checks and other news coverage of this claim.",
    sourceSearchAction: "Search results are leads, not proof. Compare dates, evidence, and the original sources yourself.",
    factCheckPrepared: "Fact-check search prepared", newsSearchPrepared: "News coverage search prepared",
    enterClaimPrompt: "Enter a claim or article URL first.", shareSheetOpened: "Share sheet opened.",
    linkCopied: "Link copied. Share it anywhere.", shareUnavailable: "Share is not available in this browser.",
    articleUrlPrompt: "Paste an article URL above, then select Investigate.",
    historyCleared: "History cleared.", loggedOut: "Logged out.",
    notificationsDisabled: "Notifications disabled.", notificationsUnsupported: "This browser does not support notifications.",
    notificationsDenied: "Allow notifications in your browser settings to enable them.",
    notificationsNotGranted: "Notification permission was not granted.",
    notificationsEnabled: "You will be notified when a check finishes.",
    notificationsFailure: "Could not enable browser notifications.",
    notificationBody: "Your check is complete. Open the browser to view the result.",
    notificationFailure: "The browser could not display the notification.",
    checking: "Checking...", readingArticle: "Reading the article from this URL.",
    checkingClaim: "Checking the claim text.", checkWait: "One moment...",
    invalidResponse: "The Flask server returned an invalid response.",
    backendError: "The ML backend returned an error.",
    articleDetailsMissing: "The backend did not return article details.",
    invalidConfidence: "The backend returned an invalid confidence score.",
    noAuthorCheck: "No listed author metadata found",
    authorFound: "Listed author found in article metadata",
    wordsAnalyzed: "{count} words analyzed",
    uncertain: "UNCERTAIN", notVerified: "NOT VERIFIED", trueTitle: "Leans TRUE",
    fakeTitle: "Leans FAKE", error: "ERROR", checkingBadge: "CHECKING",
    textPattern: "TEXT PATTERN", sourceSearchBadge: "SOURCE SEARCH",
    textEstimate: "This is a text-based estimate, not a fact-check.",
    checkImportant: "For important claims, check reliable sources before sharing.",
    checkFalse: "Check reliable sources before deciding whether the claim is false.",
    modelTrue: "The model's text analysis leans TRUE", modelFake: "The model's text analysis leans FAKE",
    articleRead: "Article text was read from the link",
    verifyIndependent: "Verify with independent, trusted sources",
    verifyBeforeShare: "Verify with a trusted source before sharing",
    doNotShareUnchecked: "Do not share before checking the source",
    reasonUnrecognized: "There is not enough recognizable claim text to analyze.",
    actionUnrecognized: "Enter a meaningful claim or a few more details.",
    reasonOpinion: "This sounds more like an opinion or a guess than a fact we can check.",
    actionOpinion: "Try entering a clear statement that can be checked with reliable sources.",
    reasonAmbiguous: "The wording is unclear or uncertain.",
    actionAmbiguous: "Add context and state the specific claim you want to check.",
    reasonDisagreement: "The model outputs point in different directions.",
    actionDisagreement: "The model estimates are inconclusive. Check reliable sources; this is not a fact-check.",
    reasonWeak: "The model signal is too weak for a clear result.",
    actionWeak: "Add context and check reliable sources; this is not a fact-check.",
    reasonGenericUncertain: "The model could not produce a clear result.",
    serverUnavailable: "The Flask API could not be reached.",
    backendUnavailable: "Unable to connect to the Python backend.",
    runFlask: "Make sure Flask is running with: .\\venv\\Scripts\\python.exe app.py",
    confirmClearHistory: "Clear investigation history shared by all users of this local app?",
    historySubtitle: "Stored in the local SQLite database on this server; records are shared with other users of this local app.",
    historyPrompt: "Run a news analysis and it will appear here.",
    relatedArticle: "Related article",
    relatedNewsDisclaimer: "Related news coverage only. These articles are not a fact-check verdict.",
    newsApiUnavailable: "NewsAPI could not provide related articles. Check the API key or try again later.",
    relatedNewsUnavailable: "Related articles could not be retrieved right now.",
    missingInput: "No news text or article URL provided.",
    inputTypeError: "Text or URL must be a string.",
    emptyInput: "Text or URL cannot be empty.",
    inputTooLong: "Text or URL must be {count} characters or fewer.",
    articleLoginBlocked: "This website requires login or blocks automated access. Open the article and paste its text instead.",
    articleRateLimited: "This website is temporarily limiting requests. Try again later or paste the article text.",
    articleRequestRefused: "The website refused the request (HTTP {code}). Paste the article text instead.",
    articleFetchFailed: "Could not retrieve the article: {detail}",
    articleUrlInvalid: "Use a complete public http:// or https:// article URL.",
    articleUrlCredentials: "URLs containing login credentials are not supported.",
    articleUrlPort: "The URL contains an invalid port.",
    articleUrlUnsupported: "Only public websites on standard HTTP/HTTPS ports are supported.",
    articleUrlUnresolved: "The website address could not be resolved.",
    articleUrlPrivate: "Local and private network addresses cannot be analyzed.",
    articleNotHtml: "That URL does not return an HTML article page.",
    articleTextMissing: "Not enough readable article text was found at that URL.",
    predictionNotSaved: "The prediction completed but could not be saved to history.",
    serverCouldNotComplete: "The server could not complete the request. Check the Flask terminal for details.",
    localHistoryLoadFailed: "Could not load investigation history.",
    localHistoryClearFailed: "Could not clear investigation history.",
    savedAccountsInvalid: "Saved account data is invalid. Clear this browser's saved account data and try again.",
    secureStorageUnavailable: "This browser cannot securely save demo credentials. Use the app on localhost in a modern browser.",
    uncertaintyStatusMissing: "Uncertainty status was not returned correctly by the backend.",
    clearHistoryFailure: "Could not clear investigation history.",
    historyLoadFailure: "Could not load investigation history."
  },
  Hindi: {
    navHome: "होम", navAbout: "परिचय", signIn: "साइन इन",
    dashboard: "डैशबोर्ड", history: "इतिहास", settings: "सेटिंग्स",
    login: "लॉगिन", logout: "लॉग आउट",
    brandTagline: "पहचानें • जाँचें • पड़ताल करें", caseFileLabel: "जाँच फ़ाइल प्रणाली",
    sidebarTitle: "जाँच", sidebarMainLabel: "मुख्य", sidebarAccountLabel: "प्राथमिकताएँ",
    heroTitleFirst: "सिर्फ़ पढ़ें नहीं।", heroTitleSecond: "जाँच-पड़ताल करें।",
    heroDescription: "किसी दावे, लेख या URL की जाँच करें और ऐसे संकेत पाएँ जो यह समझने में मदद करें कि जानकारी सही, झूठी या अनिश्चित लगती है।",
    claimPlaceholder: "जाँच के लिए दावा लिखें या लेख का URL पेस्ट करें...",
    clear: "मिटाएँ", investigate: "जाँच करें",
    quickAuthorship: "लेखन की शैली का विश्लेषण", quickArticles: "लेखों की जाँच करें",
    quickSources: "ऑनलाइन स्रोत खोजें",
    methodsKicker: "जाँच करने के तीन तरीके", methodsTitle: "जाँच शुरू करें।",
    methodsDescription: "मॉडल से टेक्स्ट या लेख के URL का विश्लेषण करें, या इस ऐप को साझा करें। मॉडल केवल संकेत देता है, प्रमाणित साक्ष्य नहीं।",
    linkTitle: "लिंक से जाँचें", linkDescription: "लेख या वेबसाइट का URL पेस्ट करके उसके स्रोत संबंधी संकेत देखें।", linkAction: "लिंक जाँचें",
    searchTitle: "दावा खोजें", searchDescription: "कोई कथन लिखें और अपनी सत्यापन प्रक्रिया के अनुसार उसकी तुलना करें।", searchAction: "दावा खोजें",
    shareTitle: "यह वेबसाइट साझा करें", shareDescription: "इस वेबसाइट का लिंक किसी को भेजें।", shareAction: "लिंक साझा करें",
    confidenceLabel: "मॉडल का अनुमान", confidenceDescription: "मॉडल के वर्गीकरण का अनुमान—सच्चाई का माप नहीं",
    confidenceDisclaimer: "यह स्कोर दावे के सही या गलत होने की पुष्टि नहीं करता।",
    publisher: "प्रकाशक", authorLabel: "लेख में दिया लेखक", noAuthor: "लेखक की जानकारी उपलब्ध नहीं",
    articlePreview: "निकाले गए टेक्स्ट का पूर्वावलोकन", openArticle: "मूल लेख खोलें",
    newsEvidenceTitle: "संबंधित समाचार कवरेज", newsEvidenceDisclaimer: "यह तथ्य-जाँच का निष्कर्ष नहीं है",
    actionText: "दावा या लेख का URL दर्ज करें और “जाँच करें” चुनें।",
    aiDisclaimer: "किसी दावे पर भरोसा करने या साझा करने से पहले विश्वसनीय स्रोतों से जाँचें।",
    sourceLinks: "इस दावे के बारे में खोजें", factChecks: "तथ्य-जाँच खोजें", independentSources: "स्वतंत्र स्रोत खोजें",
    fastText: "तेज़", fastDescription: "जाँच प्रक्रिया", multiText: "मशीन लर्निंग मॉडल", multiDescription: "टेक्स्ट-पैटर्न संकेत",
    historyStatText: "इतिहास", historyStatDescription: "आपकी जाँच का", privateText: "स्थानीय", privateDescription: "प्राथमिकताएँ",
    aboutKicker: "परिचय", aboutTitle: "साझा करने से पहले दावे की जाँच करें।",
    aboutDescription: "फेक न्यूज़ डिटेक्टर संदिग्ध दावों और लेखों की शुरुआती जाँच करने और आगे सत्यापन शुरू करने में मदद करता है।",
    missionTitle: "हमारा उद्देश्य", missionDescription: "दावों और समाचार लेखों की आसान शुरुआती जाँच देकर भ्रामक जानकारी को पहचानना सरल बनाना।",
    howItWorksTitle: "यह कैसे काम करता है", howItWorksDescription: "मॉडल अपने प्रशिक्षण डेटा से सीखे गए पैटर्न के आधार पर टेक्स्ट को संभावित रूप से सही, झूठा या अनिश्चित वर्गीकृत करता है। यह मशीन-लर्निंग अनुमान है, तथ्य-जाँच नहीं; यह दावे की सच्चाई सत्यापित नहीं करता।",
    limitationsTitle: "सीमाएँ", limitationsDescription: "मॉडल तथ्यों की पुष्टि नहीं करता। साझा करने से पहले ज़रूरी दावों को विश्वसनीय प्रकाशकों और आधिकारिक स्रोतों से ज़रूर जाँचें।",
    yourDataTitle: "आपका डेटा", yourDataDescription: "जाँच का इतिहास स्थानीय SQLite डेटाबेस में रखा जाता है और इस सर्वर के अन्य उपयोगकर्ताओं को दिख सकता है। इस ऐप में अभी उपयोगकर्ता खाते या प्रति-उपयोगकर्ता पहुँच नियंत्रण उपलब्ध नहीं हैं।",
    caseAccessLabel: "खाता प्रवेश", authSubtitle: "यह केवल डेमो साइन-इन है; कोई सुरक्षित खाता नहीं बनाया जाता।",
    nameLabel: "पूरा नाम", emailLabel: "ईमेल", passwordLabel: "पासवर्ड", confirmLabel: "पासवर्ड की पुष्टि करें",
    namePlaceholder: "आपका नाम", emailPlaceholder: "you@example.com", passwordPlaceholder: "अपना पासवर्ड दर्ज करें",
    confirmPlaceholder: "पासवर्ड दोबारा दर्ज करें", rememberText: "मुझे याद रखें", forgotPassword: "पासवर्ड भूल गए?",
    switchPrompt: "खाता नहीं है?", createOne: "खाता बनाएँ", authPrivacy: "केवल डेमो: खाते इसी ब्राउज़र में रखे जाते हैं और पासवर्ड स्थानीय रूप से हैश किए जाते हैं। यह सुरक्षित सर्वर-साइड प्रमाणीकरण नहीं है।",
    preferencesLabel: "प्राथमिकताएँ", appearanceGroupLabel: "दिखावट", darkText: "डार्क मोड",
    darkDescription: "आँखों को आराम देने वाली गहरी थीम इस्तेमाल करें।", languageGroupLabel: "भाषा और सूचनाएँ",
    languageText: "भाषा", change: "बदलें", notificationsText: "सूचनाएँ",
    notificationsDescription: "जाँच पूरी होने पर ब्राउज़र सूचना दिखाएँ। ब्राउज़र खुला रखें।",
    historyGroupLabel: "इतिहास और डेटा", historySettingTitle: "इतिहास",
    historySettingDescription: "पिछली जाँच और सहेजे गए परिणाम देखें।", view: "देखें",
    settingNoteText: "प्राथमिकताएँ इस ब्राउज़र में सहेजी जाती हैं। जाँच का इतिहास इस सर्वर पर रखा जाता है और उपयोगकर्ता खातों के अनुसार अलग नहीं होता।",
    settingsActionKicker: "सेटिंग्स", footerText: "© 2026 फेक न्यूज़ डिटेक्टर • जाँच डैशबोर्ड",
    languageName: "हिन्दी", languageTitle: "भाषा", languageSubtitle: "इंटरफ़ेस के लिए अपनी पसंदीदा भाषा चुनें।",
    languageEnglish: "अंग्रेज़ी", languageHindi: "हिन्दी", saveLanguage: "भाषा सहेजें",
    historyEmpty: "अभी तक कोई जाँच नहीं हुई है।", historyLoading: "इतिहास लोड हो रहा है...",
    historyError: "जाँच का इतिहास लोड नहीं हो सका।", clearHistory: "इतिहास मिटाएँ",
    result: "परिणाम", checkResult: "जाँच का परिणाम", resultPending: "जाँच चलाने के बाद परिणाम यहाँ दिखाई देगा।",
    confidenceAria: "मॉडल का अनुमान", articleDetailsAria: "प्राप्त लेख का विवरण",
    menuAria: "साइडबार खोलें", closeSidebarAria: "साइडबार बंद करें", themeAria: "डार्क मोड बदलें",
    openSettingsAria: "सेटिंग्स खोलें", closeAria: "बंद करें", closeResultAria: "परिणाम बंद करें",
    closeSettingsAria: "सेटिंग्स बंद करें", notificationsAria: "सूचनाएँ",
    toastDone: "हो गया", stateTrue: "संभवतः सही", stateFake: "संभवतः झूठा", stateUncertain: "अनिश्चित",
    noArticles: "संबंधित लेख नहीं मिले। नीचे दिए गए खोज लिंक आज़माएँ।", relatedCoverage: "संबंधित समाचार कवरेज।",
    untitledArticle: "बिना शीर्षक का लेख", unknownPublisher: "अज्ञात प्रकाशक",
    languageChanged: "भाषा {language} कर दी गई है।",
    authCreate: "खाता बनाएँ", authSignIn: "साइन इन", authLogin: "लॉगिन",
    authSignupSubtitle: "डेमो खाता केवल इसी ब्राउज़र में सहेजा जाता है।",
    authLoginSubtitle: "इस ब्राउज़र में सहेजे गए ईमेल और पासवर्ड से साइन इन करें।",
    authAlreadyAccount: "पहले से खाता है?", authNeedAccount: "खाता नहीं है?",
    authCreateOne: "खाता बनाएँ", authPleaseFill: "कृपया सभी ज़रूरी फ़ील्ड भरें।",
    authEnterName: "कृपया अपना नाम दर्ज करें।", authPasswordMismatch: "दोनों पासवर्ड मेल नहीं खाते।",
    authExists: "इस ईमेल से पहले ही खाता है। कृपया साइन इन करें।",
    authInvalid: "ईमेल या पासवर्ड गलत है।",
    authCreated: "खाता बन गया है। कृपया साइन इन करें।", authSignedIn: "साइन इन हो गया।",
    authFailure: "खाते से जुड़ी यह कार्रवाई पूरी नहीं हो सकी।", passwordRecovery: "पासवर्ड वापस पाने की सुविधा उपलब्ध नहीं है।",
    authorUrlPrompt: "लेख में दिए लेखक की जाँच के लिए लेख का URL पेस्ट करें।",
    sourceSearchPrompt: "अन्य कवरेज खोजने के लिए दावा या लेख का URL दर्ज करें।",
    compareCoverage: "स्रोतों की कवरेज की तुलना करें", sourceSearchDescription: "इस दावे की तथ्य-जाँच और अन्य समाचार कवरेज खोजें।",
    sourceSearchAction: "खोज के परिणाम सुराग हैं, प्रमाण नहीं। तारीखों, साक्ष्यों और मूल स्रोतों की स्वयं तुलना करें।",
    factCheckPrepared: "तथ्य-जाँच की खोज तैयार है", newsSearchPrepared: "समाचार कवरेज की खोज तैयार है",
    enterClaimPrompt: "पहले दावा या लेख का URL दर्ज करें।", shareSheetOpened: "साझा करने का पैनल खुल गया।",
    linkCopied: "लिंक कॉपी हो गया। इसे कहीं भी साझा करें।", shareUnavailable: "इस ब्राउज़र में साझा करने की सुविधा उपलब्ध नहीं है।",
    articleUrlPrompt: "ऊपर लेख का URL पेस्ट करें, फिर “जाँच करें” चुनें।",
    historyCleared: "इतिहास मिटा दिया गया।", loggedOut: "लॉग आउट हो गया।",
    notificationsDisabled: "सूचनाएँ बंद कर दी गई हैं।", notificationsUnsupported: "यह ब्राउज़र सूचनाओं का समर्थन नहीं करता।",
    notificationsDenied: "सूचनाएँ चालू करने के लिए ब्राउज़र सेटिंग्स में अनुमति दें।",
    notificationsNotGranted: "सूचना की अनुमति नहीं मिली।",
    notificationsEnabled: "जाँच पूरी होने पर आपको सूचना मिलेगी।",
    notificationsFailure: "ब्राउज़र सूचनाएँ चालू नहीं हो सकीं।",
    notificationBody: "आपकी जाँच पूरी हो गई है। परिणाम देखने के लिए ब्राउज़र खोलें।",
    notificationFailure: "ब्राउज़र सूचना नहीं दिखा सका।",
    checking: "जाँच हो रही है...", readingArticle: "इस URL से लेख पढ़ा जा रहा है।",
    checkingClaim: "दावे के टेक्स्ट की जाँच हो रही है।", checkWait: "कृपया प्रतीक्षा करें...",
    invalidResponse: "Flask सर्वर से अमान्य जवाब मिला।",
    backendError: "मशीन-लर्निंग बैकएंड में त्रुटि हुई।",
    articleDetailsMissing: "बैकएंड से लेख का विवरण नहीं मिला।",
    invalidConfidence: "बैकएंड से अमान्य confidence score मिला।",
    noAuthorCheck: "लेखक की जानकारी उपलब्ध नहीं",
    authorFound: "लेख के विवरण में लेखक मिला",
    wordsAnalyzed: "{count} शब्दों का विश्लेषण किया गया",
    uncertain: "अनिश्चित", notVerified: "सत्यापित नहीं", trueTitle: "सही होने की संभावना",
    fakeTitle: "झूठा होने की संभावना", error: "त्रुटि", checkingBadge: "जाँच जारी",
    textPattern: "टेक्स्ट पैटर्न", sourceSearchBadge: "स्रोत खोज",
    textEstimate: "यह टेक्स्ट पर आधारित अनुमान है, तथ्य-जाँच नहीं।",
    checkImportant: "ज़रूरी दावों को साझा करने से पहले विश्वसनीय स्रोतों से जाँचें।",
    checkFalse: "दावे को गलत मानने से पहले विश्वसनीय स्रोतों से जाँचें।",
    modelTrue: "मॉडल का टेक्स्ट विश्लेषण सही होने का संकेत देता है",
    modelFake: "मॉडल का टेक्स्ट विश्लेषण झूठा होने का संकेत देता है",
    articleRead: "लिंक से लेख का टेक्स्ट पढ़ा गया",
    verifyIndependent: "स्वतंत्र और विश्वसनीय स्रोतों से पुष्टि करें",
    verifyBeforeShare: "साझा करने से पहले विश्वसनीय स्रोत से पुष्टि करें",
    doNotShareUnchecked: "स्रोत जाँचे बिना साझा न करें",
    reasonUnrecognized: "विश्लेषण के लिए दावे का पर्याप्त समझने योग्य टेक्स्ट नहीं है।",
    actionUnrecognized: "अर्थपूर्ण दावा या कुछ और विवरण दर्ज करें।",
    reasonOpinion: "यह बात राय या अंदाज़े जैसी लग रही है, इसलिए इसे सही या गलत कहना मुश्किल है।",
    actionOpinion: "ऐसा साफ़ दावा लिखें जिसे भरोसेमंद स्रोतों से जाँचा जा सके।",
    reasonAmbiguous: "वाक्य स्पष्ट नहीं है या उसमें अनिश्चितता है।",
    actionAmbiguous: "संदर्भ जोड़ें और वह स्पष्ट दावा बताएँ जिसकी जाँच करनी है।",
    reasonDisagreement: "मॉडल के परिणाम अलग-अलग संकेत दे रहे हैं।",
    actionDisagreement: "मॉडल का अनुमान निर्णायक नहीं है। विश्वसनीय स्रोत जाँचें; यह तथ्य-जाँच नहीं है।",
    reasonWeak: "स्पष्ट परिणाम देने के लिए मॉडल का संकेत बहुत कमज़ोर है।",
    actionWeak: "संदर्भ जोड़ें और विश्वसनीय स्रोत जाँचें; यह तथ्य-जाँच नहीं है।",
    reasonGenericUncertain: "मॉडल स्पष्ट परिणाम नहीं दे सका।",
    serverUnavailable: "Flask API से संपर्क नहीं हो सका।",
    backendUnavailable: "Python बैकएंड से संपर्क नहीं हो सका।",
    runFlask: "जाँचें कि Flask चल रहा है: .\\venv\\Scripts\\python.exe app.py",
    confirmClearHistory: "क्या इस लोकल ऐप के सभी उपयोगकर्ताओं के साथ साझा जाँच इतिहास मिटाना है?",
    historySubtitle: "इस सर्वर के स्थानीय SQLite डेटाबेस में रखा जाता है; रिकॉर्ड इस ऐप के अन्य उपयोगकर्ताओं के साथ साझा हैं।",
    historyPrompt: "समाचार विश्लेषण चलाएँ; उसका परिणाम यहाँ दिखाई देगा।",
    relatedArticle: "संबंधित लेख",
    relatedNewsDisclaimer: "केवल संबंधित समाचार कवरेज। ये लेख तथ्य-जाँच का निष्कर्ष नहीं हैं।",
    newsApiUnavailable: "NewsAPI संबंधित लेख नहीं दे सका। API key जाँचें या बाद में फिर कोशिश करें।",
    relatedNewsUnavailable: "अभी संबंधित लेख प्राप्त नहीं हो सके।",
    missingInput: "समाचार टेक्स्ट या लेख का URL नहीं दिया गया।",
    inputTypeError: "टेक्स्ट या URL एक स्ट्रिंग होना चाहिए।",
    emptyInput: "टेक्स्ट या URL खाली नहीं हो सकता।",
    inputTooLong: "टेक्स्ट या URL {count} अक्षरों से अधिक नहीं होना चाहिए।",
    articleLoginBlocked: "इस वेबसाइट के लिए लॉगिन ज़रूरी है या यह स्वचालित पहुँच रोकती है। लेख खोलें और उसका टेक्स्ट यहाँ पेस्ट करें।",
    articleRateLimited: "यह वेबसाइट कुछ समय के लिए अनुरोध सीमित कर रही है। बाद में कोशिश करें या लेख का टेक्स्ट पेस्ट करें।",
    articleRequestRefused: "वेबसाइट ने अनुरोध अस्वीकार किया (HTTP {code})। इसके बजाय लेख का टेक्स्ट पेस्ट करें।",
    articleFetchFailed: "लेख प्राप्त नहीं हो सका: {detail}",
    articleUrlInvalid: "लेख का पूरा सार्वजनिक http:// या https:// URL दर्ज करें।",
    articleUrlCredentials: "लॉगिन जानकारी वाले URL समर्थित नहीं हैं।",
    articleUrlPort: "URL में पोर्ट अमान्य है।",
    articleUrlUnsupported: "केवल मानक HTTP/HTTPS पोर्ट वाली सार्वजनिक वेबसाइट समर्थित हैं।",
    articleUrlUnresolved: "वेबसाइट का पता नहीं मिल सका।",
    articleUrlPrivate: "लोकल और निजी नेटवर्क पतों का विश्लेषण नहीं किया जा सकता।",
    articleNotHtml: "यह URL HTML लेख पेज नहीं दिखाता।",
    articleTextMissing: "इस URL पर पढ़ने योग्य लेख टेक्स्ट पर्याप्त मात्रा में नहीं मिला।",
    predictionNotSaved: "अनुमान पूरा हुआ, लेकिन उसे इतिहास में सहेजा नहीं जा सका।",
    serverCouldNotComplete: "सर्वर अनुरोध पूरा नहीं कर सका। विवरण के लिए Flask टर्मिनल देखें।",
    localHistoryLoadFailed: "जाँच का इतिहास लोड नहीं हो सका।",
    localHistoryClearFailed: "जाँच का इतिहास मिटाया नहीं जा सका।",
    savedAccountsInvalid: "सहेजे गए खाते का डेटा अमान्य है। ब्राउज़र में सहेजा खाता डेटा मिटाकर फिर कोशिश करें।",
    secureStorageUnavailable: "यह ब्राउज़र डेमो क्रेडेंशियल सुरक्षित रूप से सहेज नहीं सकता। आधुनिक ब्राउज़र में ऐप localhost पर खोलें।",
    uncertaintyStatusMissing: "बैकएंड से अनिश्चितता की स्थिति सही ढंग से नहीं मिली।",
    clearHistoryFailure: "जाँच का इतिहास मिटाया नहीं जा सका।",
    historyLoadFailure: "जाँच का इतिहास लोड नहीं हो सका।"
  }
};

let currentLanguage = "English";

function tr(key, variables = {}) {
  const phrase = (translations[currentLanguage] || translations.English)[key]
    || translations.English[key]
    || key;
  return phrase.replace(/\{(\w+)\}/g, (_, name) => variables[name] || "");
}

function translateUiMessage(message) {
  if (typeof message !== "string") return "";

  const knownMessages = {
    "Related news coverage only. These articles are not a fact-check verdict.": "relatedNewsDisclaimer",
    "NewsAPI could not provide related articles. Check the API key or try again later.": "newsApiUnavailable",
    "Related articles could not be retrieved right now.": "relatedNewsUnavailable",
    "No news text or article URL provided.": "missingInput",
    "Text or URL must be a string.": "inputTypeError",
    "Text or URL cannot be empty.": "emptyInput",
    "This website requires login or blocks automated access. Open the article and paste its text instead.": "articleLoginBlocked",
    "This website is temporarily limiting requests. Try again later or paste the article text.": "articleRateLimited",
    "Use a complete public http:// or https:// article URL.": "articleUrlInvalid",
    "URLs containing login credentials are not supported.": "articleUrlCredentials",
    "The URL contains an invalid port.": "articleUrlPort",
    "Only public websites on standard HTTP/HTTPS ports are supported.": "articleUrlUnsupported",
    "The website address could not be resolved.": "articleUrlUnresolved",
    "Local and private network addresses cannot be analyzed.": "articleUrlPrivate",
    "That URL does not return an HTML article page.": "articleNotHtml",
    "Not enough readable article text was found at that URL.": "articleTextMissing",
    "The prediction completed but could not be saved to history.": "predictionNotSaved",
    "The server could not complete the request. Check the Flask terminal for details.": "serverCouldNotComplete",
    "Could not load investigation history.": "localHistoryLoadFailed",
    "Could not clear investigation history.": "localHistoryClearFailed"
  };
  if (knownMessages[message]) return tr(knownMessages[message]);

  const inputLimit = message.match(/^Text or URL must be (\d+) characters or fewer\.$/);
  if (inputLimit) return tr("inputTooLong", { count: inputLimit[1] });

  const refusedRequest = message.match(/^The website refused the request \(HTTP (\d+)\)\. Paste the article text instead\.$/);
  if (refusedRequest) return tr("articleRequestRefused", { code: refusedRequest[1] });

  const fetchFailure = message.match(/^Could not retrieve the article: (.+)$/);
  if (fetchFailure) return tr("articleFetchFailed", { detail: fetchFailure[1] });

  return message;
}

function translateExistingText(value) {
  const english = translations.English;
  const hindi = translations.Hindi;
  const key = Object.keys(english).find(
    (translationKey) => english[translationKey] === value
  ) || Object.keys(hindi).find(
    (translationKey) => hindi[translationKey] === value
  );
  if (key) return tr(key);

  const wordCount = value.match(/^(\d+) words analyzed$/)
    || value.match(/^(\d+) शब्दों का विश्लेषण किया गया$/);
  return wordCount ? tr("wordsAnalyzed", { count: wordCount[1] }) : value;
}

function applyLanguage(language) {
  currentLanguage = translations[language] ? language : "English";
  const t = translations[currentLanguage];
  const keysById = {
    navHome: "navHome", navAbout: "navAbout", signInText: "signIn",
    sidebarTitle: "sidebarTitle", sidebarMainLabel: "sidebarMainLabel",
    sidebarAccountLabel: "sidebarAccountLabel", dashboardText: "dashboard",
    historyText: "history", settingsText: "settings", loginText: "login",
    logoutText: "logout", brandTagline: "brandTagline", caseFileLabel: "caseFileLabel",
    heroTitleSecond: "heroTitleSecond", heroDescription: "heroDescription",
    investigateText: "investigate", quickAuthorship: "quickAuthorship",
    quickArticles: "quickArticles", quickSources: "quickSources",
    methodsKicker: "methodsKicker", methodsTitle: "methodsTitle",
    methodsDescription: "methodsDescription", linkTitle: "linkTitle",
    linkDescription: "linkDescription", linkAction: "linkAction", searchTitle: "searchTitle",
    searchDescription: "searchDescription", searchAction: "searchAction",
    shareTitle: "shareTitle", shareDescription: "shareDescription", shareAction: "shareAction",
    confidenceLabel: "confidenceLabel", confidenceDescription: "confidenceDescription",
    confidenceDisclaimer: "confidenceDisclaimer", publisherLabel: "publisher",
    authorLabel: "authorLabel", articlePreviewLabel: "articlePreview",
    articleSourceLink: "openArticle", newsEvidenceTitle: "newsEvidenceTitle",
    newsEvidenceDisclaimer: "newsEvidenceDisclaimer", actionText: "actionText",
    aiDisclaimer: "aiDisclaimer", sourceLinksLabel: "sourceLinks",
    factCheckLink: "factChecks", independentSourcesLink: "independentSources",
    fastText: "fastText", fastDescription: "fastDescription", multiText: "multiText",
    multiDescription: "multiDescription", historyStatText: "historyStatText",
    historyStatDescription: "historyStatDescription", privateText: "privateText",
    privateDescription: "privateDescription", aboutKicker: "aboutKicker",
    aboutTitle: "aboutTitle", aboutDescription: "aboutDescription",
    missionTitle: "missionTitle", missionDescription: "missionDescription",
    howItWorksTitle: "howItWorksTitle", howItWorksDescription: "howItWorksDescription",
    limitationsTitle: "limitationsTitle", limitationsDescription: "limitationsDescription",
    yourDataTitle: "yourDataTitle", yourDataDescription: "yourDataDescription",
    caseAccessLabel: "caseAccessLabel", authSubtitle: "authSubtitle",
    nameLabel: "nameLabel", emailLabel: "emailLabel", passwordLabel: "passwordLabel",
    confirmLabel: "confirmLabel", rememberText: "rememberText", forgotPasswordBtn: "forgotPassword",
    authPrivacy: "authPrivacy", preferencesLabel: "preferencesLabel",
    settingsPanelTitle: "settings", appearanceGroupLabel: "appearanceGroupLabel",
    darkText: "darkText", darkDescription: "darkDescription",
    languageGroupLabel: "languageGroupLabel", languageText: "languageText",
    languageChangeButton: "change", notificationsText: "notificationsText",
    notificationsDescription: "notificationsDescription", historyGroupLabel: "historyGroupLabel",
    historySettingTitle: "historySettingTitle", historySettingDescription: "historySettingDescription",
    historyViewButton: "view", settingNoteText: "settingNoteText",
    settingsActionKicker: "settingsActionKicker", footerText: "footerText"
  };
  Object.entries(keysById).forEach(([id, key]) => {
    const element = $(id);
    if (element) element.textContent = t[key];
  });

  $("heroTitle").childNodes[0].nodeValue = `${t.heroTitleFirst}\n          `;
  $("claimInput").placeholder = t.claimPlaceholder;
  $("authName").placeholder = t.namePlaceholder;
  $("authEmail").placeholder = t.emailPlaceholder;
  $("authPassword").placeholder = t.passwordPlaceholder;
  $("authConfirmPassword").placeholder = t.confirmPlaceholder;
  $("languageSettingText").textContent = t.languageName;
  $("documentTitle").textContent = currentLanguage === "Hindi"
    ? "फेक न्यूज़ डिटेक्टर | जाँच डैशबोर्ड"
    : "Fake News Detector | Investigation Dashboard";
  document.documentElement.lang = currentLanguage === "Hindi" ? "hi" : "en";

  $("menuBtn").setAttribute("aria-label", t.menuAria);
  $("closeSidebar").setAttribute("aria-label", t.closeSidebarAria);
  $("themeBtn").setAttribute("aria-label", t.themeAria);
  $("avatarBtn").setAttribute("aria-label", t.openSettingsAria);
  $("avatarBtn").title = currentLanguage === "Hindi" ? "खाता" : "Account";
  $("closeAuth").setAttribute("aria-label", t.closeAria);
  $("closeResult").setAttribute("aria-label", t.closeResultAria);
  $("confidenceCard").setAttribute("aria-label", t.confidenceAria);
  $("confidenceTrack").setAttribute("aria-label", t.confidenceAria);
  $("articleDetails").setAttribute("aria-label", t.articleDetailsAria);
  $("newsEvidence").setAttribute("aria-label", t.newsEvidenceTitle);
  $("closeSettings").setAttribute("aria-label", t.closeSettingsAria);
  $("closeSettingsAction").setAttribute("aria-label", t.closeAria);
  $("clearSearch").setAttribute("aria-label", t.clear);

  const signup = $("authSubmit").dataset.mode === "signup";
  setAuthMode(signup ? "signup" : "login");
  if (!$("resultSection").classList.contains("hidden") && lastResult) {
    setResult({
      ...lastResult,
      title: translateExistingText(lastResult.title),
      subtitle: translateExistingText(lastResult.subtitle),
      badge: translateExistingText(lastResult.badge),
      action: translateExistingText(lastResult.action),
      checks: lastResult.checks.map((check) => ({
        ...check,
        text: translateExistingText(check.text)
      }))
    });
  }
}


function openLanguageSettings() {

  const savedLanguage = localStorage.getItem("fncLanguage") || "English";

  openSettingsAction(

    tr("languageTitle"),

    tr("languageSubtitle"),

    `
      <div class="language-options">

        <label class="language-option">
          <input type="radio" name="language" value="English" ${savedLanguage === "English" ? "checked" : ""} />
          <span>${tr("languageEnglish")}</span>
        </label>

        <label class="language-option">
          <input type="radio" name="language" value="Hindi" ${savedLanguage === "Hindi" ? "checked" : ""} />
          <span>${tr("languageHindi")}</span>
        </label>

      </div>

      <button type="button" class="auth-submit settings-save-btn" id="saveLanguage">
        ${tr("saveLanguage")}
      </button>
    `

  );

  $("saveLanguage").addEventListener("click", () => {

    const choice =
      document.querySelector('input[name="language"]:checked')?.value || "English";

    localStorage.setItem("fncLanguage", choice);

    applyLanguage(choice);

    showToast(tr("languageChanged", {
      language: translations[choice].languageName
    }));

    closeSettingsAction();

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
        <p>${tr("historyEmpty")}</p>
        <small>${tr("historyPrompt")}</small>
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
        return `<li><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(article.title || tr("relatedArticle"))}</a> — ${escapeHTML(article.publisher || tr("unknownPublisher"))}</li>`;
      })
      .join("");

    return `
          <div class="history-entry">

            <div class="history-entry-top">
              <span class="history-chip ${className}">${escapeHTML(isReal ? tr("stateTrue") : isFake ? tr("stateFake") : tr("stateUncertain"))}</span>
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

    currentLanguage === "Hindi" ? "जाँच का इतिहास" : "Investigation history",

    tr("historySubtitle"),

    `
      <p>${tr("historyLoading")}</p>
    `

  );

  try {
    const response = await fetch("/history");
    const history = await response.json();

    if (!response.ok) {
      throw new Error(translateUiMessage(history.error || tr("historyError")));
    }

    settingsActionContent.innerHTML = `
      ${renderHistory(history)}
      <button type="button" class="settings-secondary-btn" id="clearHistoryBtn">
        <i class="fa-solid fa-trash"></i>
        ${tr("clearHistory")}
      </button>
    `;

    $("clearHistoryBtn").addEventListener("click", async () => {
      if (!window.confirm(tr("confirmClearHistory"))) {
        return;
      }

      try {
        const clearResponse = await fetch("/history", { method: "DELETE" });
        const clearResult = await clearResponse.json();

        if (!clearResponse.ok) {
          throw new Error(translateUiMessage(clearResult.error || tr("clearHistoryFailure")));
        }

        showToast(tr("historyCleared"));
        showHistory();
      } catch (error) {
        console.error("Could not clear investigation history:", error);
        showToast(tr("clearHistoryFailure"));
      }
    });
  } catch (error) {
    console.error("Could not load investigation history:", error);
    settingsActionContent.innerHTML = `<p>${escapeHTML(tr("historyLoadFailure"))}</p>`;
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
  showToast(tr("loggedOut"));
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
    showToast(tr("notificationsDisabled"));
    return;
  }

  if (!("Notification" in window)) {
    notificationToggle.checked = false;
    localStorage.setItem("fncNotifications", "false");
    showToast(tr("notificationsUnsupported"));
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
          ? tr("notificationsDenied")
          : tr("notificationsNotGranted")
      );
      return;
    }

    localStorage.setItem("fncNotifications", "true");
    showToast(tr("notificationsEnabled"));
  } catch (error) {
    console.error("Could not enable browser notifications:", error);
    notificationToggle.checked = false;
    localStorage.setItem("fncNotifications", "false");
    showToast(tr("notificationsFailure"));
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