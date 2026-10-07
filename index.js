"use strict";

const axios = require("axios");

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

const LEVEL_META = {
  DEFAULT: {
    icon: "⚪",
    label: "DEFAULT",
  },
  SUCCESS: {
    icon: "🟢",
    label: "SUCCESS",
  },
  INFO: {
    icon: "🔵",
    label: "INFO",
  },
  WARN: {
    icon: "🟠",
    label: "WARN",
  },
  ERROR: {
    icon: "🔴",
    label: "ERROR",
  },
};

const WEBHOOK_ENV_NAMES = [
  "SLACK_WEBHOOK_URL",
  "NEXT_PUBLIC_SLACK_WEBHOOK_URL",
  "PUBLIC_SLACK_SLACK_WEBHOOK_URL",
];

const MISSING_WEBHOOK_MESSAGE =
  "🚨 Slack webhook URL is missing. Set one of these env vars: NEXT_PUBLIC_SLACK_WEBHOOK_URL or PUBLIC_SLACK_SLACK_WEBHOOK_URL or SLACK_WEBHOOK_URL. 🚨";

function isBrowserEnvironment() {
  return typeof window !== "undefined";
}

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

function getWebhookUrl() {
  for (const name of WEBHOOK_ENV_NAMES) {
    const value = getEnvValue(name);

    if (value) {
      return value;
    }
  }

  return undefined;
}

function isValidSlackWebhookUrl() {
  const webhookUrl = getWebhookUrl();
  return Boolean(webhookUrl && webhookUrl.startsWith("https://"));
}

function isSlackLogsEnabled() {
  return (getEnvValue("ENABLE_SLACK_LOGS") ?? "true").toString() !== "false";
}

function normalizeLogLevel(errorType) {
  return LogLevel[errorType] ? errorType : LogLevel.DEFAULT;
}

function getLevelMeta(errorType = LogLevel.DEFAULT) {
  const normalizedType = normalizeLogLevel(errorType);

  return {
    type: normalizedType,
    color: LogColor[normalizedType],
    ...LEVEL_META[normalizedType],
  };
}

function formatValue(value) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatCodeBlock(value) {
  return "```" + formatValue(value) + "```";
}

function buildSlackSendError(error) {
  const status = error?.response?.status;
  const responseData = error?.response?.data;
  const details =
    typeof responseData === "string"
      ? responseData
      : responseData && typeof responseData === "object"
        ? JSON.stringify(responseData)
        : error?.message;
  const message = details
    ? `🚨 Error sending log message to Slack: ${details}`
    : "🚨 Error sending log message to Slack: Webhook URL might be updated!";
  const slackError = new Error(message);

  slackError.statusCode = status || 500;
  return slackError;
}

function buildContextElements(errorType) {
  const meta = getLevelMeta(errorType);

  return [
    {
      type: "mrkdwn",
      text: `*Level:* ${meta.icon} ${meta.label}`,
    },
    {
      type: "mrkdwn",
      text: `*Time:* ${new Date().toISOString()}`,
    },
  ];
}

function buildLogPayload(label, data, errorType = LogLevel.DEFAULT) {
  const meta = getLevelMeta(errorType);

  return {
    text: `${meta.label} | ${label}`,
    attachments: [
      {
        color: meta.color,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${meta.label}*`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${label}*`,
            },
          },
          {
            type: "context",
            elements: buildContextElements(errorType),
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: formatCodeBlock(data),
            },
          },
        ],
      },
    ],
  };
}

function buildBlockPayload(label, objectData, errorType = LogLevel.DEFAULT) {
  const meta = getLevelMeta(errorType);
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${meta.label}*`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${label}*`,
      },
    },
    {
      type: "context",
      elements: buildContextElements(errorType),
    },
    {
      type: "divider",
    },
  ];
  const sections = [];

  objectData?.forEach((item) => {
    sections.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${item.title}:* ${JSON.stringify(item.value)}`,
      },
    });
  });

  return {
    text: `${meta.label} | ${label}`,
    blocks,
    attachments: [
      {
        color: meta.color,
        blocks: sections,
      },
    ],
  };
}

async function sendSlackMessage(payload) {
  if (!isSlackLogsEnabled()) {
    return false;
  }

  const webhookUrl = getWebhookUrl();

  try {
    await axios.post(webhookUrl, JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return true;
  } catch (error) {
    const slackError = buildSlackSendError(error);
    console.error(slackError.message);
    throw slackError;
  }
}

async function sendProxyRequest(body) {
  const fetchImpl = globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    console.error("🚨 fetch is not available for Slack Logs proxy request! 🚨");
    return null;
  }

  return fetchImpl(getProxyUrl(), {
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

async function handleSlackLogsRequest(body) {
  try {
    if (!body || typeof body !== "object") {
      return {
        success: false,
        status: 400,
        message: "Invalid request body.",
      };
    }

    if (
      body.type !== "log" &&
      body.type !== "logBlockMessage" &&
      body.type !== "raw"
    ) {
      return {
        success: false,
        status: 400,
        message: "Invalid log type.",
      };
    }

    if (!isValidSlackWebhookUrl()) {
      return {
        success: false,
        status: 500,
        message: MISSING_WEBHOOK_MESSAGE,
      };
    }

    if (body.type === "log") {
      await sendSlackMessage(
        buildLogPayload(body.label, body.data, body.errorType),
      );
      return {
        success: true,
        status: 200,
      };
    }

    if (body.type === "logBlockMessage") {
      await sendSlackMessage(
        buildBlockPayload(body.label, body.objectData, body.errorType),
      );
      return {
        success: true,
        status: 200,
      };
    }

    if (body.type === "raw") {
      await sendSlackMessage(body.payload);
      return {
        success: true,
        status: 200,
      };
    }
  } catch (error) {
    return {
      success: false,
      status: error.statusCode || 500,
      message: error.message,
    };
  }
}

const slack = {
  async log(label, data, errorType = LogLevel.DEFAULT) {
    if (isBrowserEnvironment()) {
      return sendProxyRequest({
        type: "log",
        label,
        data,
        errorType,
      });
    }

    if (!isValidSlackWebhookUrl()) {
      console.error(MISSING_WEBHOOK_MESSAGE);
      return null;
    }

    await sendSlackMessage(buildLogPayload(label, data, errorType));
  },

  async logBlockMessage(label, objectData, errorType = LogLevel.DEFAULT) {
    if (isBrowserEnvironment()) {
      return sendProxyRequest({
        type: "logBlockMessage",
        label,
        objectData,
        errorType,
      });
    }

    if (!isValidSlackWebhookUrl()) {
      console.error(MISSING_WEBHOOK_MESSAGE);
      return null;
    }

    await sendSlackMessage(buildBlockPayload(label, objectData, errorType));
  },

  async raw(payload) {
    if (isBrowserEnvironment()) {
      return sendProxyRequest({
        type: "raw",
        payload,
      });
    }

    if (!isValidSlackWebhookUrl()) {
      console.error(MISSING_WEBHOOK_MESSAGE);
      return null;
    }

    await sendSlackMessage(payload);
  },
};

module.exports = {
  DEFAULT_PROXY_URL,
  LogLevel,
  LogColor,
  handleSlackLogsRequest,
  slack,
};
