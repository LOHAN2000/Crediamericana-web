const AUTH_STORAGE_KEYS = Object.freeze({
    token: "crediamericana_token",
    user: "crediamericana_user",
    expiration: "crediamericana_expiration"
});

function saveSession(loginData) {
    const { token, expiration, user } = loginData;

    localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
    localStorage.setItem(
        AUTH_STORAGE_KEYS.user,
        JSON.stringify(user)
    );
    localStorage.setItem(
        AUTH_STORAGE_KEYS.expiration,
        expiration
    );
}

function getToken() {
    return localStorage.getItem(AUTH_STORAGE_KEYS.token);
}

function getStoredUser() {
    const storedUser = localStorage.getItem(
        AUTH_STORAGE_KEYS.user
    );

    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch {
        clearSession();
        return null;
    }
}

function getExpiration() {
    return localStorage.getItem(
        AUTH_STORAGE_KEYS.expiration
    );
}

function isSessionExpired() {
    const expiration = getExpiration();

    if (!expiration) {
        return true;
    }

    return new Date(expiration).getTime() <= Date.now();
}

function isAuthenticated() {
    const token = getToken();
    const user = getStoredUser();

    if (!token || !user || isSessionExpired()) {
        clearSession();
        return false;
    }

    return true;
}

function clearSession() {
    localStorage.removeItem(AUTH_STORAGE_KEYS.token);
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    localStorage.removeItem(AUTH_STORAGE_KEYS.expiration);
}

function logout() {
    clearSession();
    window.location.href = getLoginPath();
}

function getLoginPath() {
    const isInsidePages = window.location.pathname.includes(
        "/pages/"
    );

    return isInsidePages ? "../login.html" : "login.html";
}

function getDashboardPath() {
    const isInsidePages = window.location.pathname.includes(
        "/pages/"
    );

    return isInsidePages
        ? "../dashboard.html"
        : "dashboard.html";
}

function requireAuthentication() {
    if (!isAuthenticated()) {
        window.location.replace(getLoginPath());
        return false;
    }

    return true;
}

function requireRole(requiredRole) {
    if (!requireAuthentication()) {
        return false;
    }

    const user = getStoredUser();

    if (!user || user.role !== requiredRole) {
        window.location.replace(getDashboardPath());
        return false;
    }

    return true;
}

async function authenticatedFetch(
    endpoint,
    options = {}
) {
    if (!isAuthenticated()) {
        logout();
        return null;
    }

    const requestHeaders = {
        ...options.headers,
        Authorization: `Bearer ${getToken()}`
    };

    if (
        options.body &&
        !(options.body instanceof FormData)
    ) {
        requestHeaders["Content-Type"] =
            requestHeaders["Content-Type"] ??
            "application/json";
    }

    const response = await fetch(
        `${API_CONFIG.baseUrl}${endpoint}`,
        {
            ...options,
            headers: requestHeaders
        }
    );

    if (response.status === 401) {
        clearSession();
        window.location.replace(getLoginPath());
        return null;
    }

    return response;
}