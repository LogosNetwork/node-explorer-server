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
          resolve(batchBlock)
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
        resolve(block)
      } else {
        reject("Record already exists!")
      }
    })
    .catch((err) => {
      reject(err)
    })
  })
}
methods.createDelegate = (data) => {
  return new Promise((resolve, reject) => {
    models.delegate
    .findOrCreate({
      where: {
        account: {
          [Op.eq]: data.account
        }
      },
      defaults: data
    })
    .spread((delegate, created) => {
      if (created) {
        resolve(delegate)
      } else {
        reject("Record already exists!")
      }
    })
    .catch((err) => {
      reject(err)
    })
  })
}
methods.createSend = (data) => {
  return new Promise((resolve, reject) => {
    models.send
    .create(data)
    .then((send) => {
      resolve(send)
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
        resolve(microEpoch)
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
        resolve(epoch)
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
          },
          include: [{
            model: models.send,
            as: 'transactions'
          }]
        }
      )
      .then((blocks) => {
        if (!blocks) { return reject('Could not get any blocks') }
        resolve(blocks)
      })
      .catch((err) => {
        return reject(err) 
      })
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
          limit:1,
          include: [{
            model: models.block,
            as: 'blocks'
          }]
        }
      )
      .then((blocks) => {
        if (!blocks) { return reject('Could not get any blocks') }
        resolve(blocks)
      })
      .catch((err) => { return reject(err) })
  })
}

methods.getBatchBlock = (hash) => {
  return new Promise((resolve, reject) => {
    models.batchBlock
      .findOne(
        {
          where: {
            hash: hash
          }
        }
      )
      .then((batchBlock) => {
        resolve(batchBlock)
      })
      .catch((err) => { return reject(err) })
  })
}

methods.getBlock = (hash) => {
  return new Promise((resolve, reject) => {
    models.block
      .findOne(
        {
          where: {
            hash: hash
          }
        }
      )
      .then((block) => {
        resolve(block)
      })
      .catch((err) => { return reject(err) })
  })
}

methods.getMicroEpoch = (hash) => {
  return new Promise((resolve, reject) => {
    models.microEpoch
      .findOne(
        {
          where: {
            hash: hash
          }
        }
      )
      .then((microEpoch) => {
        resolve(microEpoch)
      })
      .catch((err) => { return reject(err) })
  })
}

methods.getEpoch = (hash) => {
  return new Promise((resolve, reject) => {
    models.epoch
      .findOne(
        {
          where: {
            hash: hash
          }
        }
      )
      .then((epoch) => {
        resolve(epoch)
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
