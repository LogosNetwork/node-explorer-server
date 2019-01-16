const config = require('./config.json')
const redis = require('redis')
const client = redis.createClient()
const Logos = require('@logosnetwork/logos-rpc-client')
const RPC = new Logos({ url: `http://${config.delegates[0]}:55000`, debug: false })
const bigInt = require('big-integer')
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
})
const oneThousandLogos = RPC.convert.toReason(1000, 'LOGOS')
const networkFee = '10000000000000000000000'
let totalFeesPaid = bigInt(0)
const sendFakeTransaction = async () => {
  let senderIndex = 0
  let receiverIndex = 0
  let sender = null
  let receiver = null

  // Calculate who the sender is
  // Pull from fake accounts 80% of the time all the time
  if (Math.random() > 0.2) {
    // Select an existing fake account at random
    if (keys.length > 1) {
      senderIndex = Math.floor(Math.random() * Math.floor(keys.length - 1)) + 1
    }
  }
  sender = accountKeys[keys[senderIndex]]
  if (sender.pending) {
    console.log('This account is still processing a transaction')
    return
  }

  // Calculate who the receiver is
  // Use fake accounts 95% of the time all the time
  if (Math.random() > 0.05) {
    // Generate a new account 20% of the time
    if (Math.random() > 0.8) {
      // Generate a new account
      let account = await RPC.key.create()
      account.balance = '0'
      account.previous = '0000000000000000000000000000000000000000000000000000000000000000'
      accountKeys[account.address] = account
      keys.push(account.address)
      receiverIndex = keys.length - 1
    } else {
      // Select an existing fake account at random
      if (keys.length > 1) {
        receiverIndex = Math.floor(Math.random() * Math.floor(keys.length - 1)) + 1
      }
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
  let sendAmount = bigInt(balance).minus(bigInt(networkFee)).divide(Math.floor(Math.random() * Math.floor(50)) + 1)
  // If sendAmount is greater than 1000 just send 1000.
  if (sendAmount.greater(oneThousandLogos)) {
    sendAmount = oneThousandLogos
  } else if (sendAmount.lesserOrEquals(0)) {
    console.log('Skipping Empty account')
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
  sender.balance = bigInt(balance).minus(sendAmount).minus(networkFee).toString()
  totalFeesPaid = totalFeesPaid.plus(networkFee)
  receiver.balance = bigInt(receiver.balance).plus(sendAmount).toString()
  sender.previous = block.hash
  console.log(`Hash: ${block.hash}
  Sent ${RPC.convert.fromReason(sendAmount, 'LOGOS')} Logos
  From ${sender.address}
  To ${receiver.address}
  ========================`)
  if (block.hash) sender.pending = false
  client.set('accountKeys', JSON.stringify(accountKeys))
}

const loop = () => {
  let rand = Math.round(Math.random() * config.fakeTransactionsMaximumInterval) + config.fakeTransactionsMinimumInterval
  setTimeout(() => {
    sendFakeTransaction()
    loop()
  }, rand)
}
if (config.fakeTransactions) {
  loop()
}
