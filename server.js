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
const app = express();
const port = 3000;

fs.readFile('discord_token.txt', 'utf8', (err, data) => {
  if (err) {
      console.error('Error reading file:', err);
      return;
  }
  const token = data;
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



app.get('/', (req, res) => {
      res.render('login.njk',);
});

app.get('/register_page', (req, res) => {
  res.render('register.njk',);
});


app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (username === 'admin' && password === 'admin') {
      res.render('main.njk',{text: 'welcome to the dashboard'});
    }
    else{
      res.render('main.njk',{text: 'invalid username or password'});
    }
  } catch (error) {
      console.error('Login error:', error);
      res.redirect('/login?error=server');
  }
});``


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
