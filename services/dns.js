let methods = {}
const models = require('../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

methods.nodes = (ip) => {
  return new Promise((resolve, reject) => {
    models.node
      .findAll(
        {
          order: [
            Sequelize.fn('RANDOM')
          ],
          limit:2500
        }
      )
      .then((nodes) => {
        if (!nodes) { return reject('Could not get any nodes') }
        models.node.findOrCreate({
          where: {
            ip: ip
          },
          defaults: {
            ip: ip
          }
        })
        resolve(nodes.map(x => x.toJSON()))
      })
      .catch((err) => { return reject(err) })
  })
}

module.exports = methods
