/* ================= AUTH STATE ================= */

let isLoggedIn = false;


/* ================= INITIALIZE APP ================= */

function initializeApp() {
    let email = localStorage.getItem("email");
    let password = localStorage.getItem("password");
    
    if (email && password) {
        isLoggedIn = true;
        updateProfileUI();
    } else {
        isLoggedIn = false;
        updateGuestUI();
    }
}


function updateProfileUI() {
    let name = localStorage.getItem("name");
    let email = localStorage.getItem("email");
    
    document.getElementById("profileSection").style.display = "flex";
    document.getElementById("guestMessage").style.display = "none";
    
    document.getElementById("userName").innerText = name || "User";
    document.getElementById("userEmail").innerText = email || "";
    document.getElementById("settingsEmail").innerText = email || "";
    document.getElementById("avatar").innerText = name ? name.charAt(0).toUpperCase() : "U";
    
    let authBtn = document.getElementById("authBtn");
    authBtn.innerHTML = "🚪 <span>Logout</span>";
    authBtn.onclick = function() { logout(); };
}


function updateGuestUI() {
    document.getElementById("profileSection").style.display = "none";
    document.getElementById("guestMessage").style.display = "block";
    
    let authBtn = document.getElementById("authBtn");
    authBtn.innerHTML = "🔑 <span>Login</span>";
    authBtn.onclick = function() { showLoginPage(); };
}


/* ================= SIGNUP ================= */

function signup() {

    let name =
        document.getElementById("signupName").value;

    let email =
        document.getElementById("signupEmail").value;

    let password =
        document.getElementById("signupPassword").value;


    if (
        name === "" ||
        email === "" ||
        password === ""
    ) {

        alert("Please fill all fields.");

        return;
    }


    localStorage.setItem("name", name);

    localStorage.setItem("email", email);

    localStorage.setItem("password", password);


    alert("Account created successfully!");

    isLoggedIn = true;
    
    hideForms();
    
    updateProfileUI();
    
    // If on history page, stay there; otherwise go to home
    let currentPageSignup = document.querySelector(".page-section.active");
    if (currentPageSignup && currentPageSignup.id === 'history') {
        openPage('history', document.querySelector('.nav-btn[onclick*="history"]'));
    } else {
        openPage('home', document.querySelector('.nav-btn.active'));
    }

}



/* ================= LOGIN ================= */

function login() {

    let email =
        document.getElementById("loginEmail").value;

    let password =
        document.getElementById("loginPassword").value;


    let savedEmail =
        localStorage.getItem("email");

    let savedPassword =
        localStorage.getItem("password");


    if (
        email === savedEmail &&
        password === savedPassword
    ) {

        isLoggedIn = true;
        
        hideForms();
        
        updateProfileUI();
        
        // If on history page, stay there; otherwise go to home
        let currentPageLogin = document.querySelector(".page-section.active");
        if (currentPageLogin && currentPageLogin.id === 'history') {
            openPage('history', document.querySelector('.nav-btn[onclick*="history"]'));
        } else {
            openPage('home', document.querySelector('.nav-btn.active'));
        }

    } else {

        alert(
            "Incorrect email or password."
        );

    }

}



/* ================= PAGES ================= */

function showLoginPage() {
    closeSidebar();
    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("signupPage").classList.add("hidden");
    document.body.classList.add("modal-open");
}

function showSignup() {
    closeSidebar();
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("signupPage").classList.remove("hidden");
    document.body.classList.add("modal-open");
}

function showLogin() {
    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("signupPage").classList.add("hidden");
}

function hideForms() {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("signupPage").classList.add("hidden");
    document.body.classList.remove("modal-open");
}


/* ================= SIDEBAR ================= */

function toggleSidebar() {
    let sidebar = document.getElementById("sidebar");
    let menuToggle = document.querySelector(".menu-toggle");
    let isOpen = sidebar.classList.toggle("is-open");

    sidebar.setAttribute("aria-hidden", String(!isOpen));
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("sidebar-open", isOpen);
}

function closeSidebar() {
    let sidebar = document.getElementById("sidebar");
    let menuToggle = document.querySelector(".menu-toggle");

    sidebar.classList.remove("is-open");
    sidebar.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("sidebar-open");
}


/* ================= LOGOUT ================= */

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("name");
        localStorage.removeItem("email");
        localStorage.removeItem("password");
        
        isLoggedIn = false;
        
        updateGuestUI();
        
        openPage('home', document.querySelector('.nav-btn.active'));
        
        alert("You have been logged out!");
    }
}



/* ================= NAVIGATION ================= */

