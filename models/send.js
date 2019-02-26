module.exports = (sequelize, DataTypes) => {
  const send = sequelize.define('send', {
    destination: {
      type: DataTypes.STRING,
      require: true
    },
    amount: {
      type: DataTypes.STRING,
      require: true
    }
  }, {
    freezeTableName: true
  })
  return send
}
