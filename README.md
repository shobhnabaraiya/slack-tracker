# slack-tracker

Slack logging package for client and server applications using Slack Incoming Webhooks.

### Live DEMO:

- NodeJs + HTML - [Stackblitz DEMO](https://stackblitz.com/edit/stackblitz-starters-httppkmt?file=public%2Fapp.js)

## Installation

```bash
npm install slack-tracker
```

```bash
yarn add slack-tracker
```

## Configuration

Set your Slack webhook URL in `.env`:

```env
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/******/******/********************"
# or
NEXT_PUBLIC_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/******/******/********************"
# or
PUBLIC_SLACK_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/******/******/********************"

ENABLE_SLACK_LOGS=true
NEXT_PUBLIC_SLACK_LOGS_PROXY_URL="/api/slack-tracker"
```

Prefer `SLACK_WEBHOOK_URL`.

## Client and server behavior

Server calls send to Slack directly.

Client calls post to your backend proxy route, default: `/api/slack-tracker`.

## Usage

```ts
import { LogLevel, slack } from "slack-tracker";
// or
const { LogLevel, slack } = require("slack-tracker");

slack.log("Data", [{ title: "1yes!" }]);
slack.log("Data", { title: "2yes!" });
slack.log("Data", "Hello world!");
slack.log("Server started", { port: 3000 }, LogLevel.SUCCESS);
slack.log("Validation warning", { field: "email" }, LogLevel.WARN);
slack.log("Unhandled error", { message: "Something failed" }, LogLevel.ERROR);
```

```ts
import { LogLevel, slack } from "slack-tracker";

const payload = [
  { title: "Title 1", value: "1234" },
  { title: "Title 2", value: 123 },
  { title: "Title 3", value: { id: 12 } },
  { title: "Title 4", value: [{ id: 12 }] },
];

slack.logBlockMessage("Validation Message!", payload);
slack.logBlockMessage("Validation Message!", payload, LogLevel.DEFAULT);
slack.logBlockMessage("Validation Message!", payload, LogLevel.ERROR);
slack.logBlockMessage("Validation Message!", payload, LogLevel.INFO);
slack.logBlockMessage("Validation Message!", payload, LogLevel.SUCCESS);
slack.logBlockMessage("Validation Message!", payload, LogLevel.WARN);

slack.raw({
  text: "Raw Slack payload",
  attachments: [
    {
      color: "#7A3EF0",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Custom raw payload*",
          },
        },
      ],
    },
  ],
});
```

## `slack.raw()` button example

![slack.raw button preview](./assets/slack-raw-button-preview.svg)

```ts
slack.raw({
  text: "One does not simply walk into Slack and click a button.",
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*One does not simply walk into Slack and click a button.*",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "At least that's what my friend *Slackomir* said. :crossed_swords:",
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
            text: "Sure One Does",
            emoji: true,
          },
          style: "danger",
          value: "sure_one_does",
          action_id: "sure_one_does",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "One Does Not",
            emoji: true,
          },
          style: "primary",
          value: "one_does_not",
          action_id: "one_does_not",
        },
      ],
    },
  ],
});
```

If you want button clicks to do something, enable Slack app interactivity and handle the `block_actions` payload for each `action_id`.

## Message style

Each level uses a different color and badge:

- `LogLevel.SUCCESS`
- `LogLevel.INFO`
- `LogLevel.WARN`
- `LogLevel.ERROR`
- `LogLevel.DEFAULT`

## Exports

- `DEFAULT_PROXY_URL`
- `handleSlackLogsRequest`
- `slack`
- `LogLevel`
- `LogColor`

`slack.raw(payload)` sends your payload body as-is.

## Proxy route example

```ts
import { handleSlackLogsRequest } from "slack-tracker";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await handleSlackLogsRequest(body);

  return Response.json(
    { success: result.success, message: result.message },
    { status: result.status },
  );
}
```

## Demo project

```bash
cd demo
npm start
```

Open `http://localhost:3030`.

You can paste a webhook URL in the demo UI and click `Save`, or leave it blank to use `demo/.env`.
