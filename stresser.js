const LogosWallet = require('@logosnetwork/logos-webwallet-sdk')
const mqtt = require('mqtt')
const bigInt = require('big-integer')
let totalCount = 0
let transactionCountLastSecond = 0
let peakTPS = 0
let transactionCountLastFiveSeconds = 0
let transactionCountLast30Seconds = 0
let spammerPrivateKey = '043B086F030037A6066AEE4B33F6DE1B1ED8CDA2C63B82DB1148E050853A02EB'
let spamAccounts = 1000
// MQTT Client
let mqttClient = null
const connectMQTT = () => {
  mqttClient = mqtt.connect('wss:pla.bs:8443')
  mqttClient.on('connect', () => {
    console.log('RPC Callback connected to MQTT server')
    mqttClient.subscribe('transaction/#', (err) => {
      if (!err) {
        console.log(`subscribed to transaction/#`)
      } else {
        console.log(err)
      }
    })
  })

  // Listen for confirmation
  mqttClient.on('message', (topic, message) => {
    message = JSON.parse(message.toString())
    transactionCountLastSecond++
    transactionCountLastFiveSeconds++
    totalCount++
    transactionCountLast30Seconds++
  })
}

const start = async function() {
  const Wallet = LogosWallet.Wallet
  let wallet = new Wallet({
      password: 'password', // Make this strong
      autoBatchSends: true
  });
  let myRPC = wallet.rpc
  myRPC.proxy = false
  wallet.rpc = myRPC
  let loadAccount = await wallet.createAccount({
      privateKey: spammerPrivateKey
  });
  console.log('creating accounts')
  let totalFees = bigInt(spamAccounts+1).times(bigInt('10000000000000000000000'))
  let splitBalance = bigInt(loadAccount.balance).minus(totalFees).divide(spamAccounts+1)
  console.log('start')
  for (let i = 0; i < spamAccounts; i++) {
    console.log(`Creating ${i}`)
    let account = await wallet.createAccount({
      index: i
    })
    loadAccount.createSend([{
      target: account.address,
      amount: splitBalance
    }], true, wallet.rpc)
    console.log(`Sent to ${i}`)
  }
  let accounts = wallet.accounts
  waitForSpam = () => {
    if (bigInt(accounts[0].balance).greater(splitBalance.times(bigInt(2)))) {
      console.log('waiting')
      setTimeout(waitForSpam, 500)
    } else {
      console.log('SPAMMING')
      spam()
    }
  }
  spam = () => {
    for (let i = 0; i < accounts.length; i++) {
      console.log(i)
      let sender = accounts[i]
      let receiver = null
      if (accounts.length < i+1) {
        receiver = accounts[i+1]
      } else {
        receiver = accounts[0]
      }
      try {
        sender.createSend([{
          target: receiver.address,
          amount: '1'
        }], true, wallet.rpc)
      } catch (error) {
        console.log(`Send failed from ${sender.address} to ${receiver.address}`)
        console.log(error)
      }
    }
    console.log(`Spam Started ${Date.now()}`)
  }
  waitForSpam()
}
const watchTPS = () => {
  setTimeout(() => {
    console.log(`TPS: ${transactionCountLastSecond}`)
    if (transactionCountLastSecond > peakTPS) peakTPS = transactionCountLastSecond
    transactionCountLastSecond = 0
    watchTPS()
  }, 1000)
}
const watchTPFive = () => {
  setTimeout(() => {
    console.log(`TP Five: ${Math.floor(transactionCountLastFiveSeconds / 5)}`)
    transactionCountLastFiveSeconds = 0
    watchTPFive()
  }, 5000)
}
const watchTPThirty = () => {
  setTimeout(() => {
    console.log(`TP Thirty: ${Math.floor(transactionCountLast30Seconds / 30)}`)
    transactionCountLast30Seconds = 0
    watchTPThirty()
  }, 30000)
}

// Want to notify before shutting down
const handleAppExit = (options, err) => {
  console.log(`Thanks for using the Logos Stress Tester you sent ${totalCount} transactions peak TPS was ${peakTPS}`)
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
setTimeout(() => {
  watchTPS()
  watchTPFive()
  watchTPThirty()
  start()
}, 1000)