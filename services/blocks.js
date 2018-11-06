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
methods.createBlock = (data) => {
  return new Promise((resolve, reject) => {
    models.block
      .create(data)
      .then((block) => {
        resolve(block.dataValues)
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

methods.findAllTransactions = (data) => {
  return new Promise((resolve, reject) => {
    if (!data.page || data.page === null) {
      data.page = 0
    }
    if (!data.hash || data.hash === null) {
      data.hash = ""
    }
    models.block
      .findAll(
        {
          offset:data.page*50,
          limit:50,
          where: {
            hash: {
              [Op.like]: '%'+data.hash+'%'
            }
          }
        }
      )
      .then((blocks) => {
        if (!blocks) { return reject('Could not get any blocks') }
        resolve(blocks)
      })
      .catch((err) => { return reject(err) })
  })
}

module.exports = methods
