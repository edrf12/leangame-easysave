// ==UserScript==
// @name         Easy Save for Lean Game Server
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @downloadURL  https://github.com/edrf12/leangame-easysave/raw/main/EasySaveLGS.user.js
// @updateURL    https://github.com/edrf12/leangame-easysave/raw/main/EasySaveLGS.user.js
// @description  This adds a save and load button to the games on the Lean Game Server (https://adam.math.hhu.de), allowing for easy GitHub synchronization of your progress.
// @author       edrf12
// @match        https://adam.math.hhu.de/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @connect      api.github.com
// @connect      github.com
// @require      https://gist.githubusercontent.com/edrf12/e81c1a9ab12a7b9046f0b6cc592b59ba/raw/70cd866df8f8b60879c667194d736004ae5b6eae/waitForElement.js
// ==/UserScript==

let token = GM_getValue("gh_token", null)
let repo = GM_getValue("gh_repo", null)

async function configure() {
    //let new_token = prompt("Please generate a GitHub access token with repository permissions. You may generate one at https://github.com/settings/tokens/new")
    let new_repo = prompt("Enter the name of the repository you wish to save your progress to in the format \"octocat/octocat.github.io\"")
    let new_token = await login()

    GM_setValue("gh_token", new_token)
    GM_setValue("gh_repo", new_repo)

    token = new_token
    repo = new_repo
}

async function login() {
    const CLIENT_ID = "Ov23liEXDhGKtgeOvIv5"
    const SCOPE = "repo"

    let code_request = await GM.xmlHttpRequest({
        method: "POST",
        url: `https://github.com/login/device/code?client_id=${CLIENT_ID}&scope=${SCOPE}`,
    })
    let code_request_response = Object.fromEntries(new URLSearchParams(code_request.response))
    let interval = code_request_response.interval
    let code = code_request_response.user_code
    let verify = code_request_response.verification_uri
    console.log(code_request.response)

    await GM.setClipboard(code, "text")

    alert(`The login code has been copied to your clipboard (${code}), use it to login on the tab that will open when you close this alert or at ${verify}`)

    let tab = GM_openInTab(verify, { "active": true })

    let token = null
    while (!token) {
        let token_request = await GM.xmlHttpRequest({
            method: "POST",
            url: `https://github.com/login/oauth/access_token?client_id=${CLIENT_ID}&device_code=${code_request_response.device_code}&grant_type=urn:ietf:params:oauth:grant-type:device_code`
        })
        let token_request_response = Object.fromEntries(new URLSearchParams(token_request.response))

        if (token_request_response.access_token) {
            token = token_request_response.access_token
            tab.close()
            break
        }

        switch (token_request_response.error) {
            case "slow_down":
                interval = token_request_response.interval
                break;
            case "expired_token":
                alert("Token has expired, start the login process again.")
                break;
            case "access_denied":
                alert("You cancelled the authentication request.")
                break;
        }

        await new Promise(r => setTimeout(r, interval * 1000));
    }

    return token
}

async function saveProgress() {
    let data = JSON.parse(window.localStorage.getItem("game_progress"))
    let game = location.hash.substring(2)
    let encoded_data = btoa(JSON.stringify(data.games[game], null, 4))
    let message = prompt("Commit Message")
    let sha = null

    if (message != null) {
        await GM.xmlHttpRequest({
            method: "GET",
            url: `https://api.github.com/repos/${repo}/contents/${location.hash.split("/")[3]}.json`,
            headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${token}`,
                "X-Github-Api-Version": "2022-11-28"
            },
            responseType: "json",
            onload: (response) => {
                sha = response.response.sha
            }
        })

        let request = GM_xmlhttpRequest({
            method: "PUT",
            url: `https://api.github.com/repos/${repo}/contents/${location.hash.split("/")[3]}.json`,
            headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${token}`,
                "X-Github-Api-Version": "2022-11-28"
            },
            data: JSON.stringify({
                "message": message,
                "content": encoded_data,
                "sha": sha
            }),
            onload: (response) => {
                if (response.status == 201 || response.status == 200) {
                    alert("Your progress has been saved.")
                } else {
                    console.warn(response)
                    alert("An error ocurred when saving your progress, please check the console for more information.")
                }
            }
        })
        }
}

async function loadProgress() {
    let game = location.hash.substring(2)

    GM_xmlhttpRequest({
        method: "GET",
        url: `https://api.github.com/repos/${repo}/contents/${location.hash.split("/")[3]}.json`,
        headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${token}`,
            "X-Github-Api-Version": "2022-11-28"
        },
        responseType: "json",
        onload: (response) => {
            let data = JSON.parse(window.localStorage.getItem("game_progress"))
            data.games[game] = JSON.parse(atob(response.response.content))
            let new_data = JSON.stringify(data)
            window.localStorage.setItem("game_progress", new_data)
            location.reload()
        }
    })
}

function init() {
    'use strict';

    if (!location.href.includes("world") && location.href.includes("g") && !document.querySelector("#login-btn")) {
        let saveBtn = document.createElement("button")
        let loadBtn = document.createElement("button")
        let loginBtn = document.createElement("button")

        saveBtn.className = "btn btn-inverted"
        saveBtn.id = "save-btn"
        saveBtn.innerHTML = "Save"
        saveBtn.addEventListener("mouseup", () => {
            saveProgress()
        })

        loadBtn.className = "btn btn-inverted"
        loadBtn.id = "load-btn"
        loadBtn.innerHTML = "Load"
        loadBtn.addEventListener("mouseup", () => {
            loadProgress()
        })

        loginBtn.className = "btn btn-inverted"
        loginBtn.id = "login-btn"

        if (!token || !repo) {
            loginBtn.innerHTML = "Login"
            saveBtn.disabled = true
            loadBtn.disabled = true
        } else {
            loginBtn.innerHTML = "Logout"
            saveBtn.disabled = false
            loadBtn.disabled = false
        }

        loginBtn.addEventListener("mouseup", () => {
            if (!token || !repo) {
                configure().then(() => {
                    if (token && repo) {
                        loginBtn.innerHTML = "Logout"
                        saveBtn.disabled = false
                        loadBtn.disabled = false
                    }
                })
            } else {
                GM_setValue("gh_token", null)
                GM_setValue("gh_repo", null)
                token = null
                repo = null
                loginBtn.innerHTML = "Login"
                saveBtn.disabled = true
                loadBtn.disabled = true
            }
        })

        document.querySelector("#root > div > div.app-bar > div.nav-btns").prepend(saveBtn, loadBtn, loginBtn)
    }
}

(function (history) {
    let pushState = history.pushState;
    history.pushState = function () {
        setTimeout(() => {
            init();
        }, 100);
        return pushState.apply(history, arguments);
    };
})(window.history);

waitForElement('#root > div > div.app-bar > div.nav-btns').then(() => {
    init()
});
