// Packages
const express = require('express');
const config = require('./config.json');
const app = express();
const bodyParser = require('body-parser');
const colog = require('colog');
const path = require('path');
const moment = require('moment');
const models = require('./models');
const gzipStatic = require('connect-gzip-static');
const history = require('connect-history-api-fallback');

// Application config
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Dynamic Routes
app.post('/rpccallback', (req, res) => {
  console.log(req.body);
  res.send();
});

// Static routes
app.use(history())
app.use(gzipStatic(path.join(__dirname,"/node-explorer-client/dist")))
app.get('/reset', (req, res) => {
  if (config.environment === "development") {
    models.sequelize.sync({force:true});
    res
      .status(200)
      .json({
        'status': 'SUCCESS',
        'message': 'Successfully cleared database'
      });
  } else {
    res
      .status(403)
      .json({
        'status': 'ERROR',
        'message': 'Database reset is only available on development!'
      });
  }
});

//Debug Logging
app.use((req, res, next) => {
  if (config.debug) {
    colog.log(colog.color(moment().format('YYYY-MM-DD HH:mm:ss') + ' - ','cyan') +
              colog.color(req.headers['x-forwarded-for'] || req.connection.remoteAddress,'cyan')+
              ' - '+colog.inverse(req.method)+' - '+colog.bold(req.url));
  }
  if (config.environment === "development") {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  }
  next();
});

//Database
models.sequelize.sync().then(() => {
  app.listen(config.system.port);
});
console.log('Listening on port: ' + config.system.port);
