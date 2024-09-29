import axios from 'axios';


const SLACK_WEBHOOK_URL: string = process?.env?.SLACK_WEBHOOK_URL || '';

function isValidSlackWebhookUrl(): boolean {
  return SLACK_WEBHOOK_URL.startsWith('https://');
}

async function sendToSlack(message: string): Promise<void> {
  try {
    await axios.post(SLACK_WEBHOOK_URL, {
      text: message,
    });
  } catch (error) {
    console.error('Failed to send log to Slack:', error);
  }
}

interface SlackLogger {
  log(param1: any, param2?: any): Promise<void>;
  error(param1: any, param2?: any): Promise<void>;
  warn(param1: any, param2?: any): Promise<void>;
  info(param1: any, param2?: any): Promise<void>;
}

const slack: SlackLogger = {
  async log(param1, param2) {
    if (!isValidSlackWebhookUrl()) {
      console.error("🚨 Invalid Slack webhook URL. Please check 'SLACK_WEBHOOK_URL' in your environment variables! 🚨");
      return;
    }

    const logMessage = param1 && param2
      ? `*${param1}* \n${typeof param2 === 'object' ? JSON.stringify(param2) : param2}`
      : `${typeof param1 === 'object' ? JSON.stringify(param1) : param1}`;

    await sendToSlack(logMessage);
  },

  async error(param1, param2) {
    if (!isValidSlackWebhookUrl()) {
      console.error("🚨 Invalid Slack webhook URL. Please check 'SLACK_WEBHOOK_URL' in your environment variables! 🚨");
      return;
    }

    const logMessage = param1 && param2
      ? `🚨 ERROR 🚨\n*${param1}* \n${typeof param2 === 'object' ? JSON.stringify(param2) : param2}`
      : `🚨 ERROR 🚨\n${typeof param1 === 'object' ? JSON.stringify(param1) : param1}`;

    await sendToSlack(logMessage);
  },

  async warn(param1, param2) {
    if (!isValidSlackWebhookUrl()) {
      console.error("🚨 Invalid Slack webhook URL. Please check 'SLACK_WEBHOOK_URL' in your environment variables! 🚨");
      return;
    }

    const logMessage = param1 && param2
      ? `⚠ WARNING ⚠\n*${param1}* \n${typeof param2 === 'object' ? JSON.stringify(param2) : param2}`
      : `⚠ WARNING ⚠\n${typeof param1 === 'object' ? JSON.stringify(param1) : param1}`;

    await sendToSlack(logMessage);
  },

  async info(param1, param2) {
    if (!isValidSlackWebhookUrl()) {
      console.error("🚨 Invalid Slack webhook URL. Please check 'SLACK_WEBHOOK_URL' in your environment variables! 🚨");
      return;
    }

    const logMessage = param1 && param2
      ? `ℹ INFO ℹ\n*${param1}* \n${typeof param2 === 'object' ? JSON.stringify(param2) : param2}`
      : `ℹ INFO ℹ\n${typeof param1 === 'object' ? JSON.stringify(param1) : param1}`;

    await sendToSlack(logMessage);
  },
};

export default slack;
