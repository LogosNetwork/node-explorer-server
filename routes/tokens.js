const express = require('express')
const router = express.Router()
const Blocks = require('../services/blocks')

router.get('/', (req, res) => {
  Blocks
    .tokens(req.query.previousDate, req.query.count)
    .then((results) => {
      res
        .status(200)
        .json({
          'status': 'SUCCESS',
          'message': 'Successfully found the tokens',
          'data': {
            'tokens': results
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