function openPage(page, button) {

    closeSidebar();

    let sections =
        document.querySelectorAll(".page-section");


    sections.forEach(function(section) {

        section.classList.remove("active");

    });


    document
        .getElementById(page)
        .classList.add("active");


    let buttons =
        document.querySelectorAll(".nav-btn");


    buttons.forEach(function(btn) {

        btn.classList.remove("active");

    });


    if (button) {

        button.classList.add("active");

    }


    let titles = {

        home: "Dashboard",

        checker: "News Checker",

        history: "History",

        settings: "Settings"

    };


    document
        .getElementById("topTitle")
        .innerText = titles[page];

    // Handle history page - show login prompt if guest
    if (page === 'history') {
        if (!isLoggedIn) {
            document.getElementById("historyLoginPrompt").style.display = "block";
            document.getElementById("historyCard").style.display = "none";
        } else {
            document.getElementById("historyLoginPrompt").style.display = "none";
            document.getElementById("historyCard").style.display = "block";
        }
    }

}


function closeLoginPrompt() {
    document.getElementById("loginPrompt").classList.add("hidden");
}



/* ================= NEWS ANALYSIS ================= */

function analyzeNews() {

    let text =
        document
            .getElementById("newsText")
            .value
            .trim();


    if (text === "") {

        alert(
            "Please paste a news article first."
        );

        return;

    }


    let fakeWords = [

        "shocking",

        "secret",

        "miracle",

        "you won't believe",

        "breaking",

        "100% true",

        "viral",

        "guaranteed",

        "government hiding",

        "click here"

    ];


    let score = 78;


    let lowerText =
        text.toLowerCase();


    fakeWords.forEach(function(word) {

        if (lowerText.includes(word)) {

            score -= 8;

        }

    });


    if (text.length < 80) {

        score -= 10;

    }


    if (score < 25) {

        score = 25;

    }


    if (score > 95) {

        score = 95;

    }


    let result =
        document.getElementById("result");

    let status =
        document.getElementById("resultStatus");

    let confidence =
        document.getElementById("confidence");

    let bar =
        document.getElementById("progressBar");


    result.classList.remove("hidden");


    confidence.innerText =
        score + "%";


    bar.style.width =
        score + "%";


    if (score >= 60) {

        status.innerText =
            "🟢 Likely Genuine";

    } else {

        status.innerText =
            "🔴 Potentially Misleading";

    }


    /* COUNTERS */

    let storageKey = isLoggedIn ? 'checked' : 'guest_checked';
    let genuineKey = isLoggedIn ? 'genuine' : 'guest_genuine';
    let fakeKey = isLoggedIn ? 'fake' : 'guest_fake';
    
    let checked =
        parseInt(
            (isLoggedIn ? localStorage : sessionStorage).getItem(storageKey) || "0"
        );

    let genuine =
        parseInt(
            (isLoggedIn ? localStorage : sessionStorage).getItem(genuineKey) || "0"
        );

    let fake =
        parseInt(
            (isLoggedIn ? localStorage : sessionStorage).getItem(fakeKey) || "0"
        );


    checked++;


    if (score >= 60) {

        genuine++;

    } else {

        fake++;

    }


    if (isLoggedIn) {
        localStorage.setItem(storageKey, checked);
        localStorage.setItem(genuineKey, genuine);
        localStorage.setItem(fakeKey, fake);
    } else {
        sessionStorage.setItem(storageKey, checked);
        sessionStorage.setItem(genuineKey, genuine);
        sessionStorage.setItem(fakeKey, fake);
    }


    updateStats();


    /* HISTORY */

    let history =
        document.getElementById("historyList");


    let item =
        document.createElement("div");


    item.className = "activity";


    item.innerHTML =

        "<div class='activity-title'>" +

        text.substring(0, 70) +

        "...</div>" +

        "<div class='activity-time'>" +

        "Confidence: " +

        score +

        "%</div>";


    history.prepend(item);


    /* RECENT ACTIVITY */

    let activity =
        document.getElementById("activityList");


    let activityItem =
        document.createElement("div");


    activityItem.className =
        "activity";


    activityItem.innerHTML =

        "<div class='activity-title'>" +

        (score >= 60
            ? "🟢 Likely genuine news"
            : "🔴 Potentially misleading") +

        "</div>" +

        "<div class='activity-time'>" +

        "Just now · " +

        score +

        "% confidence" +

        "</div>";


    activity.prepend(activityItem);

}


/* ================= APP STARTUP ================= */

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});



/* ================= STATS ================= */

