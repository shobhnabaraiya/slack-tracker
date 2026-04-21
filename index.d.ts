interface Slack {
  log(label: string, data: any, errorType?: LogLevel): Promise<any>;
  logBlockMessage(
    label: string,
    objectData: BlocksInterface[],
    errorType?: LogLevel,
  ): Promise<any>;
  raw(payload: any): Promise<any>;
}

export interface BlocksInterface {
  title: string;
  value: any;
}

export declare enum LogLevel {
  DEFAULT = "DEFAULT",
  SUCCESS = "SUCCESS",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export declare enum LogColor {
  DEFAULT = "#B4B4B8",
  SUCCESS = "#65B741",
  INFO = "#40A2D8",
  WARN = "#E3651D",
  ERROR = "#FF0000",
}

export interface SlackLogsProxyRequest {
  type: "log" | "logBlockMessage" | "raw";
  label?: string;
  data?: any;
  objectData?: BlocksInterface[];
  errorType?: LogLevel;
  payload?: any;
}

export interface SlackLogsProxyResponse {
  success: boolean;
  status: number;
  message?: string;
}

export interface SlackLogConfig {
  webhookUrl?: string;
  weebhookUrl?: string;
  enable?: boolean;
  proxy_url?: string;
}

export declare const DEFAULT_PROXY_URL = "/api/slack-tracker";
export declare function slackLogConfig(config: SlackLogConfig): SlackLogConfig;
export declare function handleSlackLogsRequest(
  body: SlackLogsProxyRequest,
): Promise<SlackLogsProxyResponse>;
export declare const slack: Slack;
