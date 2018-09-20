const express = require('express');
const router = express.Router();
const User = require('../services/user');

router.post('/create', (req, res) => {
  User
    .create(req.body)
    .then((user) => {
      res
        .status(200)
        .json({
          'status': 'SUCCESS',
          'message': 'Successfully created user',
          'data': {
            'user': user
          }
        });
    })
    .catch((err) => {
      res
        .status(422)
        .json({
          'status': 'ERROR',
          'message': err
        });
    });
});

module.exports = router;
