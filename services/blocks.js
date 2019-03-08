let methods = {}
const models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const bigInt = require('big-integer')
const tokenSettings = [
  'issuance',
  'modify_issuance',
  'revoke',
  'modify_revoke',
  'freeze',
  'modify_freeze',
  'adjust_fee',
  'modify_adjust_fee',
  'whitelist',
  'modify_whitelist'
]
methods.createToken = data => {
  return new Promise((resolve, reject) => {
    models.token
    .create(data)
    .then((send) => {
      resolve(send)
    })
    .catch((err) => {
      reject(err)
    })
  })
}
methods.burnTokens = data => {
  return new Promise((resolve, reject) => {
    models.token
    .findOne({
      where: {
        token_id: {
          [Op.eq]: data.token_id
        }
      }
    })
    .then((token) => {
      token.total_supply = bigInt(token.dataValues.total_supply).minus(bigInt(data.amount)).toString()
      token.save().then(() => {
        resolve(token)
      }).catch((err) => {
        reject(err)
      })
    }).catch((err) => {
      reject(err)
    })
  })
}
methods.issueTokens = data => {
  return new Promise((resolve, reject) => {
    models.token
    .findOne({
      where: {
        token_id: {
          [Op.eq]: data.token_id
        }
      }
    })
    .then((token) => {
      token.total_supply = bigInt(token.dataValues.total_supply).plus(bigInt(data.amount)).toString()
      token.save().then(() => {
        resolve(token)
      }).catch((err) => {
        reject(err)
      })
    }).catch((err) => {
      reject(err)
    })
  })
}
methods.adjustTokenFee = data => {
  return new Promise((resolve, reject) => {
    models.token
    .findOne({
      where: {
        token_id: {
          [Op.eq]: data.token_id
        }
      }
    })
    .then((token) => {
      token.token_fee = data.token_fee
      token.token_rate = data.token_rate
      token.save().then(() => {
        resolve(token)
      }).catch((err) => {
        reject(err)
      })
    }).catch((err) => {
      reject(err)
    })
  })
}
methods.updateTokenInfo = data => {
  return new Promise((resolve, reject) => {
    models.token
    .findOne({
      where: {
        token_id: {
          [Op.eq]: data.token_id
        }
      }
    })
    .then((token) => {
      token.issuer_info = data.new_info
      token.save().then(() => {
        resolve(token)
      }).catch((err) => {
        reject(err)
      })
    }).catch((err) => {
      reject(err)
    })
  })
}
methods.changeTokenSetting = data => {
  return new Promise((resolve, reject) => {
    models.token
    .findOne({
      where: {
        token_id: {
          [Op.eq]: data.token_id
        }
      }
    })
    .then((token) => {
      let settings = token.dataValues.settings
      if (data.value === "false") {
        let newSettings = settings.filter(setting => {
          return setting !== data.setting
        })
        token.settings = newSettings
        token.save().then(() => {
          resolve(token)
        }).catch((err) => {
          reject(err)
        })
      } else if (data.value === "true") {
        let newSettings = tokenSettings.filter(setting => {
          return settings.indexOf(setting) !== -1 || setting === newSetting
        })
        token.settings = newSettings
        token.save().then(() => {
          resolve(token)
        }).catch((err) => {
          reject(err)
        })
      }
    }).catch((err) => {
      reject(err)
    })
  })
}
methods.immuteTokenSetting = data => {
  return new Promise((resolve, reject) => {
    models.token
    .findOne({
      where: {
        token_id: {
          [Op.eq]: data.token_id
        }
      }
    })
    .then((token) => {
      let settings = token.dataValues.settings
      let immuteSetting = "modify_"+data.setting
      let newSettings = settings.filter(setting => {
        return setting !== immuteSetting
      })
      token.settings = newSettings
      token.save().then(() => {
        resolve(token)
      }).catch((err) => {
        reject(err)
      })
    }).catch((err) => {
      reject(err)
    })
  })
}
methods.updateTokenController = data => {
  return new Promise((resolve, reject) => {
    models.token
    .findOne({
      where: {
        token_id: {
          [Op.eq]: data.token_id
        }
      }
    })
    .then((token) => {
      let controllers = token.dataValues.controllers
      if (data.action === 'remove') {
        let newControllers = controllers.filter(controller => {
          return controller.account !== data.controller.account
        })
        token.controllers = newControllers
        token.save().then(() => {
          resolve(token)
        }).catch((err) => {
          reject(err)
        })
      } else if (data.action === 'true') {
        let newControllers = controllers.filter(controller => {
          return controller.account !== data.controller.account
        })
        newControllers.push(data.controller)
        token.controllers = newControllers
        token.save().then(() => {
          resolve(token)
        }).catch((err) => {
          reject(err)
        })
      }
    }).catch((err) => {
      reject(err)
    })
  })
}
methods.createRequestBlock = data => {
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
methods.createRequest = data => {
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
methods.createDelegate = data => {
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
methods.createMicroEpoch = data => {
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

methods.findMostRecentRequestBlock = () => {
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

methods.getRequestBlock = hash => {
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

methods.getRequest = hash => {
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

methods.getMicroEpoch = hash => {
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

methods.getEpoch = hash => {
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
