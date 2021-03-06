/* eslint-disable no-console */
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const expressWs = require("express-ws");
//const fs = require("fs");
const pty = require("node-pty");
const os = require("os");

const app = express();
//const router = express.Router();
expressWs(app);

const terminals = {},
  logs = {};

const USE_BINARY = os.platform() !== "win32";

// cors 해제
app.use(cors());

// 기본 라우팅
app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/docs/public/index.html`);
});

app.get("/app", (req, res) => {
  res.sendFile(`${__dirname}/docs/public/app/index.html`);
});

app.get("/worldview", (req, res) => {
  res.sendFile(`${__dirname}/docs/public/worldview/index.html`);
});

app.use("/dist", express.static(`${__dirname}/docs/public/dist`));
app.use("/assets", express.static(`${__dirname}/docs/public/assets`));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/terminals", (req, res) => {
  const env = Object.assign({}, process.env);
  env.COLORTERM = "truecolor";
  const cols = parseInt(req.query.cols),
    rows = parseInt(req.query.rows),
    term = pty.spawn(process.platform === "win32" ? "cmd.exe" : "bash", [], {
      name: "xterm-256color",
      cols: cols || 80,
      rows: rows || 24,
      cwd: env.PWD,
      env,
      encoding: USE_BINARY ? null : "utf8",
    });

  console.log(`Created terminal with PID: ${term.pid}`);
  terminals[term.pid] = term;
  logs[term.pid] = "";
  term.on("data", (data) => {
    logs[term.pid] += data;
  });
  res.send(term.pid.toString());
  res.end();
});

app.post("/terminals/:pid/size", (req, res) => {
  const pid = parseInt(req.params.pid),
    cols = parseInt(req.query.cols),
    rows = parseInt(req.query.rows),
    term = terminals[pid];

  term.resize(cols, rows);
  console.log(`Resized terminal ${pid} to ${cols} cols and ${rows} rows.`);
  res.end();
});

app.ws("/terminals/:pid", (ws, req) => {
  const term = terminals[parseInt(req.params.pid)];
  console.log(`Connected to terminal ${term.pid}`);
  ws.send(logs[term.pid]);

  // string message buffering
  function buffer(socket, timeout) {
    let s = "";
    let sender = null;
    return (data) => {
      s += data;
      if (!sender) {
        sender = setTimeout(() => {
          socket.send(s);
          s = "";
          sender = null;
        }, timeout);
      }
    };
  }
  // binary message buffering
  function bufferUtf8(socket, timeout) {
    let buffer = [];
    let sender = null;
    let length = 0;
    return (data) => {
      buffer.push(data);
      length += data.length;
      if (!sender) {
        sender = setTimeout(() => {
          socket.send(Buffer.concat(buffer, length));
          buffer = [];
          sender = null;
          length = 0;
        }, timeout);
      }
    };
  }
  const send = USE_BINARY ? bufferUtf8(ws, 5) : buffer(ws, 5);

  term.on("data", (data) => {
    try {
      send(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });
  ws.on("message", (msg) => {
    term.write(msg);
  });
  ws.on("close", () => {
    term.kill();
    console.log(`Closed terminal ${term.pid}`);
    // Clean things up
    delete terminals[term.pid];
    delete logs[term.pid];
  });
});

console.log(process.env.NODE_ENV);
const port = process.env.NODE_ENV === "development" ? 5000 : 3000,
  host = os.platform() === "win32" ? "127.0.0.1" : "0.0.0.0";

console.log(`App listening to http://127.0.0.1:${port}`);
app.listen(port, host);
