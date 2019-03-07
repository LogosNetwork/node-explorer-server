let methods = {}
const mqtt = require('mqtt')
const config = require('../config.json')
const blocks = require('./blocks')
const EMPTYHEX = '0000000000000000000000000000000000000000000000000000000000000000'

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

methods.handleMessage = async (request) => {
  if (request.type === "RequestBlock") {
    let prevRequestBatch = await blocks.getRequestBlock(request.previous)
    if (request.previous !== EMPTYHEX && prevRequestBatch) {
      request.prevHash = request.previous
    }
    blocks.createRequestBlock(request).then(async (requestBlock) => {
      publish(`requestBlock/${request.delegate}`, request)
      for (let request of request.requests) {
        request.timestamp = request.timestamp
        publish(`request/${request.hash}`, request)
        request.requestBlockHash = request.hash
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
          } else if (request.type === 'change') {
            // Not yet implemented
          } else if (request.type === 'issuance') {
            // Kill me
          } else if (request.type === 'issue_additional') {
            
          } else if (request.type === 'change_setting') {
            
          } else if (request.type === 'immute_setting') {

          } else if (request.type === 'revoke') {

          } else if (request.type === 'adjust_user_status') {

          } else if (request.type === 'adjust_fee') {

          } else if (request.type === 'update_issuer_info') {

          } else if (request.type === 'update_controller') {

          } else if (request.type === 'burn') {

          } else if (request.type === 'distribute') {

          } else if (request.type === 'withdraw_fee') {

          } else if (request.type === 'token_send') {

          }
        }).catch((err) => {
          console.log(err)
        })
      }
    }).catch((err) => {
      console.log(err)
    })
  } else if (request.type === "MicroBlock") {
    let prevMicroEpoch = await blocks.getMicroEpoch(request.previous)
    if (request.previous !== EMPTYHEX && prevMicroEpoch) {
      request.prevHash = request.previous
    }
    blocks.createMicroEpoch(request).then(async (microEpoch) => {
      for (let tip of request.tips) {
        let requestBlockTip = await blocks.getRequestBlock(tip)
        if (tip !== EMPTYHEX && requestBlockTip) {
          requestBlockTip.update({
            microEpochHash: request.hash
          })
        }
      }
      publish(`microEpoch`, request)
    }).catch((err) => {
      console.log(err)
    })
  } else if (request.type === "Epoch") {
    let prevEpoch = await blocks.getEpoch(request.previous)
    if (request.previous !== EMPTYHEX && prevEpoch) {
      request.prevHash = request.previous
    }
    blocks.createEpoch(request).then(async (epoch) => {
      publish(`epoch`, request)
      let microEpoch = await blocks.getMicroEpoch(request.micro_block_tip)
      if (request.micro_block_tip !== EMPTYHEX && microEpoch) {
        microEpoch.update({
          microBlockTipHash: request.hash
        })
      }
      for (let delegate of request.delegates) {
        delegate.epochHash = request.hash
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