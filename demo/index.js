"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { slack, LogLevel, handleSlackLogsRequest } = require("slack-tracker");

const PORT = Number(process.env.PORT || 3030);
const PUBLIC_DIR = path.join(__dirname, "public");
const demoConfig = {
  webhookUrl: normalizeWebhookUrl(process.env.SLACK_WEBHOOK_URL),
};

const STATIC_FILES = {
  "/": {
    file: "index.html",
    type: "text/html; charset=utf-8",
  },
  "/app.js": {
    file: "app.js",
    type: "text/javascript; charset=utf-8",
  },
  "/styles.css": {
    file: "styles.css",
    type: "text/css; charset=utf-8",
  },
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, pathname) {
  const target = STATIC_FILES[pathname];

  if (!target) {
    sendJson(res, 404, { success: false, message: "Not found." });
    return;
  }

  const filePath = path.join(PUBLIC_DIR, target.file);
  const content = fs.readFileSync(filePath);

  res.writeHead(200, {
    "Content-Type": target.type,
  });
  res.end(content);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeWebhookUrl(webhookUrl) {
  if (typeof webhookUrl !== "string") {
    return undefined;
  }

  const value = webhookUrl.trim();

  return value || undefined;
}

async function withWebhookUrlOverride(webhookUrl, action) {
  const previousWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  const nextWebhookUrl =
    normalizeWebhookUrl(webhookUrl) || demoConfig.webhookUrl;

  if (nextWebhookUrl) {
    process.env.SLACK_WEBHOOK_URL = nextWebhookUrl;
  }

  try {
    return await action();
  } finally {
    if (nextWebhookUrl) {
      if (previousWebhookUrl) {
        process.env.SLACK_WEBHOOK_URL = previousWebhookUrl;
      } else {
        delete process.env.SLACK_WEBHOOK_URL;
      }
    }
  }
}

async function sendLogDefault() {
  await slack.log("Demo Data Log", {
    source: "demo-server",
    package: "slack-tracker",
    items: ["alpha", "beta", "gamma"],
  });
}

async function sendLogSuccess() {
  await slack.log(
    "Build Completed",
    {
      app: "slack-tracker-demo",
      branch: "main",
      duration: "12s",
    },
    LogLevel.SUCCESS,
  );
}

async function sendLogWarn() {
  await slack.log(
    "Validation Warning",
    {
      field: "email",
      message: "Value format looks suspicious",
      source: "signup-form",
    },
    LogLevel.WARN,
  );
}

async function sendLogError() {
  await slack.log(
    "Unhandled Error",
    {
      code: "DEMO_500",
      message: "Something failed while processing the request",
      traceId: "demo-trace-001",
    },
    LogLevel.ERROR,
  );
}

async function sendBlockInfo() {
  await slack.logBlockMessage(
    "Deployment Summary",
    [
      { title: "Service", value: "slack-tracker demo" },
      { title: "Environment", value: "local" },
      { title: "Version", value: "1.12.0" },
      { title: "Status", value: "Ready for manual QA" },
    ],
    LogLevel.INFO,
  );
}

async function sendRawButton() {
  await slack.raw({
    text: "One does not simply walk into Slack and click a button.",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n\n *Please select a restaurant:*",
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Farmhouse Thai Cuisine*\n:star::star::star::star: 1528 reviews\n They do have some vegan options, like the roti and curry, plus they have a ton of salad stuff and noodles can be ordered without meat!! They have something for everyone here",
        },
        accessory: {
          type: "image",
          image_url:
            "https://s3-media3.fl.yelpcdn.com/bphoto/c7ed05m9lC2EmA3Aruue7A/o.jpg",
          alt_text: "alt text for image",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Kin Khao*\n:star::star::star::star: 1638 reviews\n The sticky rice also goes wonderfully with the caramelized pork belly, which is absolutely melt-in-your-mouth and so soft.",
        },
        accessory: {
          type: "image",
          image_url:
            "https://s3-media2.fl.yelpcdn.com/bphoto/korel-1YjNtFtJlMTaC26A/o.jpg",
          alt_text: "alt text for image",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Ler Ros*\n:star::star::star::star: 2082 reviews\n I would really recommend the  Yum Koh Moo Yang - Spicy lime dressing and roasted quick marinated pork shoulder, basil leaves, chili & rice powder.",
        },
        accessory: {
          type: "image",
          image_url:
            "https://s3-media2.fl.yelpcdn.com/bphoto/DawwNigKJ2ckPeDeDM7jAg/o.jpg",
          alt_text: "alt text for image",
        },
      },
      {
        type: "divider",
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Farmhouse",
              emoji: true,
            },
            value: "click_me_123",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Kin Khao",
              emoji: true,
            },
            value: "click_me_123",
            url: "https://google.com",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Ler Ros",
              emoji: true,
            },
            value: "click_me_123",
            url: "https://google.com",
          },
        ],
      },
    ],
  });
}

