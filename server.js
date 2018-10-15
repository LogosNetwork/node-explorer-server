// Packages
const express = require('express')
const config = require('./config.json')
const app = express()
const bodyParser = require('body-parser')
const colog = require('colog')
const path = require('path')
const moment = require('moment')
const models = require('./models')
const gzipStatic = require('connect-gzip-static')
const history = require('connect-history-api-fallback')
const redis = require('redis')
const mosca = require('mosca')
const mqtt = require('mqtt')
const mqttRegex = require('mqtt-regex') // Used to parse out parameters from wildcard MQTT topics

// Application config
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Dynamic Routes
app.post('/callback', (req, res) => {
  console.log(req.body)
  handleRaiCallback(req.body)
  res.send()
})

//MQTT SERVER
const mqttServerOpts = {
  type: 'redis',
  redis: redis,
  db: 12,
  port: 6379,
  return_buffers: true,
  host: "localhost"
}

const moscaSettings = {
  port: 1883,
  backend: mqttServerOpts,
  persistence: {
    factory: mosca.persistence.Redis
  }
}

let mqttServer = new mosca.Server(moscaSettings)
mqttServer.on('ready', () => {
  console.log('Mosca server is up and running')
})

mqttServer.on('clientConnected', (client) => {
	console.log(`client connected: ${client.id}`)
})

mqttServer.on('published', function(packet, client) {
  console.log(`Published Topic: ${packet.topic} Payload: ${packet.payload}`)
})

// MQTT Client
const broadcastMqttRegex = mqttRegex('broadcast/+account').exec
const connectMQTT = () => {
  mqttClient = mqtt.connect(config.mqtt.url, config.mqtt.options)
  mqttClient.on('connect', () => {
    console.log('Connected to MQTT server')
    subscribe()
  })

  // Where all subscribed messages come in
  mqttClient.on('message', (topic, message) => {
    let params = broadcastMqttRegex(topic)
    if (params) {
      return handleBroadcastBlock(params.account, message)
    }
    console.log(`No handler for topic ${topic}`)
  })
}

const handleBroadcastBlock = (account, message) => {
  console.log('Broadcast for account ' + account + ' block ' + message)
}

let subscribed = false
const subscribe = () => {
  if (!subscribed) {
    mqttClient.subscribe('broadcast/+') // account number
    console.log('Subscribed to selected topics')
    subscribed = true
  }
}

const publishBlock = (topic, payload) => {
  console.log(`Publish: ${topic} block: ${JSON.stringify(payload)}`)
  mqttClient.publish(topic, JSON.stringify(payload), config.mqtt.block.opts)
}

const handleRaiCallback = (blk) => {
  let blk2 = JSON.parse(blk.block)
  let blkType = blk2.type
  let account = blk.account
  console.log(`Acc: ${account} block: ${blkType} hash: ${blk.hash}`)
  publishBlock(`broadcast/${blk.account.replace('xrb_','lgs_')}`, blk)
}

// Static routes
app.use(history())
app.use(gzipStatic(path.join(__dirname,"/node-explorer-client/dist")))
app.get('/reset', (req, res) => {
  if (config.environment === "development") {
    models.sequelize.sync({force:true})
    res
      .status(200)
      .json({
        'status': 'SUCCESS',
        'message': 'Successfully cleared database'
      })
  } else {
    res
      .status(403)
      .json({
        'status': 'ERROR',
        'message': 'Database reset is only available on development!'
      })
  }
})

//Debug Logging
app.use((req, res, next) => {
  if (config.debug) {
    colog.log(colog.color(moment().format('YYYY-MM-DD HH:mm:ss') + ' - ','cyan') +
              colog.color(req.headers['x-forwarded-for'] || req.connection.remoteAddress,'cyan')+
              ' - '+colog.inverse(req.method)+' - '+colog.bold(req.url))
  }
  if (config.environment === "development") {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  }
  next()
})

// Want to notify before shutting down
const handleAppExit = (options, err) => {
  if (err) {
    console.log(err.stack)
  }
  if (options.cleanup) {
    console.log('Cleaning up...')
    if (mqttClient) {
      mqttClient.end(true)
    }
  }
  if (options.exit) {
    console.log('Calling exit...')
    process.exit()
  }
}

const configureSignals = () => {
  process.on('exit', handleAppExit.bind(null, {
    cleanup: true
  }))
  process.on('SIGINT', handleAppExit.bind(null, {
    exit: true
  }))
  process.on('uncaughtException', handleAppExit.bind(null, {
    exit: true
  }))
}

//Database
models.sequelize.sync().then(() => {
  configureSignals()
  connectMQTT()
  app.listen(config.system.port)
})
console.log('Listening on port: ' + config.system.port)
