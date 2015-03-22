
var fs = require('fs');
var util = require('util');
var lambda = require("./lambda.js");

fs.readFile('./elb.log', function (err, log) {
  if (err) throw err;

  var stats = lambda.analyse(log);
  var metrics = lambda.buildMetrics(stats, new Date());

  console.log(util.inspect(metrics, {depth: 5}));
});

var context = {
  done: function(err, s){
    console.log("done(" + err + ", '" + s + "')");
  }
}

var event = {
  "Records": [
         {
             "eventVersion": "2.0",
             "eventSource": "aws:s3",
             "awsRegion": "eu-west-1",
             "eventTime": "2015-03-08T16:45:57.612Z",
             "eventName": "ObjectCreated:Put",
             "userIdentity": {
                 "principalId": "AWS:AIDAIC3Q6OY7XTEX2MMHK"
             },
             "requestParameters": {
                 "sourceIPAddress": "54.76.184.55"
             },
             "responseElements": {
                 "x-amz-request-id": "322D61A642DC4F13",
                 "x-amz-id-2": "fxEIaKx/BG0oaQu9iaavhqjbsiSG12/uvzT10NKMM2jvjC96Hp6U1XIiwihWM+DibwTfxr98+a4="
             },
             "s3": {
                 "s3SchemaVersion": "1.0",
                 "configurationId": "elb test",
                 "bucket": {
                     "name": "atombrenner-logs",
                     "ownerIdentity": {
                         "principalId": "A3SY18V2289Y99"
                     },
                     "arn": "arn:aws:s3:::atombrenner-logs"
                 },
                 "object": {
                     "key": "atombrenner-elb/AWSLogs/037251718545/elasticloadbalancing/eu-west-1/2015/03/15/037251718545_elasticloadbalancing_eu-west-1_atombrenner-ELB_20150315T1800Z_54.229.210.119_35ze8umx.log",
                     "size": 1736717,
                     "eTag": "56e3d1f9cc437c0c9b95865022803151"
                 }
             }
         }
     ]
};

lambda.handler(event, context);
