const winstonCloudWatch = require('winston-cloudwatch');

const utils = require('../utils');

let serviceName = '';
const defaultLogStreamName = 'none';

async function createWinstonCloudWatch(options = {}) {
  if (!options.logGroupName || !options.accessKeyId) {
    return null;
  }
  serviceName = options.serviceName || '';
  return new winstonCloudWatch({
    logGroupName: options.logGroupName,
    logStreamName: `${await _getLogStreamName(options)}-${process.env.pm_id}`,
    awsAccessKeyId: options.accessKeyId,
    awsSecretKey: options.secretAccessKey,
    awsSecretKeyId: options.accessKeyId,
    awsRegion: options.region,
    messageFormatter,
  });
}

function messageFormatter({ level, message, ...info }) {
  const processedInfo = _process(info);
  processedInfo.serviceName = serviceName;
  try {
    return `${level}: ${message} ${JSON.stringify(processedInfo)}`;
  } catch (e) {
    return '';
  }
}

function _process(info) {
  if (!info) {
    return '';
  }
  if (info instanceof Error) {
    return {
      stack: info.stack,
      message: info.message,
    };
  }
  ['error', 'err', 'e'].forEach(key => {
    if (info[key] instanceof Error) {
      info[key] = {
        message: info[key].message,
        stack: info[key].stack,
      };
    }
  });
  return info;
}

async function _getLogStreamName(options) {
  if (options.logStreamName) {
    return options.logStreamName;
  }
  try {
    if (options.logStreamSource) {
      switch (options.logStreamSource) {
        case 'ec2-instance-id':
          return await utils.getInstanceId();
        default:
          return defaultLogStreamName;
      }
    }
  } catch (error) {
    return defaultLogStreamName;
  }
  return defaultLogStreamName;
}

exports.createWinstonCloudWatch = createWinstonCloudWatch;
