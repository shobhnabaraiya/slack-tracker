"use strict";

const DEFAULT_PROXY_URL = "/api/slack-tracker";

const LogLevel = {
  DEFAULT: "DEFAULT",
  SUCCESS: "SUCCESS",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
};

const LogColor = {
  DEFAULT: "#B4B4B8",
  SUCCESS: "#65B741",
  INFO: "#40A2D8",
  WARN: "#E3651D",
  ERROR: "#FF0000",
};

const MISSING_CONFIG_MESSAGE =
  "🚨 Slack logs are not configured. Call slackLogConfig({ webhookUrl, enable, proxy_url }) once before using slack logs. 🚨";

let slackConfig = null;

function slackLogConfig(config = {}) {
  slackConfig = {
    webhookUrl: config.webhookUrl || config.weebhookUrl,
    enable: config.enable !== false,
    proxy_url: config.proxy_url,
  };

  return slackConfig;
}

function getProxyUrl() {
  return slackConfig?.proxy_url || DEFAULT_PROXY_URL;
}

function hasSlackConfig() {
  if (slackConfig) {
    return true;
  }

  console.error(MISSING_CONFIG_MESSAGE);
  return false;
}

async function sendProxyRequest(body) {
  if (!hasSlackConfig()) {
    return null;
  }

  if (slackConfig.enable === false) {
    return false;
  }

  return fetch(getProxyUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    console.error("🚨 Error sending log message to proxy route! 🚨");
    return null;
  });
}

async function handleSlackLogsRequest() {
  return {
    success: false,
    status: 400,
    message: "Browser build cannot process server-side Slack logs directly.",
  };
}

const slack = {
  async log(label, data, errorType = LogLevel.DEFAULT) {
    return sendProxyRequest({
      type: "log",
      label,
      data,
      errorType,
    });
  },

  async logBlockMessage(label, objectData, errorType = LogLevel.DEFAULT) {
    return sendProxyRequest({
      type: "logBlockMessage",
      label,
      objectData,
      errorType,
    });
  },

  async raw(payload) {
    return sendProxyRequest({
      type: "raw",
      payload,
    });
  },
};

module.exports = {
  DEFAULT_PROXY_URL,
  LogLevel,
  LogColor,
  handleSlackLogsRequest,
  slackLogConfig,
  slack,
};
