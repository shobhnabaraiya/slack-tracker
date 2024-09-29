# Slack Log NPM Package

This package allows you to send logs to a Slack channel through a webhook URL, enabling simple logging with different data types.

## Installation

To use this package, first install it via npm:

```bash
npm install slack-tracker
```

Ensure you have a .env file set up to store your Slack webhook URL.

## Environment Setup

Make sure to add your Slack Webhook URL in the .env file:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
```

## Example Usage

### Importing and Configuration

You need to require the package in your code and configure it using dotenv.

```
import slack from "slack-tracker";
or
const slack = require('slack-tracker');

```

### Basic Usage

The `slack.log()` function works similarly to `console.log()`. It sends the provided data to a Slack channel.

#### Logging a Simple String

```
slack.log('TestLog', { message: 'Hello, this is a test log!' });
```

#### Logging Various Data Types

You can log different data types, including strings, arrays, objects, and numbers.

```
slack.log('title1', 'string');
slack.log('title2', [1, 'user name', { name: 'u' }, null, undefined]);
slack.log('title3', { key_name: 'value 1' });
slack.log('title4', 123);
```

#### Logging without a Title

You can also log data directly without specifying a title.

```
slack.log('string');
slack.log([1, 'user name', { name: 'u' }, null, undefined]);
slack.log({ key_name: 'value 1' });
slack.log(123);
```

### Additional Logging Levels

In addition to slack.log(), you can use other logging levels like info, warn, and error to categorize your logs.

#### Info

Logs informational messages.

```
slack.info('This is an informational message');
```

#### Warn

Logs warnings.

```
slack.warn('This is a warning message');
```

#### Error

Logs error messages.

```
slack.error('This is an error message');
```

#### Example

Here's a complete example:

```
require('dotenv').config();
const slack = require('./index');

// Log messages with titles
slack.log('title1', 'string');
slack.log('title2', [1, 'user name', { name: 'u' }, null, undefined]);
slack.log('title3', { key_name: 'value 1' });
slack.log('title4', 123);

// Log messages without titles
slack.log('string');
slack.log([1, 'user name', { name: 'u' }, null, undefined]);
slack.log({ key_name: 'value 1' });
slack.log(123);

// Using different logging levels
slack.info('This is an informational message');
slack.warn('This is a warning message');
slack.error('This is an error message');

```

## Conclusion

This Slack log package is a useful tool for logging messages directly into a Slack channel, providing an easy way to track and monitor logs from your application.
