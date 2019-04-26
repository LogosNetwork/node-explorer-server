// Packages
const express = require('express')
const config = require('./config.json')
const app = express()
const bodyParser = require('body-parser')
const axios = require('axios')

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// Application config
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('*', (req, res) => {
  res.send('The Logos TestNet is being upgraded, come back soon!')
})

app.post('/rpc', async (req, res) => {
  let targetURL = req.body.targetURL
  delete req.body.targetURL
  const response = await axios.post(`${targetURL}/`, req.body)
  res.send(response.data)
})


app.listen(config.system.port)
console.log('Listening on port: ' + config.system.port)