function updateStats() {

    let storageKey = isLoggedIn ? 'checked' : 'guest_checked';
    let genuineKey = isLoggedIn ? 'genuine' : 'guest_genuine';
    let fakeKey = isLoggedIn ? 'fake' : 'guest_fake';
    
    let storage = isLoggedIn ? localStorage : sessionStorage;

    document
        .getElementById("checkedCount")
        .innerText =
        storage.getItem(storageKey) || "0";


    document
        .getElementById("genuineCount")
        .innerText =
        storage.getItem(genuineKey) || "0";


    document
        .getElementById("fakeCount")
        .innerText =
        storage.getItem(fakeKey) || "0";

}
/* ================= SETTINGS FUNCTIONS ================= */


/* SAVE PROFILE */

function saveProfile() {

    function saveProfile() {

    const nameInput = document.getElementById("settingsName");
    const emailInput = document.getElementById("settingsEmailInput");

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name) {
        alert("Please enter your name.");
        return;
    }

    if (!email) {
        alert("Please enter your email.");
        return;
    }

    localStorage.setItem("name", name);
    localStorage.setItem("email", email);

    updateProfileUI();

    alert("Profile saved successfully!");
}
}


/* APPEARANCE */

function toggleAppearance() {

    const toggle = document.getElementById("appearanceToggle");

    if (!toggle) return;

    if (toggle.checked) {

        document.body.classList.add("dark-mode");

        localStorage.setItem("appearance", "dark");

    } else {

        document.body.classList.remove("dark-mode");

        localStorage.setItem("appearance", "light");

    }
}


/* LOAD APPEARANCE */

function loadAppearance() {

    const toggle = document.getElementById("appearanceToggle");

    if (!toggle) return;

    const appearance =
        localStorage.getItem("appearance") || "light";

    if (appearance === "dark") {

        document.body.classList.add("dark-mode");
        toggle.checked = true;

    } else {

        document.body.classList.remove("dark-mode");
        toggle.checked = false;

    }
}


/* LANGUAGE */

function saveLanguage() {

    const languageSelect =
        document.getElementById("languageSelect");

    if (!languageSelect) return;

    const language = languageSelect.value;

    localStorage.setItem("language", language);

    alert("Language preference saved as " + language + ".");
}


/* LOAD LANGUAGE */

function loadLanguage() {

    const languageSelect =
        document.getElementById("languageSelect");

    if (!languageSelect) return;

    const language =
        localStorage.getItem("language") || "English";

    languageSelect.value = language;
}


/* NOTIFICATIONS */

function toggleNotifications() {

    const toggle =
        document.getElementById("notificationToggle");

    if (!toggle) return;

    localStorage.setItem(
        "notifications",
        toggle.checked ? "on" : "off"
    );

    alert(
        toggle.checked
            ? "Notifications enabled."
            : "Notifications disabled."
    );
}


/* LOAD NOTIFICATIONS */

function loadNotifications() {

    const toggle =
        document.getElementById("notificationToggle");

    if (!toggle) return;

    const notifications =
        localStorage.getItem("notifications");

    toggle.checked = notifications !== "off";
}


/* CLEAR HISTORY */

function clearHistory() {

    const confirmClear =
        confirm(
            "Are you sure you want to clear all your analysis history?"
        );

    if (!confirmClear) return;

    localStorage.removeItem("history");

    sessionStorage.removeItem("history");

    updateStats();

    const historyList =
        document.getElementById("historyList");

    if (historyList) {
        historyList.innerHTML = "No history yet.";
    }

    const activityList =
        document.getElementById("activityList");

    if (activityList) {
        activityList.innerHTML = `
            <div class="activity">
                <div class="activity-title">No checks yet</div>
                <div class="activity-time">
                    Analyze your first article
                </div>
            </div>
        `;
    }

    alert("Analysis history cleared.");
}


/* CHANGE PASSWORD */

function changePassword() {

    const passwordInput =
        document.getElementById("newPassword");

    if (!passwordInput) return;

    const newPassword =
        passwordInput.value.trim();

    if (!newPassword) {
        alert("Please enter a new password.");
        return;
    }

    if (newPassword.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    localStorage.setItem("password", newPassword);

    passwordInput.value = "";

    alert("Password changed successfully!");
}


/* LOAD SETTINGS */

function loadSettings() {

    const nameInput =
        document.getElementById("settingsName");

    const emailInput =
        document.getElementById("settingsEmailInput");

    const savedName =
        localStorage.getItem("name") || "";

    const savedEmail =
        localStorage.getItem("email") || "";

    if (nameInput) {
        nameInput.value = savedName;
    }

    if (emailInput) {
        emailInput.value = savedEmail;
    }

    loadAppearance();
    loadLanguage();
    loadNotifications();
}


/* LOAD SETTINGS WHEN PAGE OPENS */

document.addEventListener("DOMContentLoaded", function () {

    loadSettings();

});
