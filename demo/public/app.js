"use strict";

const statusEl = document.getElementById("status");
const webhookUrlEl = document.getElementById("webhookUrl");
const saveWebhookEl = document.getElementById("saveWebhook");
const clearWebhookEl = document.getElementById("clearWebhook");
const STORAGE_KEY = "slack_logs_pro_demo_webhook_url";

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.dataset.type = type || "idle";
}

function getWebhookUrl() {
  return webhookUrlEl.value.trim();
}

function loadWebhookUrl() {
  const savedWebhookUrl = localStorage.getItem(STORAGE_KEY);

  if (savedWebhookUrl) {
    webhookUrlEl.value = savedWebhookUrl;
  }
}

function persistWebhookUrl() {
  const webhookUrl = getWebhookUrl();

  if (webhookUrl) {
    localStorage.setItem(STORAGE_KEY, webhookUrl);
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

async function loadServerConfig() {
  const response = await fetch("/api/config");
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to load demo config.");
  }

  if (result.webhookUrl) {
    webhookUrlEl.value = result.webhookUrl;
    persistWebhookUrl();
    return;
  }

  loadWebhookUrl();
}

async function saveWebhookUrl() {
  const response = await fetch("/api/config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhookUrl: getWebhookUrl(),
    }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to save webhook URL.");
  }

  webhookUrlEl.value = result.webhookUrl || "";
  persistWebhookUrl();
  setStatus(result.message, "success");
}

async function sendServerDemo(kind) {
  setStatus(`Sending ${kind}...`, "loading");

  const response = await fetch("/api/demo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind,
      webhookUrl: getWebhookUrl(),
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Request failed.");
  }

  setStatus(result.message, "success");
}

async function sendProxyDemo() {
  setStatus("Sending client proxy raw payload...", "loading");

  const response = await fetch("/api/slack-tracker", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "raw",
      webhookUrl: getWebhookUrl(),
      payload: {
        text: "Client-side proxy demo",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Client proxy demo*",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "This payload went through the browser and then the internal proxy route.",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Proxy Worked",
                  emoji: true,
                },
                style: "primary",
                value: "proxy_worked",
                action_id: "proxy_worked",
              },
            ],
          },
        ],
      },
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Proxy request failed.");
  }

  setStatus(result.message, "success");
}

document.querySelectorAll("[data-demo]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await sendServerDemo(button.dataset.demo);
    } catch (error) {
      setStatus(error.message, "error");
    }
  });
});

loadServerConfig().catch((error) => {
  loadWebhookUrl();
  setStatus(error.message, "error");
});

webhookUrlEl.addEventListener("input", persistWebhookUrl);

saveWebhookEl.addEventListener("click", async () => {
  try {
    await saveWebhookUrl();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

clearWebhookEl.addEventListener("click", async () => {
  webhookUrlEl.value = "";

  try {
    await saveWebhookUrl();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.getElementById("proxyButton").addEventListener("click", async () => {
  try {
    await sendProxyDemo();
  } catch (error) {
    setStatus(error.message, "error");
  }
});
