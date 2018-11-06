const express = require('express')
const router = express.Router()
const Blocks = require('../services/blocks')

router.get('/transactions', (req, res) => {
  Blocks
    .findAllTransactions(req.query)
    .then((results) => {
      res
        .status(200)
        .json({
          'status': 'SUCCESS',
          'message': 'Successfully found the transactions',
          'data': {
            'transactions': results
          }
        })
    })
    .catch((err) => {
      res
        .status(422)
        .json({
          'status': 'ERROR',
          'message': err
        })
    })
})

module.exports = router
