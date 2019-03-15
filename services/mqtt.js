let methods = {}
const mqtt = require('mqtt')
const config = require('../config.json')
const blocks = require('./blocks')
const EMPTYHEX = '0000000000000000000000000000000000000000000000000000000000000000'
const LogosWallet = require('@logosnetwork/logos-webwallet-sdk')
const Utils = LogosWallet.LogosUtils
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
          } else if ((request.type === 'revoke' || request.type === 'withdraw_fee' || request.type === 'distribute') && request.transaction) {
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
            if (request.origin !== request.transaction.destination &&
              Utils.accountFromHexKey(request.token_id) !== request.transaction.destination) {
              publish(`account/${request.controller.account}`, request)
            }
            blocks.updateTokenController(request)
          } else if (request.type === 'burn') {
            blocks.burnTokens(request)
          }
        }).catch((err) => {
          console.log(err)
        })
      }
    }).catch((err) => {
      console.log(err)
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
      console.log(err)
    })
  } else if (mqttMessage.type === "Epoch") {
    let prevEpoch = await blocks.getEpoch(mqttMessage.previous)
    if (mqttMessage.previous !== EMPTYHEX && prevEpoch) {
      mqttMessage.prevHash = mqttMessage.previous
    }
    blocks.createEpoch(mqttMessage).then(async (epoch) => {
      publish(`epoch`, mqttMessage)
      let microEpoch = await blocks.getMicroEpoch(mqttMessage.micro_block_tip)
      if (mqttMessage.micro_block_tip !== EMPTYHEX && microEpoch) {
        microEpoch.update({
          microBlockTipHash: mqttMessage.hash
        })
      }
      for (let delegate of mqttMessage.delegates) {
        delegate.epochHash = mqttMessage.hash
        blocks.createDelegate(delegate).then().catch((err) => {
          console.log(err)
        })
      }
    }).catch((err) => {
      console.log(err)
    })
  }
}

methods.handleRequestBlock = request => {
  if (request.type === 'send' && request.transactions) {
    for (let transaction of request.transactions) {
      transaction.requestHash = request.hash
      blocks.createSend(transaction).then((dbSend) => {
        publish(`account/${transaction.destination}`, request)
      })
    }
  }
}

module.exports = methods