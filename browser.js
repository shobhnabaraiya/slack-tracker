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

function getEnvValue(name) {
  if (typeof process === "undefined" || !process.env) {
    return undefined;
  }

  return process.env[name];
}

function getProxyUrl() {
  return (
    globalThis.SLACK_LOGS_PROXY_URL ||
    getEnvValue("NEXT_PUBLIC_SLACK_LOGS_PROXY_URL") ||
    getEnvValue("PUBLIC_SLACK_LOGS_PROXY_URL") ||
    getEnvValue("SLACK_LOGS_PROXY_URL") ||
    DEFAULT_PROXY_URL
  );
}

async function sendProxyRequest(body) {
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
  slack,
};
