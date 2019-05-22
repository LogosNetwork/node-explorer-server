let methods = {}
const mqtt = require('mqtt')
const config = require('../config.json')
const blocks = require('./blocks')
const EMPTYHEX = '0000000000000000000000000000000000000000000000000000000000000000'
const LogosWallet = require('@logosnetwork/logos-webwallet-sdk')
const Utils = LogosWallet.Utils
const Logos = require('@logosnetwork/logos-rpc-client')
const CronJob = require('cron').CronJob
const moment = require('moment')
const isEqual = require('lodash.isequal');
let currentDelegates = null
let nextDelegates = null
let cron = null
let playHooky = false
let options = {
  url: `http://${config.rpcNodeURL}:55000`
}
if (config.proxyURL) {
  options.proxyURL = config.proxyURL
}
const RPC = new Logos(options)
// MQTT Client
let mqttClient = null
const publish = (topic, payload) => {
  mqttClient.publish(topic, JSON.stringify(payload), config.mqtt.block.opts)
}

methods.initMQTTClient = () => {
  mqttClient = mqtt.connect(config.mqtt.url, config.mqtt.options)
  mqttClient.on('connect', () => {
    console.log('RPC Webhook connected to MQTT server')
  })
}

methods.endClient = () => {
  if (mqttClient) {
    mqttClient.end(true)
  }
}

methods.handleMessage = async (mqttMessage) => {
  if (mqttMessage.type === "RequestBlock") {
    let prevRequestBatch = await blocks.getRequestBlock(mqttMessage.previous)
    if (mqttMessage.previous !== EMPTYHEX && prevRequestBatch) {
      mqttMessage.prevHash = mqttMessage.previous
    }
    blocks.createRequestBlock(mqttMessage).then(async (requestBlock) => {
      publish(`requestBlock/${mqttMessage.delegate}`, mqttMessage)
      for (let request of mqttMessage.requests) {
        request.timestamp = mqttMessage.timestamp
        publish(`request/${request.hash}`, request)
        request.requestBlockHash = mqttMessage.hash
        let prevRequest = await blocks.getRequest(request.previous) 
        if (request.previous !== EMPTYHEX && prevRequest) {
          request.prevHash = request.previous
        }
        blocks.createRequest(request).then((dbBlock) => {
          // Broadcast the request to the origin and token account
          publish(`account/${request.origin}`, request)
          if (request.token_id) publish(`account/${Utils.accountFromHexKey(request.token_id)}`, request)
          
          // Handle Database Request Types
          if ((request.type === 'send' || request.type === 'token_send') && request.transactions) {
            let publishedAccounts = []
            for (let transaction of request.transactions) {
              if (request.type === 'send' &&
                request.origin !== transaction.destination &&
                !publishedAccounts.includes(transaction.destination)) {
                  publish(`account/${transaction.destination}`, request)
                  publishedAccounts.push(transaction.destination)
              } else if (request.type === 'token_send' &&
                request.origin !== transaction.destination &&
                Utils.accountFromHexKey(request.token_id) !== transaction.destination &&
                !publishedAccounts.includes(transaction.destination)) {
                  publish(`account/${transaction.destination}`, request)
                  publishedAccounts.push(transaction.destination)
              }
            }
          } else if (request.type === 'change') {
            // Not yet implemented
          } else if (request.type === 'issuance') {
            blocks.createToken(request)
          } else if (request.type === 'issue_additional') {
            blocks.issueTokens(request)
          } else if (request.type === 'change_setting') {
            blocks.changeTokenSetting(request)
          } else if (request.type === 'immute_setting') {
            blocks.immuteTokenSetting(request)
          } else if ((request.type === 'revoke' || request.type === 'withdraw_fee' || request.type === 'distribute' || request.type === 'withdraw_logos') && request.transaction) {
            if (request.origin !== request.transaction.destination &&
              Utils.accountFromHexKey(request.token_id) !== request.transaction.destination) {
              publish(`account/${request.transaction.destination}`, request)
            }
          } else if (request.type === 'adjust_user_status' && request.account) {
            if (request.origin !== request.transaction.destination &&
              Utils.accountFromHexKey(request.token_id) !== request.transaction.destination) {
              publish(`account/${request.transaction.account}`, request)
            }
          } else if (request.type === 'adjust_fee') {
            blocks.adjustTokenFee(request)
          } else if (request.type === 'update_issuer_info') {
            blocks.updateTokenInfo(request)
          } else if (request.type === 'update_controller') {
            if (request.origin !== request.controller.account &&
              Utils.accountFromHexKey(request.token_id) !== request.controller.account) {
              publish(`account/${request.controller.account}`, request)
            }
            blocks.updateTokenController(request)
          } else if (request.type === 'burn') {
            blocks.burnTokens(request)
          }
        }).catch((err) => {
          // console.log(err)
        })
      }
    }).catch((err) => {
      // console.log(err)
    })
  } else if (mqttMessage.type === "MicroBlock") {
    let prevMicroEpoch = await blocks.getMicroEpoch(mqttMessage.previous)
    if (mqttMessage.previous !== EMPTYHEX && prevMicroEpoch) {
      mqttMessage.prevHash = mqttMessage.previous
    }
    blocks.createMicroEpoch(mqttMessage).then(async (microEpoch) => {
      for (let tip of mqttMessage.tips) {
        let requestBlockTip = await blocks.getRequestBlock(tip)
        if (tip !== EMPTYHEX && requestBlockTip) {
          requestBlockTip.update({
            microEpochHash: mqttMessage.hash
          })
        }
      }
      publish(`microEpoch`, mqttMessage)
    }).catch((err) => {
      // console.log(err)
    })
  } else if (mqttMessage.type === "Epoch") {
    let prevEpoch = await blocks.getEpoch(mqttMessage.previous)
    if (mqttMessage.previous !== EMPTYHEX && prevEpoch) {
      mqttMessage.prevHash = mqttMessage.previous
    }
    blocks.createEpoch(mqttMessage).then(async (epoch) => {
      methods.getDelegates(true)
      publish(`epoch`, mqttMessage)
      let microEpoch = await blocks.getMicroEpoch(mqttMessage.micro_block_tip)
      if (mqttMessage.micro_block_tip !== EMPTYHEX && microEpoch) {
        microEpoch.update({
          microBlockTipHash: mqttMessage.hash
        })
      }
      for (let messageDelegate of mqttMessage.delegates) {
        messageDelegate.epochHash = mqttMessage.hash
        blocks.createDelegate(messageDelegate).then().catch((err) => {
          // console.log(err)
        })
      }
    }).catch((err) => {
      // console.log(err)
    })
  }
}

