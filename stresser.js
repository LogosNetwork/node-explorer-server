const config = require('./config.json')
const redis = require('redis')
const client = redis.createClient()
const Logos = require('@logosnetwork/logos-rpc-client')
const RPC = new Logos({ url: `http://${config.delegates[0]}:55000`, debug: false })
const bigInt = require('big-integer')
const mqtt = require('mqtt')
const mqttRegex = require('mqtt-regex') // Used to parse out parameters from wildcard MQTT topics
let transactionCountLastSecond = 0
// MQTT Client
const broadcastMqttRegex = mqttRegex('account/+account').exec
let mqttClient = null
const connectMQTT = () => {
  mqttClient = mqtt.connect('wss:pla.bs:8443')
  mqttClient.on('connect', () => {
    console.log('RPC Callback connected to MQTT server')
    mqttClient.subscribe('#', (err) => {
      if (!err) {
        console.log(`subscribed to #`)
      } else {
        console.log(err)
      }
    })
  })

  // Listen for confirmation
  mqttClient.on('message', (topic, message) => {
    let params = broadcastMqttRegex(topic)
    message = JSON.parse(message.toString())
    if (params && message.type === 'send') {
      transactionCountLastSecond++
      if (accountKeys[message.account] && accountKeys[message.account].pending) {
        accountKeys[message.account].pending = false
      }
    }
  })
}

if (config.resetAccountKeys) client.set('accountKeys', '{}')
let accountKeys = {}
let keys = []
client.get('accountKeys', (err, result) => {
  if (err) {
    accountKeys[config.accountID] = {
      privateKey: config.faucetPrivateKey,
      publicKey: config.accountKey,
      address: config.accountID,
      previous: null,
      balance: null,
      pending: false
    }
    keys = Object.keys(accountKeys)
  } else {
    if (result !== null && result !== '{}') {
      accountKeys = JSON.parse(result)
      keys = Object.keys(accountKeys)
    } else {
      accountKeys[config.accountID] = {
        privateKey: config.faucetPrivateKey,
        publicKey: config.accountKey,
        address: config.accountID,
        previous: null,
        balance: null,
        pending: false
      }
      keys = Object.keys(accountKeys)
    }
  }
  for (let i in keys) {
    accountKeys[keys[i]].pending = false
  }
  console.log(`Starting Test with: ${keys.length} account(s)`)
})
const seedMoney = RPC.convert.toReason(1000, 'LOGOS')
const networkFee = '10000000000000000000000'
let totalFeesPaid = bigInt(0)
const sendFakeTransaction = async () => {
  let senderIndex = 0
  let receiverIndex = 0
  let sender = null
  let receiver = null

  // Calculate who the sender is
  // Select an existing generated account at random
  if (keys.length > 1) {
    senderIndex = Math.floor(Math.random() * Math.floor(keys.length - 1)) + 1
  }
  sender = accountKeys[keys[senderIndex]]
  if (sender.pending) {
    // console.log(`${sender.address} is still processing a transaction`)
    return
  }

  // Calculate who the receiver is
  // Generate a new account
  if (keys.length < config.maximumGeneratedAccounts) {
    // Generate a new account
    let account = await RPC.key.create()
    account.balance = '0'
    account.previous = '0000000000000000000000000000000000000000000000000000000000000000'
    accountKeys[account.address] = account
    keys.push(account.address)
    receiverIndex = keys.length - 1
  } else {
    // Select an existing generated account at random
    if (keys.length > 1) {
      receiverIndex = Math.floor(Math.random() * Math.floor(keys.length - 1)) + 1
    }
  }

  // We don't want to send to ourselves
  if (senderIndex === receiverIndex) {
    receiverIndex++
    if (keys.length - 1 === senderIndex) {
      let account = await RPC.key.create()
      account.balance = '0'
      account.previous = '0000000000000000000000000000000000000000000000000000000000000000'
      accountKeys[account.address] = account
      keys.push(account.address)
    }
  }
  receiver = accountKeys[keys[receiverIndex]]

  // Calculate the value to send
  let frontier = null
  let balance = null
  if (sender.balance === null || sender.previous === null) {
    let val = await RPC.account(sender.privateKey).info()
    if (val.error) {
      balance = '0'
      frontier = '0000000000000000000000000000000000000000000000000000000000000000'
    } else {
      balance = val.balance
      frontier = val.frontier
    }
  } else {
    balance = sender.balance
    frontier = sender.previous
  }
  // Take balance in reason subtract transaction fee and then divide by a random number 1-50
  let sendAmount = bigInt(balance).minus(bigInt(networkFee)).divide(Math.floor(Math.random() * Math.floor(10)) + 1)
  if (sendAmount.greater(seedMoney)) {
    sendAmount = seedMoney
  } else if (sendAmount.lesserOrEquals(0)) {
    // console.log('Skipping Empty account')
    return
  }

  // Determine the proper delegate to send to
  let delegateId = null
  if (frontier !== '0000000000000000000000000000000000000000000000000000000000000000') {
    delegateId = parseInt(frontier.slice(-2), 16) % 32
  } else {
    delegateId = parseInt(sender.publicKey.slice(-2), 16) % 32
  }
  RPC.changeServer(`http://${config.delegates[delegateId]}:55000`)

  // Send block to the delegate
  sender.pending = true
  let block = await RPC.account(sender.privateKey).send(sendAmount, receiver.address, frontier, 'reason')
  //   console.log(`Hash: ${block.hash}
  // Sent ${RPC.convert.fromReason(sendAmount, 'LOGOS')}λ
  // From ${sender.address}
  // To ${receiver.address}
  // ========================`)
  if (block.hash) {
    // Successful sent into consensus
    sender.balance = bigInt(balance).minus(sendAmount).minus(networkFee).toString()
    totalFeesPaid = totalFeesPaid.plus(networkFee)
    receiver.balance = bigInt(receiver.balance).plus(sendAmount).toString()
    sender.previous = block.hash
    client.set('accountKeys', JSON.stringify(accountKeys))
  }
}
let continueLoop = true
const loop = () => {
  let rand = Math.round(Math.random() * config.fakeTransactionsMaximumInterval) + config.fakeTransactionsMinimumInterval
  setTimeout(() => {
    sendFakeTransaction()
    if (continueLoop) loop()
  }, rand)
}
const watchTPS = () => {
  setTimeout(() => {
    console.log(`TPS: ${transactionCountLastSecond} | Accounts: ${keys.length}`)
    transactionCountLastSecond = 0
    if (continueLoop) watchTPS()
  }, 1000)
}
if (config.fakeTransactions) {
  setTimeout(() => {
    loop()
    watchTPS()
  }, 5000)
}
// Want to notify before shutting down
const handleAppExit = (options, err) => {
  console.log(`Thanks for using the Logos Stress Tester you burnt ${RPC.convert.fromReason(totalFeesPaid, 'LOGOS')}λ in fees`)
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
configureSignals()
connectMQTT()
