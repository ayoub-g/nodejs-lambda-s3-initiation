const AWS = require("aws-sdk");
AWS.config.update({ region: "eu-west-1" });
const stream = require("stream");
const http = require("http");
const https = require("https");

exports.handler = async (event) => {
  let response = {
    headers: {
      "Content-Type": "application/json",
      "Acess-Control-Allow-Origin": "*",
    },
  };
  if (event.body === undefined) {
    response.body = JSON.stringify("Error empty request");
    response.statusCode = 400;
  } else {
    const reqparams = JSON.parse(event.body);
    if (reqparams && reqparams.link && reqparams.key) {
      try {
        const url = reqparams.link;
        const key = reqparams.key;
        let image;
        let type;
        const s3 = new AWS.S3({
          apiVersion: "2006-03-01",
        });
        if (url.startsWith("https")) {
          [image, type] = await downloadFileHttps(url);
        } else {
          [image, type] = await downloadFileHttp(url);
        }
        const data = await uploadFromStream(s3, image, key, type);
        response.statusCode = 200;
        response.body = JSON.stringify(data);
      } catch (err) {
        response.statusCode = 400;
        response.body = JSON.stringify(err);
      }
    } else {
      response.body = JSON.stringify("Error : missing query parameters");
      response.statusCode = 400;
    }
  }
  return response;
};
let downloadFileHttps = (link) =>
  new Promise((resolve, reject) => {
    let data = new stream.Transform();

    https.get(link, (res) => {
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => {
        resolve([data.read(), res.headers["content-type"]]);
      });
      res.on("error", (err) => {
        reject(err);
      });
    });
  });
let downloadFileHttp = (link) =>
  new Promise((resolve, reject) => {
    let data = new stream.Transform();
    http.get(link, (res) => {
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => {
        resolve([data.read(), res.headers["content-type"]]);
      });
      res.on("error", (err) => {
        reject(err);
      });
    });
  });

let uploadFromStream = async (s3, image, key, type) => {
  var params = {
    ContentType: type,
    Bucket: "ayoub.gharbi/images",
    ACL: "public-read",
    Key: key,
    Body: image,
  };
  try {
    const data = await s3.upload(params).promise();
    return data;
  } catch (err) {
    return err;
  }
};
