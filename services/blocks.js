let methods = {}
const models = require('../models')

methods.createBatchBlock = (data) => {
  return new Promise((resolve, reject) => {
    models.batchBlock
      .create(data)
      .then((batchBlock) => {
        resolve(batchBlock.dataValues)
      })
      .catch((err) => {
        reject(err)
      })
  })
}
methods.createMicroEpoch = (data) => {
  return new Promise((resolve, reject) => {
    models.microEpoch
      .create(data)
      .then((microEpoch) => {
        resolve(microEpoch.dataValues)
      })
      .catch((err) => {
        reject(err)
      })
  })
}
methods.createEpoch = (data) => {
  return new Promise((resolve, reject) => {
    models.epoch
      .create(data)
      .then((epoch) => {
        resolve(epoch.dataValues)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

module.exports = methods