async function runServerDemo(kind) {
  switch (kind) {
    case "log-default":
      await sendLogDefault();
      return "Sent default log message.";
    case "log-success":
      await sendLogSuccess();
      return "Sent success log message.";
    case "log-warn":
      await sendLogWarn();
      return "Sent warning log message.";
    case "log-error":
      await sendLogError();
      return "Sent error log message.";
    case "block-info":
      await sendBlockInfo();
      return "Sent block message.";
    case "raw-button":
      await sendRawButton();
      return "Sent raw button message.";
    case "all":
      await sendLogDefault();
      await wait(300);
      await sendLogSuccess();
      await wait(300);
      await sendLogWarn();
      await wait(300);
      await sendLogError();
      await wait(300);
      await sendBlockInfo();
      await wait(300);
      await sendRawButton();
      return "Sent all demo messages.";
    default:
      throw new Error("Unknown demo type.");
  }
}

async function handleDemoRequest(req, res) {
  try {
    const body = await readBody(req);
    const message = await withWebhookUrlOverride(body.webhookUrl, () =>
      runServerDemo(body.kind),
    );

    sendJson(res, 200, {
      success: true,
      message,
      webhookUrl:
        normalizeWebhookUrl(body.webhookUrl) || demoConfig.webhookUrl || null,
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      success: false,
      message: error.message || "Demo request failed.",
    });
  }
}

async function handleProxyRequest(req, res) {
  try {
    const body = await readBody(req);
    const result = await withWebhookUrlOverride(body.webhookUrl, () =>
      handleSlackLogsRequest(body),
    );

    sendJson(res, result.status, {
      success: result.success,
      message: result.message || "Proxy request processed.",
      webhookUrl:
        normalizeWebhookUrl(body.webhookUrl) || demoConfig.webhookUrl || null,
    });
  } catch (error) {
    sendJson(res, 400, {
      success: false,
      message: error.message || "Invalid proxy request.",
    });
  }
}

async function handleConfigGet(_req, res) {
  sendJson(res, 200, {
    success: true,
    webhookUrl: demoConfig.webhookUrl || "",
  });
}

async function handleConfigPost(req, res) {
  try {
    const body = await readBody(req);

    demoConfig.webhookUrl = normalizeWebhookUrl(body.webhookUrl);

    sendJson(res, 200, {
      success: true,
      webhookUrl: demoConfig.webhookUrl || "",
      message: demoConfig.webhookUrl
        ? "Webhook URL saved for this demo server."
        : "Webhook URL override cleared. Demo will use demo/.env.",
    });
  } catch (error) {
    sendJson(res, 400, {
      success: false,
      message: error.message || "Invalid config request.",
    });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/config") {
    await handleConfigGet(req, res);
    return;
  }

  if (req.method === "GET") {
    sendFile(res, url.pathname);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/demo") {
    await handleDemoRequest(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/slack-tracker") {
    await handleProxyRequest(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/config") {
    await handleConfigPost(req, res);
    return;
  }

  sendJson(res, 404, {
    success: false,
    message: "Not found.",
  });
});

server.listen(PORT, () => {
  console.log(`Demo running at http://localhost:${PORT}`);
});
