import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

const isProduction = process.env.NODE_ENV === 'production';

function createCloudWatchTransport(): WinstonCloudWatch | null {
  const region = process.env.AWS_REGION;
  const logGroup = process.env.CLOUDWATCH_LOG_GROUP;

  if (!region || !logGroup) {
    return null;
  }

  const date = new Date().toISOString().split('T')[0];
  const logStream = `${date}-${process.env.HOSTNAME || 'ito-api'}`;

  return new WinstonCloudWatch({
    logGroupName: logGroup,
    logStreamName: logStream,
    awsRegion: region,
    jsonMessage: true,
    retentionInDays: 30,
    messageFormatter: (item: { level: string; message: string; [key: string]: unknown }) => {
      const { level, message, context, timestamp, ...rest } = item;
      return JSON.stringify({ level, message, context, timestamp, ...rest });
    },
  });
}

export function createLoggerConfig(): WinstonModuleOptions {
  const transports: winston.transport[] = [];

  // Console transport — always enabled
  if (isProduction) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  } else {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context }) => {
            const ctx = context ? `[${context}]` : '';
            return `${timestamp} ${level} ${ctx} ${message}`;
          }),
        ),
      }),
    );
  }

  // CloudWatch transport — only when configured
  const cloudWatch = createCloudWatchTransport();
  if (cloudWatch) {
    transports.push(cloudWatch);
  }

  return {
    level: isProduction ? 'info' : 'debug',
    transports,
  };
}
