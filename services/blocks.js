let methods = {}
const models = require('../models')
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

methods.createRequestBlock = (data) => {
  return new Promise((resolve, reject) => {
    models.requestBlock
      .findOrCreate({
       where: {
         hash: {
           [Op.eq]: data.hash
         }
       },
       defaults: data
      })
      .spread((requestBlock, created) => {
        if (created) {
          resolve(requestBlock)
        } else {
          reject("Record already exists!")
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
methods.createRequest = (data) => {
  return new Promise((resolve, reject) => {
    models.request
    .findOrCreate({
      where: {
        hash: {
          [Op.eq]: data.hash
        }
      },
      defaults: data
    })
    .spread((request, created) => {
      if (created) {
        resolve(request)
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

methods.findMostRecentRequestBlock = (data) => {
  return new Promise((resolve, reject) => {
    models.requestBlock
      .findAll(
        {
          order: [
            ['createdAt', 'DESC']
          ],
          limit:1,
          include: [{
            model: models.request,
            as: 'requests'
          }]
        }
      )
      .then((blocks) => {
        if (!blocks) { return reject('Could not get any requests') }
        resolve(blocks)
      })
      .catch((err) => { return reject(err) })
  })
}

methods.getRequestBlock = (hash) => {
  return new Promise((resolve, reject) => {
    models.requestBlock
      .findOne(
        {
          where: {
            hash: hash
          }
        }
      )
      .then((requestBlock) => {
        resolve(requestBlock)
      })
      .catch((err) => { return reject(err) })
  })
}

methods.getRequest = (hash) => {
  return new Promise((resolve, reject) => {
    models.request
      .findOne(
        {
          where: {
            hash: hash
          }
        }
      )
      .then((request) => {
        resolve(request)
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

methods.requestBlocks = (previousDate = null, count = 50) => {
  return new Promise((resolve, reject) => {
    if (previousDate === null) {
      models.requestBlock
      .findAll(
        {
          order: [
            ['createdAt', 'DESC']
          ],
          limit:count
        }
      )
      .then((requestBlocks) => {
        if (!requestBlocks) { return reject('Could not get any request blocks') }
        resolve(requestBlocks)
      })
      .catch((err) => { return reject(err) })
    } else {
      models.requestBlock
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
      .then((requestBlocks) => {
        if (!requestBlocks) { return reject('Could not get any request blocks') }
        resolve(requestBlocks)
      })
      .catch((err) => { return reject(err) })
    }
  })
}

methods.requests = (previousDate = null, count = 50) => {
  return new Promise((resolve, reject) => {
    if (previousDate === null) {
      models.request
      .findAll(
        {
          order: [
            ['createdAt', 'DESC']
          ],
          limit:count,
          include: [{
            model: models.send,
            as: 'transactions'
          }]
        }
      )
      .then((requests) => {
        if (!requests) { return reject('Could not get any requests') }
        resolve(requests)
      })
      .catch((err) => { return reject(err) })
    } else {
      models.request
      .findAll(
        {
          where: {
            createdAt: { [Op.lt]: previousDate }
          },
          order: [
            ['createdAt', 'DESC']
          ],
          limit:count,
          include: [{
            model: models.send,
            as: 'transactions'
          }]
        }
      )
      .then((requests) => {
        if (!requests) { return reject('Could not get any requests') }
        resolve(requests)
      })
      .catch((err) => { return reject(err) })
    }
  })
}

module.exports = methods
