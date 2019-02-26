const express = require('express')
const router = express.Router()
const Blocks = require('../services/blocks')

router.get('/requests', (req, res) => {
  Blocks
    .transactions(req.query.previousDate, req.query.count)
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

router.get('/lastRequestBlock', (req, res) => {
  Blocks
  .findMostRecentBatchBlock()
  .then((results) => {
    res
      .status(200)
      .json({
        'status': 'SUCCESS',
        'message': 'Successfully found the most recent batch block',
        'data': {
          'batchBlock': results
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

router.get('/requestBlocks', (req, res) => {
  Blocks
  .batchBlocks(req.query.previousDate, req.query.count)
  .then((results) => {
    res
      .status(200)
      .json({
        'status': 'SUCCESS',
        'message': 'Successfully found the batch blocks',
        'data': {
          'batchBlock': results
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
