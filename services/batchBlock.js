let methods = {}
const models = require('../models')

methods.create = (data) => {
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

module.exports = methods
