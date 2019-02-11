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
const jwt = require('jsonwebtoken')
const fs = require('fs')
const Logos = require('@logosnetwork/logos-rpc-client')
const RPC = new Logos({ url: `http://${config.delegates[0]}:55000`, debug: false })
const bigInt = require('big-integer')
const mqttRegex = require('mqtt-regex') // Used to parse out parameters from wildcard MQTT topics
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
app.post('/password', (req, res) => {
  if (req.body.password && req.body.password === 'locoforlogos') {
    let cert = fs.readFileSync('jwtRS256.key')
    jwt.sign({}, cert, { algorithm: 'RS256' }, (err, token) => {
      if (!err) {
        req.session.token = token
        res.send({
          token: token
        })
      }
    })
  }
})
let shouldAbort = function () {
  return new Promise(resolve => {
    let results = []
    for (let i = 0; i < Object.keys(config.delegates).length; i++) {
      RPC.changeServer(`http://${config.delegates[i]}:55000`)
      RPC.accounts.info(config.accountID)
        .then(val => {
          results.push(val.frontier)
          if (results.length === 32) {
            let status = results.every((val, i, arr) => val === arr[0])
            resolve(!status)
          }
        })
    }
  })
}
app.post('/faucet', async (req, res) => {
  if (req.body.address) {
    let abort = await shouldAbort()
    if (abort) {
      res.send('Faucet encountered and error please try again!')
    } else {
      let val = await RPC.account(config.faucetPrivateKey).info()
      let delegateId = null
      if (val.frontier !== EMPTYHEX) {
        delegateId = parseInt(val.frontier.slice(-2), 16) % 32
      } else {
        delegateId = parseInt(config.accountKey.slice(-2), 16) % 32
      }
      RPC.changeServer(`http://${config.delegates[delegateId]}:55000`)
      let logosAmount = 0
      let bal = bigInt(val.balance).divide(10000)
      bal = Number(RPC.convert.fromReason(bal, 'LOGOS'))
      if (bal > (1000)) {
        logosAmount = 1000
      } else {
        logosAmount = Number(bal).toFixed(5)
      }
      RPC.account(config.faucetPrivateKey).send(logosAmount, req.body.address).then((val) => {
        res.send({
          msg: `Faucet has sent ${logosAmount} to ${req.body.address}`,
          hash: val.hash
        })
      })
    }
  }
})
app.get('/manual', (req, res) => {
  if (req.session.token) {
    let cert = fs.readFileSync('jwtRS256.key.pub')
    jwt.verify(req.session.token, cert, { algorithms: ['RS256'] }, (err, payload) => {
      if (err) {
        res.redirect('/password?redirect%2Fmanual')
      } else {
        res.sendFile(path.join(__dirname, '/static/manual.html'))
      }
    })
  } else {
    res.redirect('/password?redirect=%2Fmanual')
  }
})
app.post('/verify', (req, res) => {
  req.session.token = req.body.token
  if (req.body.token) {
    let cert = fs.readFileSync('jwtRS256.key.pub')
    jwt.verify(req.body.token, cert, { algorithms: ['RS256'] }, (err, payload) => {
      if (err) {
        res.send({
          authenticated: false
        })
      } else {
        res.send({
          authenticated: true
        })
      }
    })
  }
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
const broadcastMqttRegex = mqttRegex('account/+account').exec
const connectMQTT = () => {
  mqttClient = mqtt.connect(config.mqtt.url, config.mqtt.options)
  mqttClient.on('connect', () => {
    console.log('RPC Webhook connected to MQTT server')
    // subscribe()
  })

  // Where all subscribed messages come in
  mqttClient.on('message', (topic, message) => {
    let params = broadcastMqttRegex(topic)
    if (params) {
      return handleBroadcastBlock(params.account, message)
    }
    // console.log(`No handler for topic ${topic}`)
  })
}

const handleBroadcastBlock = (account, message) => {
  // console.log('Broadcast for account ' + account + ' block ' + message)
}

// let subscribed = false
// const subscribe = () => {
//   if (!subscribed) {
//     mqttClient.subscribe('account/+') // account number
//     console.log('Subscribed to selected topics')
//     subscribed = true
//   }
// }

const publishBlock = (topic, payload) => {
  mqttClient.publish(topic, JSON.stringify(payload), config.mqtt.block.opts)
}

// MQTT Publish Batch Blocks, Transcations, MicroEpochs, and Epochs
const handleLogosWebhook = async (block) => {
  if (block.type === "BatchStateBlock") {
    let prevBatch = await blocks.getBatchBlock(block.previous)
    if (block.previous !== EMPTYHEX && prevBatch) {
      block.prevHash = block.previous
    }
    blocks.createBatchBlock(block).then(async (batchBlock) => {
      publishBlock(`batchBlock/${block.delegate}`, block)
      for (let transaction of block.blocks) {
        transaction.batchBlockHash = block.hash
        let prevBlock = await blocks.getBlock(transaction.previous) 
        if (transaction.previous !== EMPTYHEX && prevBlock) {
          transaction.prevHash = transaction.previous
        }
        publishBlock(`transaction/${transaction.hash}`, transaction)
        blocks.createBlock(transaction).then((dbBlock) => {
          publishBlock(`account/${transaction.account}`, transaction)
          if (transaction.transactions) {
            for (let transactionTargets of transaction.transactions) {
              transactionTargets.blockHash = transaction.hash
              blocks.createSend(transactionTargets).then((dbSend) => {
                publishBlock(`account/${transactionTargets.target}`, transaction)
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
        let batchBlockTip = await blocks.getBatchBlock(tip)
        if (tip !== EMPTYHEX && batchBlockTip) {
          batchBlockTip.update({
            microEpochHash: block.hash
          })
        }
      }
      publishBlock(`microEpoch`, block)
    }).catch((err) => {
      console.log(err)
    })
  } else if (block.type === "Epoch") {
    let prevEpoch = await blocks.getEpoch(block.previous)
    if (block.previous !== EMPTYHEX && prevEpoch) {
      block.prevHash = block.previous
    }
    blocks.createEpoch(block).then(async (epoch) => {
      publishBlock(`epoch`, block)
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
models.block.hasMany(models.send, {as: 'sends'})
models.block.hasOne(models.block, {as: 'prev'})
models.block.hasOne(models.block, {as: 'next'})

models.batchBlock.hasMany(models.block, {as: 'blocks'})
models.batchBlock.hasOne(models.batchBlock, {as: 'prev'})
models.batchBlock.hasOne(models.batchBlock, {as: 'next'})

models.microEpoch.hasMany(models.batchBlock, {as: 'tips'})
models.microEpoch.hasOne(models.microEpoch, {as: 'prev'})
models.microEpoch.hasOne(models.microEpoch, {as: 'next'})

models.epoch.hasMany(models.delegate, {as: 'delegates'})
models.epoch.hasOne(models.epoch, {as: 'prev'})
models.epoch.hasOne(models.epoch, {as: 'next'})
models.epoch.hasOne(models.microEpoch, {as: 'microBlockTip'})

models.sequelize.sync({ force: true }).then(() => {
  configureSignals()
  connectMQTT()
  app.listen(config.system.port)
})
console.log('Listening on port: ' + config.system.port)
