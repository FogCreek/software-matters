// server.js
// where your node app starts

// init project
const express = require('express');
const exphbs  = require('express-handlebars');
const manuscript = require('manuscript-api')
const app = express();
const querystring = require('querystring');
const db = require("./db");
const at = require("./at");
const Account = require("./account")

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(express.static('public'));

const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

// https://www.loggly.com/docs/node-js-logs/
// https://www.npmjs.com/package/winston-loggly-bulk
let winston = require('winston');
require('winston-loggly-bulk');
winston.add(winston.transports.Loggly, {
  token: process.env.LOGGLY_TOKEN,
  subdomain: process.env.LOGGLY_ACCOUNT,
  tags: ["Winston-NodeJS", process.env.PROJECT_DOMAIN],
  json:true
}); 
 


// http://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  let data = {domain: process.env.PROJECT_DOMAIN};
  Object.assign(data, request.query);
  response.render("index", data);
});

app.post("/", async (request, response) => {
  console.log('post')
  let sitename = normalizedSiteUrl(request.body.site); 
  let url = `https://${sitename}`;
  let token = request.body.token;
  if (!sitename || !token) {
    console.log("missing site name or token")
    return response.redirect(`/?error=true`)
  }
  console.log("SITE: ", sitename)
  let mAPI = manuscript(url, token)
  let userCanAuthenticateToManuscript = await mAPI.isValid();
  console.log("VALID ACCOUNT: ", userCanAuthenticateToManuscript)
  if (!userCanAuthenticateToManuscript) {
    console.log("can't authenticate")
    return response.redirect(`/?error=true`)
  }
  
  try {
    let account = await db.getAccount(sitename);
    if (account) {
      console.log("no account")
      db.setAccountFields(account.account_id, {token: token})
      return response.redirect(`/?success=true`)
    }
    
    db.setAccount({
      account_id: sitename, 
      url: url, 
      token: token, 
      created_at: Date.now(),
      courses: [],
      all_articles: [],
    })
    return response.redirect(`/?success=true&post=true`)
  } catch (error) {
    console.log(error)
    return response.redirect(`/?error=true&post=true`)
  }
})


app.get("/status/", async (request, response) => {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Methods", "GET");
  response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"); 

  // We're not doing anything with this in this sample app,
  // but you'll probably want to check the status of the site.
  try {
    let sitename = request.query.site;
    sitename = normalizedSiteUrl(sitename)
    let account = await db.getAccount(sitename);
    if (account) {
      return response.send({status: "on"});
    } else {
      return response.send({status: "off"})
    }
  } catch (error) {
    
  }

  

});

app.get("/testform", (request, response) => {
  response.render('test')
})

app.get("/test", async (request, response) => {
  let article = await at.nextArticleForCourse(1);
  console.log(article.fields);
  response.send(article.fields);
})

app.get("/publish", async (request, response) => {
  await Account.heartbeat();
  response.send('ok')
})


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

function normalizedSiteUrl(rawSiteUrl){
  let lower = rawSiteUrl.toLowerCase();
  
  if(lower.endsWith("/")) {
    lower = lower.slice(0, -1);
  }
  
  const fb = ".fogbugz.com";
  if(lower.endsWith(fb)) {
    let base = (lower.slice(0, -1 * fb.length));
    return base + ".manuscript.com";
  }
  
  return lower;
}