methods.currentDelegates = async () => {
  if (!currentDelegates) {
    let delegates = await methods.getDelegates()
    return delegates
  } else {
    return currentDelegates
  }
}

methods.nextDelegates = () => {
  return nextDelegates
}

methods.getDelegates = async (force = false) => {
  let delegates = null
  if (currentDelegates && !force) {
    delegates = currentDelegates
  } else {
    delegates = await methods.requestCurrentDelegates()
  }
  let futureDelegates = null
  if (nextDelegates && !force) {
    futureDelegates = nextDelegates
  } else {
    futureDelegates = await methods.requestFutureDelegates()
  }
  if (!currentDelegates) currentDelegates = delegates
  if (!nextDelegates) nextDelegates = futureDelegates
  if (!isEqual(currentDelegates, delegates)) {
    console.warn('Epoch triggered new current delegate list / Cron must of failed')
    currentDelegates = delegates
    publish(`delegateChange`, currentDelegates)
  }
  if (!isEqual(nextDelegates, futureDelegates)) {
    console.warn('Epoch triggered new future delegate list / Cron must of failed')
    nextDelegates = futureDelegates
  }

  return {
    current: delegates,
    next: futureDelegates
  }
}

methods.requestCurrentDelegates = async () => {
  delegates = await RPC.epochs.delegateIPs()
  for (let index in delegates) {
    delegates[index] = config.potentialDelegates[delegates[index]['ip']]
  }
  return delegates
}

methods.requestFutureDelegates = async () => {
  futureDelegates = await RPC.epochs.delegateIPs('next')
  for (let index in futureDelegates) {
    futureDelegates[index] = config.potentialDelegates[futureDelegates[index]['ip']]
  }
  return futureDelegates
}

const createEpochCron = () => {
  return new CronJob('59 11,23 * * *', () => {
    if (!playHooky) {
      setTimeout(async () => {
        if (nextDelegates === null) {
          nextDelegates = await methods.requestFutureDelegates
        }
        if (!isEqual(currentDelegates, nextDelegates)) {
          methods.publish(`delegateChange`, nextDelegates)
        }
        currentDelegates = nextDelegates
        nextDelegates = null
      }, 30000)
    } else {
      playHooky = false
    }
  }, null, true, 'UTC')
}

methods.initalizeEpochTimers = async () => {
  cron = createEpochCron()
  let latestEpochs = await RPC.epochs.history(1)
  if (latestEpochs.epochs[0].timestamp === '0') {
    if (config.startTime) {
      let firstEpochTime = moment.unix(config.startTime)
      firstEpochTime.utc()
      firstEpochTime.second(0)
      firstEpochTime.minute(0)
      if (firstEpochTime.hour() >= 12) {
        firstEpochTime.add(1, 'd')
        firstEpochTime.hour(0)
      } else {
        firstEpochTime.hour(12)
      }
      playHooky = moment().isBefore(firstEpochTime)
    } else {
      console.warn(`No startTime in the config and gensis has just occured! Can't start the epoch timer!`)
    }
  }
  if (cron) {
    if (playHooky) {
      console.info(`Skipping One Epoch, Next Epoch At: ${cron.nextDates(2)[1].local().format('ddd, D MMM YYYY h:mma')}`)
    } else {
      console.info(`Next Epoch At: ${cron.nextDates(1)[0].local().format('ddd, D MMM YYYY h:mma')}`)
    }
  }
}

module.exports = methods