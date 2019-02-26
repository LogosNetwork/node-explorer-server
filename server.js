// Packages
const express = require('express')
const config = require('./config.json')
const app = express()
const bodyParser = require('body-parser')
const colog = require('colog')
const path = require('path')
const moment = require('moment')
const models = require('./models')
const axios = require('axios')
const gzipStatic = require('connect-gzip-static')
const history = require('connect-history-api-fallback')
const redis = require('redis')
const mosca = require('mosca')
const mqtt = require('mqtt')
const blocks = require('./services/blocks')
const blockRoutes = require('./routes/blocks')
const Logos = require('@logosnetwork/logos-rpc-client')
const LogosWallet = require('@logosnetwork/logos-webwallet-sdk')
const Wallet = LogosWallet.Wallet
const rpc = {
  delegates: Object.values(config.delegates)
}
const wallet = new Wallet({
  password: 'password',
  fullSync: false,
  rpc: rpc,
  mqtt: 'ws:localhost:8883'
})
const RPC = new Logos({ url: `http://${config.delegates[0]}:55000`, debug: false })
const bigInt = require('big-integer')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const EMPTYHEX = '0000000000000000000000000000000000000000000000000000000000000000'

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// Application Cookie Sessions
const store = new RedisStore(redis)
app.use(session({
  store: new RedisStore(store),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false
  // cookie: { secure: true } //TODO Add full SSL including webhooks
}))

