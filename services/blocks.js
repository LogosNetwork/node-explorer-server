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
        if (created) {
          resolve(batchBlock.dataValues)
        } else {
          reject("Record already exists!")
        }
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
      if (created) {
        resolve(block.dataValues)
      } else {
        reject("Record already exists!")
      }
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
      if (created) {
        resolve(microEpoch.dataValues)
      } else {
        reject("Record already exists!")
      }
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
      if (created) {
        resolve(epoch.dataValues)
      } else {
        reject("Record already exists!")
      }
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

methods.findMostRecentBatchBlock = (data) => {
  return new Promise((resolve, reject) => {
    models.batchBlock
      .findAll(
        {
          order: [
            ['createdAt', 'DESC']
          ],
          limit:1
        }
      )
      .then((blocks) => {
        if (!blocks) { return reject('Could not get any blocks') }
        resolve(blocks)
      })
      .catch((err) => { return reject(err) })
  })
}

methods.batchBlocks = (previousDate = null, count = 50) => {
  return new Promise((resolve, reject) => {
    if (previousDate === null) {
      models.batchBlock
      .findAll(
        {
          order: [
            ['createdAt', 'DESC']
          ],
          limit:count
        }
      )
      .then((blocks) => {
        if (!blocks) { return reject('Could not get any blocks') }
        resolve(blocks)
      })
      .catch((err) => { return reject(err) })
    } else {
      models.batchBlock
      .findAll(
        {
          where: {
            createdAt: { [Op.lt]: previousDate }
          },
          order: [
            ['createdAt', 'DESC']
          ],
          limit:count
        }
      )
      .then((blocks) => {
        if (!blocks) { return reject('Could not get any blocks') }
        resolve(blocks)
      })
      .catch((err) => { return reject(err) })
    }
  })
}

module.exports = methods
