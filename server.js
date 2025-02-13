import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import redis from 'redis';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { Client, GatewayIntentBits } from 'discord.js';
import nunjucks from 'nunjucks';
import fs from 'fs'; 

const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const db = new sqlite3.Database('./user_data.db');
const db2 = new sqlite3.Database('./blog_data.db');
const app = express();
const port = 3000;
let token;
fs.readFile('discord_token.txt', 'utf8', (err, data) => {
  if (err) {
      console.error('Error reading file:', err);
      return;
  }
  token = data;
});

const redis_client = redis.createClient({
  url: 'redis://localhost:6379'  // default Redis url
});



redis_client.on('connect', () => {
  console.log('Connected to Redis');
});

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT UNIQUE
  )`, (err) => {
      if (err) {
          console.error('Error creating users table:', err);
      } else {
          console.log('Users table ready');
      }
  });
});

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS blog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      blog_title TEXT NOT NULL,
      blog_content TEXT NOT NULL
  )`, (err) => {
      if (err) {
          console.error('Error creating users table:', err);
      } else {
          console.log('Users table ready2');
      }
  });
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

nunjucks.configure('views', {
  autoescape: true,
  express: app
});

app.use(express.static(path.join(__dirname, 'public')))

app.get('/blog', (req, res) => {
  db.all("SELECT id, username, blog_title, blog_content FROM blog", (err, rows) => {
    if (err) {
      console.error(err.message);
      res.render('blog.njk', {posts: rows});
    } else {
      const text = "discord chat record";
      res.render('blog.njk', {posts: rows});
    }
  });

});


app.get('/', (req, res) => {
      res.render('login.njk',);
});

app.get('/register_page', (req, res) => {
  res.render('register.njk',);
});

app.get('/blogging', (req, res) => {
  res.render('blogging.njk',);
});


app.post('/post_blog', async (req, res) => {
  const username = req.body.username;
  const blog_title = req.body.blog_title;
  const blog_content = req.body.blog_content;
  console.log(username+" "+blog_title+" "+blog_content);
  db.run(
      "INSERT INTO blog (username, blog_title, blog_content) VALUES ('" + username + "', '" + blog_title + "', '" + blog_content + "')", (err, rows) => {
        if (err) {
          console.error(err.message);
        } else {
          db.all("SELECT id, username, blog_title, blog_content FROM blog", (err, rows) => {
            if (err) {
              console.error(err.message);
              res.status(500).send('Error retrieving data from database');
            } else {
              const ip = req.ip;
              getRedisData(ip).then(name => {
                console.log("name: "+name);
                res.render('blog.njk', {posts: rows, welcome: "welcome "+name});
              });
            }
          });
        }
      }
  );
});

app.post('/register', async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  console.log(username+" "+email+" "+password);
  db.run(
      "INSERT INTO users (username, email, password) VALUES ('" + username + "', '" + email + "', '" + password + "')", (err, rows) => {
        if (err) {
          console.error(err.message);
          res.render('register.njk',{errorMessage: 'the username or email might me used'});
        } else {
          db.all("SELECT id, username, blog_title, blog_content FROM blog", (err, rows) => {
            if (err) {
              console.error(err.message);
              res.status(500).send('Error retrieving data from database');
            } else {
              try {
                redis_client.connect();
                const ip = req.ip; // If you're using Express
                redis_client.set(ip, username);
                redis_client.quit();
                res.render('blog.njk', {posts: rows, welcome: "welcome "+ username})
              } catch (err) {
                console.error('Error inserting data into Redis', err);
                res.status(500).send('Error inserting data into Redis');
              }
;
            }
          });
        }
      }
  );
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  console.log(username+" "+password);
  db.all("SELECT * FROM users where username = '"+username+"' and password = '"+password+"'", (err, rows) => {
    console.log(rows);
    if (rows.length === 0) {
      console.log(err);
      res.render('login.njk',{errorMessage: 'invalid username or password'});
    } else {
      db.all("SELECT id, username, blog_title, blog_content FROM blog", (err, rows) => {
        if (rows.length === 0) {
          console.error(err.message);
          res.status(500).send('Error retrieving data from database');
        } else {
          redis_client.connect();
          const ip = req.ip;
          redis_client.set(ip, username);
          redis_client.quit();
          res.render('blog.njk', {posts: rows, welcome: "welcome "+ username})
        }
      });
    }
  });
});


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

async function getRedisData(ip) {
  try {
      await redis_client.connect();
      const value = await redis_client.get(ip);
      console.log("redis data: "+value);
      await redis_client.quit();
      return value;
  } catch (error) {
      console.error('Error getting data:', error);
      return null;
}
}