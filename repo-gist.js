// ==UserScript==
// @name         Repo Gist
// @namespace    https://github.com/prudentbird
// @version      0.0.1
// @description  Provides GitHub repositories as additional context.
// @author       Prudent Bird
// @match        https://t3.chat/*
// @match        https://beta.t3.chat/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=t3.chat
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @connect      https://generativelanguage.googleapis.com
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  // --- Configuration and State ---
  let debugMode = false;
  const DB_VERSION = 1;
  const SCRIPT_VERSION = "0.1.0";
  const SCRIPT_NAME = "Repo Gist";
  const DB_NAME = "t3chat_repogist_db";
  const STORE_NAME = "repogist_states";
  const githubSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-github-icon lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`;

  const GM_STORAGE_KEYS = {
    DEBUG: "debug",
    API_URL: "apiUrl",
    GEMINI_API_KEY: "geminiApiKey",
  };

  // --- Utility: Logger ---
  const Logger = {
    log: (...args) => {
      if (debugMode) console.log(`[${SCRIPT_NAME}]`, ...args);
    },
    error: (...args) => console.error(`[${SCRIPT_NAME}]`, ...args),
  };

  const getChatId = () => {
    const currentUrl = window.location.href;
    const match = currentUrl.match(/\/chat\/([^/?#]+)/);
    const chatId = match ? match[1] : null;
    if (!chatId) {
      Logger.log("getChatId: No chat ID found in URL", currentUrl);
    }
    return chatId;
  };

  let apiUrl = null;
  let geminiApiKey = null;

  const ApiKeyModal = {
    _isShown: false,
    _isValidURL: (url) => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    },
    show: () => {
      if (document.getElementById(UI_IDS.apiKeyModal) || ApiKeyModal._isShown)
        return;
      ApiKeyModal._isShown = true;
      const wrapper = document.createElement("div");
      wrapper.id = UI_IDS.apiKeyModal;
      wrapper.innerHTML = `
    <div id="${UI_IDS.apiKeyModalContent}">
      <div id="${UI_IDS.apiKeyModalHeader}">
        <div><!-- Icon container -->
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cog-icon lucide-cog"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27 7 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 7 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m17 3.34-1 1.73"/><path d="m11 13.73-4 6.93"/></svg>
        </div>
        <div>Enter API Configuration</div><!-- Title -->
        <button id="${UI_IDS.apiKeyModalCloseButton}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>
      <div id="${UI_IDS.apiKeyModalInputContainer}">
        <label for="${UI_IDS.apiKeyModalInput}">RepoGist API URL</label>
        <input id="${UI_IDS.apiKeyModalInput}" type="text" placeholder="https://api.repogist.com/ingest" />
        <button id="${UI_IDS.apiKeyModalClearButton}" aria-label="Clear input"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>
      </div>
      <div id="${UI_IDS.apiKeyModalInputContainer}">
        <label for="${UI_IDS.geminiApiKeyInput}">Gemini API Key</label>
        <input id="${UI_IDS.geminiApiKeyInput}" type="text" placeholder="Enter your Gemini API key" />
        <button id="${UI_IDS.geminiApiKeyClearButton}" aria-label="Clear input"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>
      </div>
      <button id="${UI_IDS.apiKeyModalSaveButton}">Save</button>
    </div>`;
      document.body.appendChild(wrapper);
      const input = wrapper.querySelector(`#${UI_IDS.apiKeyModalInput}`);
      if (input) {
        input.focus();
      }
      ApiKeyModal._attachEventListeners(wrapper);
    },
    _attachEventListeners: (modalElement) => {
      const urlInput = modalElement.querySelector(
        `#${UI_IDS.apiKeyModalInput}`
      );
      const geminiKeyInput = modalElement.querySelector(
        `#${UI_IDS.geminiApiKeyInput}`
      );
      const saveButton = modalElement.querySelector(
        `#${UI_IDS.apiKeyModalSaveButton}`
      );
      const closeButton = modalElement.querySelector(
        `#${UI_IDS.apiKeyModalCloseButton}`
      );
      const clearButton = modalElement.querySelector(
        `#${UI_IDS.apiKeyModalClearButton}`
      );
      const geminiClearButton = modalElement.querySelector(
        `#${UI_IDS.geminiApiKeyClearButton}`
      );

      modalElement.addEventListener("click", (e) => {
        if (e.target === modalElement) {
          ApiKeyModal._isShown = false;
          modalElement.remove();
        }
      });

      const updateClearButtonVisibility = (input, button) => {
        if (button) {
          button.style.display = input.value ? "flex" : "none";
        }
      };

      updateClearButtonVisibility(urlInput, clearButton);
      updateClearButtonVisibility(geminiKeyInput, geminiClearButton);

      if (clearButton) {
        clearButton.addEventListener("click", () => {
          urlInput.value = "";
          urlInput.focus();
          updateClearButtonVisibility(urlInput, clearButton);
        });
      }

      if (geminiClearButton) {
        geminiClearButton.addEventListener("click", () => {
          geminiKeyInput.value = "";
          geminiKeyInput.focus();
          updateClearButtonVisibility(geminiKeyInput, geminiClearButton);
        });
      }

      urlInput.addEventListener("input", () =>
        updateClearButtonVisibility(urlInput, clearButton)
      );
      geminiKeyInput.addEventListener("input", () =>
        updateClearButtonVisibility(geminiKeyInput, geminiClearButton)
      );

      const handleSave = () => {
        const url = urlInput.value.trim();
        const geminiKey = geminiKeyInput.value.trim();

        if (url && !ApiKeyModal._isValidURL(url)) {
          alert("Invalid RepoGist API URL");
          return;
        }

        if (url) {
          GM_setValue(GM_STORAGE_KEYS.API_URL, url)
            .then(() => {
              apiUrl = url;
              if (geminiKey) {
                return GM_setValue(GM_STORAGE_KEYS.GEMINI_API_KEY, geminiKey);
              }
            })
            .then(() => {
              if (geminiKey) {
                geminiApiKey = geminiKey;
              }
              ApiKeyModal._isShown = false;
              modalElement.remove();
            })
            .catch((err) => {
              Logger.error("Failed to save API configuration:", err);
            });
        } else {
          ApiKeyModal._isShown = false;
          modalElement.remove();
        }
      };

      saveButton.addEventListener("click", handleSave);

      urlInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleSave();
        }
      });

      geminiKeyInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleSave();
        }
      });

      closeButton.addEventListener("click", () => {
        ApiKeyModal._isShown = false;
        modalElement.remove();
      });
    },
  };

  const getRepoNamefromURL = (url) => {
    if (typeof url !== "string") {
      Logger.log("getRepoNamefromURL: Invalid URL type", typeof url);
      return null;
    }
    url = url.replace(/\/+$/, "");
    let match = url.match(/[:\/]([^\/]+)\.git$/);
    if (match) {
      Logger.log("getRepoNamefromURL: Found .git URL match", match[1]);
      return match[1];
    }
    match = url.match(/\/([^\/]+)(?:\/tree\/[^\/]+)?$/);
    if (match) {
      Logger.log("getRepoNamefromURL: Found standard URL match", match[1]);
      return match[1];
    }
    Logger.log("getRepoNamefromURL: No match found for URL", url);
    return null;
  };

  const selectors = {
    messageActions: "div.ml-\\[-7px\\].flex.items-center.gap-1",
    searchButton: 'button#search-toggle[aria-label="Enable search"]',
  };

  const UI_IDS = {
    apiKeyModal: "api-key-modal",
    apiKeyModalContent: "api-key-modal-content",
    apiKeyModalHeader: "api-key-modal-header",
    apiKeyModalInput: "api-key-modal-input",
    apiKeyModalInputContainer: "api-key-modal-input-container",
    apiKeyModalSaveButton: "api-key-modal-save-button",
    apiKeyModalCloseButton: "api-key-modal-close-button",
    apiKeyModalClearButton: "api-key-modal-clear-button",
    geminiApiKeyInput: "gemini-api-key-input",
    geminiApiKeyClearButton: "gemini-api-key-clear-button",
    importButton: "import-button",
    searchToggle: "search-toggle",
    repoUrlModal: "repo-url-modal",
    repoUrlModalContent: "repo-url-modal-content",
    repoUrlModalHeader: "repo-url-modal-header",
    repoUrlModalDescription: "repo-url-modal-description",
    repoUrlModalInput: "repo-url-modal-input",
    repoUrlModalSaveButton: "repo-url-modal-save-button",
    repoUrlModalCloseButton: "repo-url-modal-close-button",
    repoUrlModalClearButton: "repo-url-modal-clear-button",
    repoUrlModalInputContainer: "repo-url-modal-input-container",
    styleElement: "repo-gist-style",
  };

  const CSS_CLASSES = {
    button:
      "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 disabled:cursor-not-allowed hover:bg-muted/40 hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-foreground/50 px-3 text-xs -mb-1.5 h-auto gap-2 rounded-full border border-solid border-secondary-foreground/10 py-1.5 pl-2 pr-2.5 text-muted-foreground",
    importButtonLoading: "loading",
    importButtonOn: "on",
  };

  const StyleManager = {
    injectGlobalStyles: () => {
      if (document.getElementById(UI_IDS.styleElement)) return;
      const styleEl = document.createElement("style");
      styleEl.id = UI_IDS.styleElement;
      styleEl.textContent = `
      /* Button toggle animation */
      #${UI_IDS.importButton} { position: relative; overflow: hidden; transition: color 0.3s ease; }
      #${UI_IDS.importButton}::before { content: ''; position: absolute; inset: 0; background-color: rgba(219,39,119,0.15); transform: scaleX(0); transform-origin: left; transition: transform 0.3s ease; z-index:-1; }
      #${UI_IDS.importButton}.${CSS_CLASSES.importButtonOn}::before { transform: scaleX(1); }
      #${UI_IDS.importButton} svg { transition: transform 0.3s ease; }
      #${UI_IDS.importButton}.${CSS_CLASSES.importButtonOn} svg { transform: rotate(360deg); }
      
      /* Loading state */
      #${UI_IDS.importButton}.${CSS_CLASSES.importButtonLoading} { opacity: 0.6; position: relative; }
      #${UI_IDS.importButton}.${CSS_CLASSES.importButtonLoading}::after { content: ''; position: absolute; top:50%; left:50%; width:12px; height:12px; margin:-6px 0 0 -6px; border:2px solid currentColor; border-radius:50%; border-top-color:transparent; animation:spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* Repo URL Modal Styles */
      #${UI_IDS.repoUrlModal} {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      #${UI_IDS.repoUrlModalContent} {
        background: #1c1c1e;
        padding: 24px;
        border-radius: 12px;
        width: 500px;
        max-width: 95vw;
        box-sizing: border-box;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      }
      @media (max-width: 600px) {
        #${UI_IDS.repoUrlModalContent} {
          width: 95vw;
          padding: 16px;
        }
      }
      #${UI_IDS.repoUrlModalHeader} {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        position: relative;
      }
      #${UI_IDS.repoUrlModalHeader} > div:first-child { /* Icon container */
        color: #c62a88;
        margin-right: 12px;
      }
      #${UI_IDS.repoUrlModalHeader} > div:last-child { /* Title container */
        font-size: 22px;
        font-weight: 600;
        color: #fff;
      }
      #${UI_IDS.repoUrlModalCloseButton} {
        position: absolute;
        top: 0;
        right: 0;
        background: none;
        border: none;
        cursor: pointer;
        color: #fff;
        font-size: 24px;
        transition: color 0.3s ease;
      }
      #${UI_IDS.repoUrlModalDescription} {
        color: #999;
        font-size: 14px;
        margin-bottom: 16px;
      }
      #${UI_IDS.repoUrlModalInputContainer} {
        position: relative;
        width: 100%;
        margin-bottom: 16px;
      }
      #${UI_IDS.repoUrlModalInput} {
        width: 100%;
        padding: 12px 36px 12px 12px;
        box-sizing: border-box;
        background: #2a2a2c;
        color: #fff;
        border: 1px solid #333;
        border-radius: 6px;
        outline: none;
        font-size: 14px;
      }
      #${UI_IDS.repoUrlModalClearButton} {
        position: absolute;
        top: 50%;
        right: 10px;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        color: #aaa;
        transition: color 0.2s ease;
        padding: 0;
      }
      #${UI_IDS.repoUrlModalClearButton}:hover {
        color: #c62a88;
      }
      #${UI_IDS.repoUrlModalSaveButton} {
        width: 100%;
        padding: 12px;
        background: #a02553;
        border: none;
        border-radius: 6px;
        color: white;
        cursor: pointer;
        font-size: 15px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      #${UI_IDS.repoUrlModalSaveButton}:hover {
        background: #c62a88;
      }

      /* API Key Modal Styles */
       #${UI_IDS.apiKeyModal} {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      #${UI_IDS.apiKeyModalContent} {
        background: #1c1c1e;
        padding: 24px;
        border-radius: 12px;
        width: 500px;
        max-width: 95vw;
        box-sizing: border-box;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      }
      @media (max-width: 600px) {
        #${UI_IDS.apiKeyModalContent} {
          width: 95vw;
          padding: 16px;
        }
      }
      #${UI_IDS.apiKeyModalHeader} {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        position: relative;
      }
      #${UI_IDS.apiKeyModalHeader} > div:first-child { /* Icon container */
        color: #c62a88;
        margin-right: 12px;
      }
      #${UI_IDS.apiKeyModalHeader} > div:last-child { /* Title container */
        font-size: 22px;
        font-weight: 600;
        color: #fff;
      }
      #${UI_IDS.apiKeyModalCloseButton} {
        position: absolute;
        top: 0;
        right: 0;
        background: none;
        border: none;
        cursor: pointer;
        color: #fff;
        font-size: 24px;
        transition: color 0.3s ease;
      }
      #${UI_IDS.apiKeyModalInputContainer} {
        position: relative;
        width: 100%;
        margin-bottom: 16px;
      }
      #${UI_IDS.apiKeyModalInputContainer} label {
        display: block;
        color: #999;
        font-size: 14px;
        margin-bottom: 8px;
      }
      #${UI_IDS.apiKeyModalInput} {
        width: 100%;
        padding: 12px 36px 12px 12px;
        box-sizing: border-box;
        background: #2a2a2c;
        color: #fff;
        border: 1px solid #333;
        border-radius: 6px;
        outline: none;
        font-size: 14px;
      }
      #${UI_IDS.apiKeyModalInput}:focus {
        border-color: #c62a88;
      }
      #${UI_IDS.geminiApiKeyInput} {
        width: 100%;
        padding: 12px 36px 12px 12px;
        box-sizing: border-box;
        background: #2a2a2c;
        color: #fff;
        border: 1px solid #333;
        border-radius: 6px;
        outline: none;
        font-size: 14px;
      }
      #${UI_IDS.geminiApiKeyInput}:focus {
        border-color: #c62a88;
      }
      #${UI_IDS.apiKeyModalClearButton}, #${UI_IDS.geminiApiKeyClearButton} {
        position: absolute;
        top: 68%;
        right: 10px;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        color: #aaa;
        transition: color 0.2s ease;
        padding: 0;
      }
      #${UI_IDS.apiKeyModalClearButton}:hover, #${UI_IDS.geminiApiKeyClearButton}:hover {
        color: #c62a88;
      }
      #${UI_IDS.apiKeyModalSaveButton} {
        width: 100%;
        padding: 12px;
        background: #a02553;
        border: none;
        border-radius: 6px;
        color: white;
        cursor: pointer;
        font-size: 15px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      #${UI_IDS.apiKeyModalSaveButton}:hover {
        background: #c62a88;
      }`;
      document.head.appendChild(styleEl);
    },
  };

  const UIManager = {
    importButton: null,
    _createImportButton: () => {
      return new Promise((resolve) => {
        const chatId = getChatId();
        IngestDBManager.getState(chatId)
          .then((state) => {
            const button = document.createElement("button");
            if (state && state.repoUrl) {
              button.innerHTML = `${githubSVG} ${getRepoNamefromURL(
                state.repoUrl
              )
                .split("/")
                .pop()
                .slice(0, 10)
                .replace(/^./, (c) => c.toUpperCase())}`;
              button.id = UI_IDS.importButton;
              button.type = "button";
              button.setAttribute("aria-label", "Disable import");
              button.setAttribute("data-state", "open");
              button.className = CSS_CLASSES.button;
              button.dataset.mode = "on";
              button.classList.toggle(CSS_CLASSES.importButtonOn);
            } else {
              button.innerHTML = `${githubSVG} Import Repo`;
              button.id = UI_IDS.importButton;
              button.type = "button";
              button.setAttribute("aria-label", "Enable import");
              button.setAttribute("data-state", "closed");
              button.className = CSS_CLASSES.button;
              button.dataset.mode = "off";
            }

            button.addEventListener("click", () => {
              if (!apiUrl || !geminiApiKey) {
                ApiKeyModal.show();
                return;
              }

              if (!chatId) {
                alert("No chat ID found, can't import repo");
                Logger.log("No chat ID found, skipping import button click");
                return;
              }

              if (RepoUrlModal._isShown) {
                RepoUrlModal._isShown = false;
                return;
              }

              RepoUrlModal.show();
            });
            resolve(button);
          })
          .catch((err) => {
            Logger.error("Failed to create import button:", err);
            resolve(null);
          });
      });
    },
    injectImportButton: () => {
      return new Promise((resolve) => {
        const messageActions = document.querySelectorAll(
          selectors.messageActions
        );

        if (!messageActions || messageActions.length === 0) {
          Logger.error("Message Actions not found.");
          resolve(false);
          return;
        }

        UIManager._createImportButton()
          .then((button) => {
            UIManager.importButton = button;
            if (!button) {
              Logger.error("Import button not found.");
              resolve(false);
              return;
            }

            messageActions.forEach((container) => {
              if (!container.querySelector(`#${UI_IDS.importButton}`)) {
                container.appendChild(button);
              }
            });
            resolve(true);
          })
          .catch((err) => {
            Logger.error("Failed to inject import button:", err);
            resolve(false);
          });
      });
    },
  };

  const RepoUrlModal = {
    _isShown: false,
    _isValidRepoUrl: (url) => {
      const patterns = [
        /^git@[^:]+:.+\.git$/,
        /^https:\/\/[^/]+\/.+\.git$/,
        /^https:\/\/github\.com\/[^/]+\/[^/]+(\/tree\/[^/]+)?$/,
        /^https:\/\/gitlab\.com\/[^/]+\/[^/]+(\/-\/tree\/[^/]+)?$/,
      ];

      return patterns.some((pattern) => pattern.test(url));
    },
    show: () => {
      return new Promise((resolve) => {
        const chatId = getChatId();
        IngestDBManager.getState(chatId)
          .then((state) => {
            if (
              document.getElementById(UI_IDS.repoUrlModal) ||
              RepoUrlModal._isShown
            ) {
              resolve();
              return;
            }
            RepoUrlModal._isShown = true;
            const wrapper = document.createElement("div");
            wrapper.id = UI_IDS.repoUrlModal;
            wrapper.innerHTML = `
              <div id="${UI_IDS.repoUrlModalContent}">
                <div id="${UI_IDS.repoUrlModalHeader}">
                  <div><!-- Icon container -->
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-git2-icon lucide-folder-git-2"><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"/><circle cx="13" cy="12" r="2"/><path d="M18 19c-2.8 0-5-2.2-5-5v8"/><circle cx="20" cy="19" r="2"/></svg>
                  </div>
                  <div>Enter Repo URL</div><!-- Title -->
                  <button id="${UI_IDS.repoUrlModalCloseButton}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                </div>
                <div id="${UI_IDS.repoUrlModalDescription}">Enter the URL of the GitHub repository you want to import.</div>
                <div id="${UI_IDS.repoUrlModalInputContainer}">
                  <input id="${UI_IDS.repoUrlModalInput}" type="text" placeholder="https://github.com/username/repo" />
                  <button id="${UI_IDS.repoUrlModalClearButton}" aria-label="Clear input"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>
                </div>
                <button id="${UI_IDS.repoUrlModalSaveButton}">Import</button>
              </div>`;
            document.body.appendChild(wrapper);
            const input = wrapper.querySelector(`#${UI_IDS.repoUrlModalInput}`);
            if (input) {
              input.focus();
              input.value = (state && state.repoUrl) || "";
            }
            RepoUrlModal._attachEventListeners(wrapper);
            resolve();
          })
          .catch((err) => {
            Logger.error("Failed to show repo URL modal:", err);
            resolve();
          });
      });
    },
    _attachEventListeners: (modalElement) => {
      const urlInput = modalElement.querySelector(
        `#${UI_IDS.repoUrlModalInput}`
      );
      const saveButton = modalElement.querySelector(
        `#${UI_IDS.repoUrlModalSaveButton}`
      );
      const closeButton = modalElement.querySelector(
        `#${UI_IDS.repoUrlModalCloseButton}`
      );
      const clearButton = modalElement.querySelector(
        `#${UI_IDS.repoUrlModalClearButton}`
      );

      modalElement.addEventListener("click", (e) => {
        if (e.target === modalElement) {
          const urlInput = modalElement.querySelector(
            `#${UI_IDS.repoUrlModalInput}`
          );
          if (urlInput && !urlInput.value) {
            const importButton = document.getElementById(UI_IDS.importButton);
            if (importButton) {
              importButton.classList.remove(CSS_CLASSES.importButtonOn);
              importButton.setAttribute("aria-label", "Enable import");
              importButton.setAttribute("data-state", "closed");
              importButton.innerHTML = `${githubSVG} Import Repo`;
              importButton.dataset.mode = "off";
            }

            IngestDBManager.deleteState(getChatId());
          }
          RepoUrlModal._isShown = false;
          modalElement.remove();
        }
      });

      const updateClearButtonVisibility = () => {
        if (clearButton) {
          clearButton.style.display = urlInput.value ? "flex" : "none";
        }
      };

      updateClearButtonVisibility();

      if (clearButton) {
        clearButton.addEventListener("click", () => {
          urlInput.value = "";
          urlInput.focus();
          updateClearButtonVisibility();
        });
      }

      urlInput.addEventListener("input", updateClearButtonVisibility);

      const handleSave = () => {
        const url = urlInput.value.trim();
        if (url) {
          if (!RepoUrlModal._isValidRepoUrl(url)) {
            alert("Please enter a valid git repository URL.");
            return;
          }

          RepoUrlModal._isShown = false;
          modalElement.remove();

          const importButton = document.getElementById(UI_IDS.importButton);
          if (importButton) {
            importButton.classList.add(CSS_CLASSES.importButtonLoading);
            importButton.setAttribute("aria-label", "Importing repository...");
            importButton.disabled = true;
          }

          new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
              method: "POST",
              url: apiUrl,
              headers: {
                "Content-Type": "application/json",
              },
              data: JSON.stringify({
                url,
              }),
              onload: (res) => {
                if (res.status < 200 || res.status >= 300) {
                  reject(
                    new Error(`API Error (${res.status}): ${res.responseText}`)
                  );
                  return;
                }
                try {
                  const data = JSON.parse(res.responseText);
                  if (
                    !data ||
                    typeof data !== "object" ||
                    !data.data ||
                    !data.data.content ||
                    !data.data.normalized ||
                    !data.data.tree ||
                    !data.data.index
                  ) {
                    reject(new Error("Invalid response data from API"));
                    return;
                  }

                  IngestDBManager.saveState({
                    chatId: getChatId(),
                    repoUrl: url,
                    repoTree: data.data.tree,
                    repoIndex: data.data.index,
                    repoContent: data.data.content,
                    repoNormalizedContent: data.data.normalized,
                  })
                    .then(() => {
                      if (importButton) {
                        importButton.classList.add(CSS_CLASSES.importButtonOn);
                        importButton.setAttribute(
                          "aria-label",
                          "Disable import"
                        );
                        importButton.setAttribute("data-state", "open");
                        importButton.dataset.mode = "on";
                        importButton.innerHTML = `${githubSVG} ${getRepoNamefromURL(
                          url
                        )
                          .split("/")
                          .pop()
                          .slice(0, 10)
                          .replace(/^./, (c) => c.toUpperCase())}`;
                      }
                      resolve();
                    })
                    .catch((err) => {
                      reject(err);
                    });
                } catch (err) {
                  reject(err);
                }
              },
              onerror: (err) => {
                reject(err);
              },
              ontimeout: () => {
                reject(new Error("Request timed out"));
              },
              timeout: 30000,
            });
          })
            .catch((err) => {
              if (importButton) {
                importButton.classList.remove(CSS_CLASSES.importButtonLoading);
                importButton.classList.remove(CSS_CLASSES.importButtonOn);
                importButton.setAttribute("aria-label", "Enable import");
                importButton.setAttribute("data-state", "closed");
                importButton.innerHTML = `${githubSVG} Import Repo`;
                importButton.dataset.mode = "off";
                importButton.disabled = false;
              }
              Logger.error("Error during repo import:", err);
            })
            .finally(() => {
              if (importButton) {
                importButton.classList.remove(CSS_CLASSES.importButtonLoading);
                importButton.disabled = false;
                if (importButton.dataset.mode === "on") {
                  importButton.setAttribute("aria-label", "Disable import");
                }
              }
            });
        } else {
          alert("Repo URL cannot be empty");
        }
      };

      saveButton.addEventListener("click", handleSave);

      urlInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleSave();
        }
      });

      closeButton.addEventListener("click", () => {
        const urlInput = modalElement.querySelector(
          `#${UI_IDS.repoUrlModalInput}`
        );
        if (urlInput && !urlInput.value) {
          const importButton = document.getElementById(UI_IDS.importButton);
          if (importButton) {
            importButton.classList.remove(CSS_CLASSES.importButtonOn);
            importButton.setAttribute("aria-label", "Enable import");
            importButton.setAttribute("data-state", "closed");
            importButton.innerHTML = `${githubSVG} Import Repo`;
            importButton.dataset.mode = "off";
          }

          IngestDBManager.deleteState(getChatId());
        }
        RepoUrlModal._isShown = false;
        modalElement.remove();
      });
    },
  };

  const getAllFileNames = (index) => {
    Logger.log(
      "getAllFileNames: Processing index with",
      (index && index.length) || 0,
      "files"
    );
    return index.map((file, idx) => ({
      fileName: file.fileName,
      index: idx,
    }));
  };

  const getFileContents = (index, indices) => {
    Logger.log("getFileContents: Requesting contents for indices", indices);
    if (!index || !Array.isArray(indices)) {
      Logger.log("getFileContents: Invalid input", {
        index: !!index,
        indices: !!indices,
      });
      return [];
    }
    const contents = indices
      .map((idx) => {
        const file = index[idx];
        if (file) {
          return {
            fileName: file.fileName,
            content: file.fileContent,
          };
        } else {
          return null;
        }
      })
      .filter(function (item) { return item !== null; });
    Logger.log(
      "getFileContents: Retrieved contents for",
      contents.length,
      "files"
    );
    return contents;
  };

  const getRepoTree = () => {
    return new Promise((resolve) => {
      const chatId = getChatId();
      IngestDBManager.getState(chatId)
        .then((state) => {
          if (!state || !state.repoTree) {
            Logger.log("getRepoTree: No repo tree found in state");
            resolve(null);
            return;
          }
          Logger.log("getRepoTree: Retrieved repo tree");
          resolve(state.repoTree);
        })
        .catch((err) => {
          Logger.error("Failed to get repo tree:", err);
          resolve(null);
        });
    });
  };

  const generateRelevantContext = (query) => {
    return new Promise((resolve) => {
      Logger.log("generateRelevantContext: Processing query", query);
      const chatId = getChatId();
      IngestDBManager.getState(chatId)
        .then((state) => {
          if (!state || !state.repoIndex) {
            Logger.log("generateRelevantContext: No repo index found in state");
            resolve(null);
            return;
          }

          const index = state.repoIndex;
          const fileList = getAllFileNames(index);
          Logger.log(
            "generateRelevantContext: Generated file list with",
            fileList.length,
            "files"
          );

          const prompt = `Given the following list of files in a repository and a user query, return the indices of the most relevant files that would help answer the query. Only return the indices of files that are directly relevant.

Files in repository:
${JSON.stringify(fileList, null, 2)}

User query: ${query}

Return the response in this exact JSON format:
{
  "relevantIndices": [array of indices]
}`;

          return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
              method: "POST",
              url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
              headers: {
                "Content-Type": "application/json",
              },
              data: JSON.stringify({
                contents: [
                  {
                    parts: [{ text: prompt }],
                  },
                ],
                generationConfig: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: "OBJECT",
                    properties: {
                      relevantIndices: {
                        type: "ARRAY",
                        items: { type: "NUMBER" },
                      },
                    },
                    propertyOrdering: ["relevantIndices"],
                  },
                },
              }),
              onload: (response) => {
                if (response.status >= 200 && response.status < 300) {
                  Logger.log(
                    "generateRelevantContext: Gemini API call successful"
                  );
                  resolve(JSON.parse(response.responseText));
                } else {
                  Logger.error(
                    "generateRelevantContext: Gemini API error",
                    response.status
                  );
                  reject(new Error(`Gemini API error: ${response.status}`));
                }
              },
              onerror: (error) => {
                Logger.error(
                  "generateRelevantContext: Gemini API request failed",
                  error
                );
                reject(error);
              },
            });
          });
        })
        .then((response) => {
          if (!response) return null;
          const responseText = response.candidates[0].content.parts[0].text;
          let relevantIndices;
          try {
            relevantIndices = JSON.parse(responseText).relevantIndices;
            Logger.log(
              "generateRelevantContext: Parsed relevant indices",
              relevantIndices
            );
          } catch (e) {
            Logger.error(
              "generateRelevantContext: Failed to parse Gemini API response",
              e
            );
            return null;
          }

          if (!Array.isArray(relevantIndices)) {
            Logger.error(
              "generateRelevantContext: Invalid relevantIndices format",
              relevantIndices
            );
            return null;
          }

          const relevantFiles = getFileContents(index, relevantIndices);
          if (!relevantFiles.length) {
            Logger.log("generateRelevantContext: No relevant files found");
            return null;
          }

          const context = relevantFiles
            .map(
              (file) => `File: ${file.fileName}\nContent:\n${file.content}\n`
            )
            .join("\n");

          Logger.log(
            "generateRelevantContext: Generated context with",
            relevantFiles.length,
            "files"
          );
          resolve(context);
        })
        .catch((error) => {
          Logger.error(
            "generateRelevantContext: Error generating context",
            error
          );
          resolve(null);
        });
    });
  };

  const FetchInterceptor = {
    originalFetch: null,
    isIntercepting: false,
    init: () => {
      try {
        if (typeof unsafeWindow === "undefined") {
          Logger.error("FetchInterceptor: unsafeWindow is not available");
          return;
        }
        const w = unsafeWindow;
        w.t3ChatIngest = w.t3ChatIngest || { needIngest: false };
        const originalFetch = w.fetch;
        FetchInterceptor.originalFetch = originalFetch;

        w.fetch = (input, initOptions = {}) => {
          if (FetchInterceptor.isIntercepting) {
            Logger.log(
              "FetchInterceptor: Already intercepting, passing through"
            );
            return originalFetch.call(w, input, initOptions);
          }

          const url = typeof input === "string" ? input : input.url;
          if (
            !url.includes("/api/chat") ||
            url.includes("/api/chat/resume") ||
            initOptions.method !== "POST"
          ) {
            return originalFetch.call(w, input, initOptions);
          }

          const chatId = getChatId();
          IngestDBManager.getState(chatId)
            .then((state) => {
              if (!state || !state.repoUrl) {
                Logger.log(
                  "FetchInterceptor: No repo URL in state, passing through"
                );
                return originalFetch.call(w, input, initOptions);
              }

              let data;
              try {
                data = JSON.parse(initOptions.body || "{}");
              } catch (error) {
                Logger.error(
                  "FetchInterceptor: Failed to parse request body",
                  error
                );
                return originalFetch.call(w, input, initOptions);
              }

              if (!Array.isArray(data.messages)) {
                Logger.log("FetchInterceptor: No messages array in request");
                return originalFetch.call(w, input, initOptions);
              }

              const messages = data.messages;
              const lastIdx = messages.length - 1;
              if (
                lastIdx < 0 ||
                !messages[lastIdx] ||
                messages[lastIdx].role !== "user"
              ) {
                Logger.log("FetchInterceptor: No user message found");
                return originalFetch.call(w, input, initOptions);
              }
              const originalPrompt = messages[lastIdx].content;

              if (typeof originalPrompt !== "string") {
                Logger.log(
                  "FetchInterceptor: Invalid prompt type",
                  typeof originalPrompt
                );
                return originalFetch.call(w, input, initOptions);
              }

              Logger.log(
                "FetchInterceptor: Intercepting fetch for ingest enhancement"
              );
              FetchInterceptor.isIntercepting = true;

              return Promise.all([
                getRepoTree(),
                generateRelevantContext(originalPrompt),
              ])
                .then(([tree, context]) => {
                  Logger.log("FetchInterceptor: Retrieved repo tree");
                  Logger.log("FetchInterceptor: Generated context", !!context);

                  if (context) {
                    const importInstruction =
                      "The following information was retrieved from the repository. Please use these results to inform your response:\n";
                    messages[
                      lastIdx
                    ].content = `${importInstruction}\n[Repository Tree]\n${tree}\n\n[Repository Context]\n${context}\n\n[Original Message]\n${originalPrompt}`;
                    initOptions.body = JSON.stringify(data);
                    Logger.log(
                      "FetchInterceptor: Enhanced prompt with repository context"
                    );
                  } else {
                    Logger.log("FetchInterceptor: No context to add to prompt");
                  }

                  return originalFetch.call(w, input, initOptions);
                })
                .catch((error) => {
                  Logger.error(
                    "FetchInterceptor: Error during interception",
                    error
                  );
                  return originalFetch.call(w, input, initOptions);
                })
                .finally(() => {
                  FetchInterceptor.isIntercepting = false;
                });
            })
            .catch((error) => {
              Logger.error("FetchInterceptor: Error getting state", error);
              return originalFetch.call(w, input, initOptions);
            });
        };

        Logger.log("FetchInterceptor: Initialized successfully");
      } catch (error) {
        Logger.error("FetchInterceptor: Failed to initialize", error);
      }
    },
  };

  const IngestDBManager = {
    db: null,

    init: () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          Logger.error("Failed to open IndexedDB");
          reject(request.error);
        };

        request.onsuccess = (event) => {
          IngestDBManager.db = event.target.result;
          Logger.log("IndexedDB opened successfully");
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, {
              keyPath: "chatId",
            });
            store.createIndex("repoUrl", "repoUrl", { unique: false });
            Logger.log("IndexedDB store created");
          }
        };
      });
    },

    getAllStates: () => {
      return new Promise((resolve, reject) => {
        const transaction = IngestDBManager.db.transaction(
          [STORE_NAME],
          "readonly"
        );
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    getState: (chatId) => {
      return new Promise((resolve, reject) => {
        if (!chatId) {
          resolve(null);
          return;
        }

        const transaction = IngestDBManager.db.transaction(
          [STORE_NAME],
          "readonly"
        );
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(chatId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    saveState: (state) => {
      return new Promise((resolve, reject) => {
        const transaction = IngestDBManager.db.transaction(
          [STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(state);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    deleteState: (chatId) => {
      return new Promise((resolve, reject) => {
        const transaction = IngestDBManager.db.transaction(
          [STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(chatId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    clearAll: () => {
      return new Promise((resolve, reject) => {
        const transaction = IngestDBManager.db.transaction(
          [STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
  };

  const MenuCommands = {
    init: () => {
      return new Promise((resolve) => {
        GM_registerMenuCommand("Toggle debug logs", () => {
          GM_getValue(GM_STORAGE_KEYS.DEBUG, false)
            .then((currentDebug) => {
              const newDebug = !currentDebug;
              return GM_setValue(GM_STORAGE_KEYS.DEBUG, newDebug);
            })
            .then(() => {
              debugMode = !debugMode;
              Logger.log(
                `Debug mode toggled to: ${debugMode} via menu. Reloading...`
              );
              location.reload();
            })
            .catch((err) => {
              Logger.error("Failed to toggle debug mode:", err);
            });
        });

        GM_registerMenuCommand("Reset Gemini API Key", () => {
          GM_setValue(GM_STORAGE_KEYS.GEMINI_API_KEY, "")
            .then(() => {
              geminiApiKey = null;
              Logger.log("Gemini API Key reset via menu.");
              location.reload();
            })
            .catch((err) => {
              Logger.error("Failed to reset Gemini API key:", err);
            });
        });

        GM_registerMenuCommand("Reset RepoGist API URL", () => {
          GM_setValue(GM_STORAGE_KEYS.API_URL, "")
            .then(() => {
              apiUrl = null;
              Logger.log("RepoGist API URL reset via menu.");
              location.reload();
            })
            .catch((err) => {
              Logger.error("Failed to reset RepoGist API URL:", err);
            });
        });

        GM_registerMenuCommand("Reset IndexedDB for all chats", () => {
          IngestDBManager.clearAll()
            .then(() => {
              Logger.log("IndexedDB reset via menu.");
              location.reload();
            })
            .catch((err) => {
              Logger.error("Failed to reset IndexedDB:", err);
            });
        });

        Logger.log("Menu commands registered.");
        resolve();
      });
    },
  };

  function main() {
    try {
      debugMode = GM_getValue(GM_STORAGE_KEYS.DEBUG, false);
      Logger.log(
        `${SCRIPT_NAME} v${SCRIPT_VERSION} starting. Debug mode: ${debugMode}`
      );

      FetchInterceptor.init();
      MenuCommands.init().catch((err) => {
        Logger.error("Failed to initialize menu commands:", err);
      });
      IngestDBManager.init().catch((err) => {
        Logger.error("Failed to initialize database:", err);
      });
      StyleManager.injectGlobalStyles();

      GM_getValue(GM_STORAGE_KEYS.API_URL)
        .then((url) => {
          apiUrl = url;
          return GM_getValue(GM_STORAGE_KEYS.GEMINI_API_KEY);
        })
        .then((key) => {
          geminiApiKey = key;
          if (!apiUrl || !geminiApiKey) {
            Logger.log(
              "RepoGist API URL or Gemini API Key not found. It will be requested upon first import attempt."
            );
          } else {
            Logger.log("RepoGist API URL and Gemini API Key loaded.");
          }
        })
        .catch((err) => {
          Logger.error("Failed to load API configuration:", err);
        });

      let lastChatId = getChatId();
      const urlObserver = new MutationObserver(() => {
        const currentChatId = getChatId();
        if (currentChatId !== lastChatId) {
          lastChatId = currentChatId;
          injectButtonWithRetry().catch((err) => {
            Logger.error("Failed to inject button:", err);
          });
          IngestDBManager.getState(currentChatId)
            .then((state) => {
              const importButton = document.getElementById(UI_IDS.importButton);
              if (importButton) {
                if (state && state.repoUrl) {
                  importButton.innerHTML = `${githubSVG} ${getRepoNamefromURL(
                    state.repoUrl
                  )
                    .split("/")
                    .pop()
                    .slice(0, 10)
                    .replace(/^./, (c) => c.toUpperCase())}`;
                  importButton.classList.add(CSS_CLASSES.importButtonOn);
                  importButton.setAttribute("aria-label", "Disable import");
                  importButton.setAttribute("data-state", "open");
                  importButton.dataset.mode = "on";
                } else {
                  importButton.innerHTML = `${githubSVG} Import Repo`;
                  importButton.classList.remove(CSS_CLASSES.importButtonOn);
                  importButton.setAttribute("aria-label", "Enable import");
                  importButton.setAttribute("data-state", "closed");
                  importButton.dataset.mode = "off";
                }
              }
            })
            .catch((err) => {
              Logger.error("Failed to update button state:", err);
            });
        }
      });

      urlObserver.observe(document.querySelector("title"), {
        subtree: true,
        characterData: true,
        childList: true,
      });

      const injectButtonWithRetry = (maxRetries = 5, delay = 1000) => {
        let retries = 0;

        const tryInjection = () => {
          const injectionObserverTargetParent = document.querySelector(
            selectors.messageActions
          );

          if (injectionObserverTargetParent) {
            UIManager.injectImportButton()
              .then((success) => {
                if (success) {
                  Logger.log("Successfully injected import button");
                  return true;
                }
              })
              .catch((err) => {
                Logger.error("Failed to inject button:", err);
              });
          }

          if (retries < maxRetries) {
            retries++;
            Logger.log(
              `Retrying button injection (${retries}/${maxRetries})...`
            );
            setTimeout(() => tryInjection(), delay);
            return false;
          }

          return false;
        };

        return tryInjection();
      };

      injectButtonWithRetry()
        .then((success) => {
          if (!success) {
            Logger.log("Initial button injection failed, setting up observers");

            const injectionObserver = new MutationObserver(() => {
              UIManager.injectImportButton()
                .then((success) => {
                  if (success) {
                    Logger.log("Button injected via mutation observer");
                  }
                })
                .catch((err) => {
                  Logger.error("Failed to inject button:", err);
                });
            });

            const documentObserver = new MutationObserver(() => {
              const target = document.querySelector(selectors.messageActions);
              if (target) {
                injectButtonWithRetry()
                  .then((success) => {
                    if (success) {
                      Logger.log("Button injected via document observer");
                    }
                  })
                  .catch((err) => {
                    Logger.error("Failed to inject button:", err);
                  });
              }
            });

            const messageActionsContainer = document.querySelector(
              selectors.messageActions
            );
            if (messageActionsContainer) {
              injectionObserver.observe(messageActionsContainer, {
                childList: true,
                subtree: true,
              });
            }

            documentObserver.observe(document.body, {
              childList: true,
              subtree: true,
            });
          }
        })
        .catch((err) => {
          Logger.error("Failed to initialize button injection:", err);
        });

      Logger.log(`${SCRIPT_NAME} v${SCRIPT_VERSION} initialized!`);
    } catch (error) {
      Logger.error("Failed to initialize:", error);
    }
  }

  main();
})();
