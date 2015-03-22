
var AWS = require('aws-sdk');
var util = require('util');
var async = require('async');
var url = require('url')
var _ = require('underscore');

AWS.config.region = "eu-west-1";

function parseLog(log) {
  function parseLine(line) {
    // format of a line
    // 0         1   2           3            4                       5                       6                        7               8                   9              10         11
    // timestamp elb client:port backend:port request_processing_time backend_processing_time response_processing_time elb_status_code backend_status_code received_bytes sent_bytes "request"
    var parts = line.split("\"");
    var data = parts[0].split(" ");
    var request = parts[1].split(" ");
    return {
      timestamp:        new Date(data[0]),
      elb:                       data[1],
      client:                    data[2],
      backend:                   data[3],
      request_processing_time:  +data[4],
      backend_processing_time:  +data[5],
      response_processing_time: +data[6],
      elb_status_code:           data[7],
      backend_status_code:       data[8],
      received_bytes:           +data[9],
      sent_bytes:               +data[10],

      method:        request[0],
      url: url.parse(request[1]),
      http_version:  request[2]
    };
  }

  return _.chain(log.toString().split("\n"))
          .filter(function(line) {return line.length !== 0})
          .map(parseLine).value();
}

function isOK(data) {
  return data.backend_status_code === '200';
}

function pathAndMethod(data) {
  return data.url.pathname.replace(/\/V+[^\/]*/, '/ID') + "-" + data.method;
}

function latency(data) {
  return +data.backend_processing_time +
         +data.request_processing_time +
         +data.response_processing_time;
}

function ascending(a, b) {
  return a - b;
}

function analyse(log) {
  return _.chain(parseLog(log))
          .filter(isOK)
          .groupBy(pathAndMethod)
          .map(function(data, group) {
             return {name: group, data: _.map(data, latency).sort(ascending)};
          })
          .value();
}

function percentile(data, percent) {
  return data[((data.length - 1) * percent / 100)];
}

function milliseconds(v) {
  return ((v * 100000) | 0) / 100.0;
}

function buildMetrics(stats, timestamp) {
  return _.map(stats, function(group) { return {
      Namespace: 'atombrenner-latency',
      MetricData: _.map([50, 75, 90, 95, 99], function(percent) { return {
        MetricName: group.name + "-p" + percent,
        Value: milliseconds(percentile(group.data, percent)),
        Timestamp: timestamp,
        Unit: 'Milliseconds'
      }})
    };
  });
}

function handleElbLogWrittenEvent(event, done) {
  var m = event.s3.object.key.match(/_(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})Z_/);
  // m[2] -1 is not a bug, its month is zero based in javascript WTF!
  var timestamp = new Date(Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5]));

  async.waterfall([
    function download(callback) {
      var s3 = new AWS.S3();
      s3.getObject({Bucket: event.s3.bucket.name, Key: event.s3.object.key}, callback);
    },
    function upload(log, callback) {
      var stats = analyse(log.Body);
      var metrics = buildMetrics(stats, timestamp);
      //console.log(util.inspect(metrics, {depth: 5}));

      var cloudwatch = new AWS.CloudWatch();
      async.each(metrics, function(metric, callback) {
        cloudwatch.putMetricData(metric, callback);
      }, callback);
    }
  ], done);
}

function handleS3Records(event, context) {
  console.log("version 5");
  var atombrenner_events = _.filter(event.Records, function(r) {
    console.log(r.s3.object.key);
    return r.s3.object.key.indexOf("atombrenner-elb/") === 0;
  });
  async.each(atombrenner_events, handleElbLogWrittenEvent, function(err, result) {
    context.done(err ? err : null, result ? JSON.stringify(result) : (err ? "error" : "success"));
  });
}

exports.analyse = analyse;
exports.buildMetrics = buildMetrics;
exports.handler = handleS3Records;