// Application config
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Dynamic Routes
app.post('/callback', (req, res) => {
  handleLogosWebhook(req.body)
  res.send()
})
app.post('/rpc', async (req, res) => {
  let targetURL = req.body.targetURL
  delete req.body.targetURL
  const response = await axios.post(`${targetURL}/`, req.body)
  res.send(response.data)
})
app.get('/delegates', (req, res) => {
  res.send(config.delegates)
})
app.post('/faucet', async (req, res) => {
  if (req.body.address) {
    let val = wallet.account.pendingBalance
    let logosAmount = 0
    let bal = bigInt(val).divide(10000)
    bal = Number(RPC.convert.fromReason(bal, 'LOGOS'))
    if (bal > (1000)) {
      logosAmount = 1000
    } else {
      logosAmount = Number(bal).toFixed(5)
    }
    let block = await wallet.account.createSend([{
      destination: req.body.address,
      amount: RPC.convert.toReason(logosAmount, 'LOGOS')
    }], true, wallet.rpc)
    res.send({
      msg: `Faucet has published sent request of ${logosAmount} Logos to ${req.body.address}`,
      hash: block.hash
    })
  }
})
app.get('/manual', (req, res) => {
  res.sendFile(path.join(__dirname, '/static/manual.html'))
})
app.get('/reset', (req, res) => {
  if (config.environment === 'development') {
    models.sequelize.sync({ force: true }).then((val) => {
      res
        .status(200)
        .json({
          'status': 'SUCCESS',
          'message': 'Successfully cleared database'
        })
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
app.use('/blocks', blockRoutes)

// MQTT SERVER
const mqttServerOpts = {
  type: 'redis',
  redis: redis,
  db: 12,
  port: 6379,
  return_buffers: true,
  host: 'localhost'
}

const moscaSettings = {
  port: config.mqtt.port,
  backend: mqttServerOpts,
  persistence: {
    factory: mosca.persistence.Redis
  },
  logger: {
    name: 'secure',
    level: 40
  },
  http: {
    port: config.mqtt.wsport,
    bundle: true,
    static: './'
  }
}

if (config.environment === 'production') {
  const SECURE_KEY = config.keyPath
  const SECURE_CERT = config.certPath
  moscaSettings.https = {
    port: config.mqtt.wssport,
    bundle: true,
    static: './'
  }
  moscaSettings.secure = {
    port: config.mqtt.securePort,
    keyPath: SECURE_KEY,
    certPath: SECURE_CERT
  }
}

let mqttServer = new mosca.Server(moscaSettings)
let mqttClient = null
mqttServer.on('ready', () => {
  console.log('Mosca server is up and running')
})

mqttServer.on('clientConnected', (client) => {
  console.log(`client connected: ${client.id}`)
})

mqttServer.on('published', function (packet, client) {
  console.log(`Published Topic: ${packet.topic}`)
})

// MQTT Client
const connectMQTT = () => {
  mqttClient = mqtt.connect(config.mqtt.url, config.mqtt.options)
  mqttClient.on('connect', () => {
    console.log('RPC Webhook connected to MQTT server')
  })
}

const publish = (topic, payload) => {
  mqttClient.publish(topic, JSON.stringify(payload), config.mqtt.block.opts)
}

// MQTT Publish Batch Blocks, Transcations, MicroEpochs, and Epochs
const handleLogosWebhook = async (block) => {
  if (block.type === "RequestBlock") {
    let prevRequestBatch = await blocks.getRequestBlock(block.previous)
    if (block.previous !== EMPTYHEX && prevRequestBatch) {
      block.prevHash = block.previous
    }
    blocks.createRequestBlock(block).then(async (requestBlock) => {
      publish(`requestBlock/${block.delegate}`, block)
      for (let request of block.requests) {
        request.timestamp = block.timestamp
        publish(`request/${request.hash}`, request)
        request.requestBlockHash = block.hash
        let prevRequest = await blocks.getRequest(request.previous) 
        if (request.previous !== EMPTYHEX && prevRequest) {
          request.prevHash = request.previous
        }
        blocks.createRequest(request).then((dbBlock) => {
          publish(`account/${request.origin}`, request)
          if (request.type === 'send' && request.transactions) {
            for (let transaction of request.transactions) {
              transaction.requestHash = request.hash
              blocks.createSend(transaction).then((dbSend) => {
                publish(`account/${transaction.destination}`, request)
              })
            }
          }
        }).catch((err) => {
          console.log(err)
        })
      }
    }).catch((err) => {
      console.log(err)
    })
  } else if (block.type === "MicroBlock") {
    let prevMicroEpoch = await blocks.getMicroEpoch(block.previous)
    if (block.previous !== EMPTYHEX && prevMicroEpoch) {
      block.prevHash = block.previous
    }
    blocks.createMicroEpoch(block).then(async (microEpoch) => {
      for (let tip of block.tips) {
        let requestBlockTip = await blocks.getRequestBlock(tip)
        if (tip !== EMPTYHEX && requestBlockTip) {
          requestBlockTip.update({
            microEpochHash: block.hash
          })
        }
      }
      publish(`microEpoch`, block)
    }).catch((err) => {
      console.log(err)
    })
  } else if (block.type === "Epoch") {
    let prevEpoch = await blocks.getEpoch(block.previous)
    if (block.previous !== EMPTYHEX && prevEpoch) {
      block.prevHash = block.previous
    }
    blocks.createEpoch(block).then(async (epoch) => {
      publish(`epoch`, block)
      let microEpoch = await blocks.getMicroEpoch(block.micro_block_tip)
      if (block.micro_block_tip !== EMPTYHEX && microEpoch) {
        microEpoch.update({
          microBlockTipHash: block.hash
        })
      }
      for (let delegate of block.delegates) {
        delegate.epochHash = block.hash
        blocks.createDelegate(delegate).then().catch((err) => {
          console.log(err)
        })
      }
    }).catch((err) => {
      console.log(err)
    })
  }
}

// Static routes
app.use(history())
app.use(gzipStatic(path.join(__dirname, '/node-explorer-client/dist')))

// Debug Logging
app.use((req, res, next) => {
  if (config.debug) {
    colog.log(colog.color(moment().format('YYYY-MM-DD HH:mm:ss') + ' - ', 'cyan') +
      colog.color(req.headers['x-forwarded-for'] || req.connection.remoteAddress, 'cyan') +
      ' - ' + colog.inverse(req.method) + ' - ' + colog.bold(req.url))
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

// Database
models.request.hasMany(models.send, {as: 'transactions'})
models.request.hasOne(models.request, {as: 'prev'})
models.request.hasOne(models.request, {as: 'next'})

models.requestBlock.hasMany(models.request, {as: 'requests'})
models.requestBlock.hasOne(models.requestBlock, {as: 'prev'})
models.requestBlock.hasOne(models.requestBlock, {as: 'next'})

models.microEpoch.hasMany(models.requestBlock, {as: 'tips'})
models.microEpoch.hasOne(models.microEpoch, {as: 'prev'})
models.microEpoch.hasOne(models.microEpoch, {as: 'next'})

models.epoch.hasMany(models.delegate, {as: 'delegates'})
models.epoch.hasOne(models.epoch, {as: 'prev'})
models.epoch.hasOne(models.epoch, {as: 'next'})
models.epoch.hasOne(models.microEpoch, {as: 'microBlockTip'})

models.sequelize.sync().then(() => {
  configureSignals()
  connectMQTT()
  app.listen(config.system.port)
  wallet.createAccount({
    privateKey: config.faucetPrivateKey
  }).catch((err) => console.log(err))
  console.log('Listening on port: ' + config.system.port)
})
