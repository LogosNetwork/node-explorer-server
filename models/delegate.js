module.exports = (sequelize, DataTypes) => {
  const delegate = sequelize.define('delegate', {
    account: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    bls_pub: {
      type: DataTypes.STRING,
      require: true
    },
    vote: {
      type: DataTypes.STRING,
      require: true
    },
    stake: {
      type: DataTypes.STRING,
      require: true
    }
  }, {
    freezeTableName: true
  })
  return delegate
}
