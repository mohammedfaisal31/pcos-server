const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2/promise");
const PORT = 80;
const http = require("http");
const https = require("https");
const bcrypt = require('bcrypt');

const fs = require("fs");
// Certificate
const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/kisargo.ml/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/kisargo.ml/cert.pem",
  "utf8"
);
const ca = fs.readFileSync(
  "/etc/letsencrypt/live/kisargo.ml/fullchain.pem",
  "utf8"
);
const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca,
};

// MySQL connection pool configuration
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "65109105@mysql",
  database: "docracy",
  connectionLimit: 10, // Set the maximum number of connections
});

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use(cors());

app.post("/api/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const result_rows = await executeQuery(
      `SELECT password from voter_credentials WHERE voter_id = (SELECT voter_id from voters WHERE email = '${email}')`
    );
    const stored_password = result_rows[0].password;
    bcrypt.compare(password, stored_password, (err, result) => {
      if (err) {
        // Handle the error
        console.error("Error comparing passwords:", err);
        return;
      }

      if (result) {
        // Passwords match
        console.log("Passwords match");
      } else {
        // Passwords do not match
        console.log("Passwords do not match");
      }
    });
  } catch (error) {
    console.log(error);
  }
});
app.get("/.well-known/acme-challenge/:fileName", (req, res) => {
  res.setHeader("content-type", "text/plain");
  // Use fs.readFile() method to read the file
  res.send(
    fs.readFile(
      __dirname + "/.well-known/acme-challenge/" + req.params.fileName,
      "utf8",
      function (err, data) {
        // Display the file content
        return data;
      }
    )
  );
});
// Starting both http & https servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(PORT, () => {
  console.log("HTTP Server running on port 80");
});

httpsServer.listen(443, () => {
  console.log("HTTPS Server running on port 443");
});

// Async function for executing the SELECT query
async function executeQuery(sql) {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute(sql);
    connection.release(); // Release the connection back to the pool
    return rows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
}
