const express = require('express')
const router = express.Router()
const Blocks = require('../services/blocks')

router.get('/requests', (req, res) => {
  Blocks
    .requests(req.query.previousDate, req.query.count)
    .then((results) => {
      res
        .status(200)
        .json({
          'status': 'SUCCESS',
          'message': 'Successfully found the requests',
          'data': {
            'requests': results
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
  .findMostRecentRequestBlock()
  .then((results) => {
    res
      .status(200)
      .json({
        'status': 'SUCCESS',
        'message': 'Successfully found the most recent batch block',
        'data': {
          'requestBlock': results
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
  .requestBlocks(req.query.previousDate, req.query.count)
  .then((results) => {
    res
      .status(200)
      .json({
        'status': 'SUCCESS',
        'message': 'Successfully found the request blocks',
        'data': {
          'requestBlock': results
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
