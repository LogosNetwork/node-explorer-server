module.exports = (sequelize, DataTypes) => {
  const send = sequelize.define('send', {
    target: {
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
