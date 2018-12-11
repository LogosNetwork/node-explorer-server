let methods = {}
const models = require('../models')
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

methods.createBatchBlock = (data) => {
  return new Promise((resolve, reject) => {
    models.batchBlock
      .findOrCreate({
       where: {
         hash: {
           [Op.eq]: data.hash
         }
       },
       defaults: data
      })
      .spread((batchBlock, created) => {
        console.log(batchBlock)
        console.log(created)
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
    .findOrCreate({
      where: {
        hash: {
          [Op.eq]: data.hash
        }
      },
      defaults: data
    })
    .spread((block, created) => {
      console.log(block)
      console.log(created)
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
    .findOrCreate({
      where: {
        hash: {
          [Op.eq]: data.hash
        }
      },
      defaults: data
    })
    .spread((microEpoch, created) => {
      console.log(microEpoch)
      console.log(created)
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
    .findOrCreate({
      where: {
        hash: {
          [Op.eq]: data.hash
        }
      },
      defaults: data
    })
    .spread((epoch, created) => {
      console.log(epoch)
      console.log(created)
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
          order: [
            ['createdAt', 'DESC']
          ],
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
