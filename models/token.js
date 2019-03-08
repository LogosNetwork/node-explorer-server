module.exports = (sequelize, DataTypes) => {
  const token = sequelize.define('token', {
    token_id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    symbol: {
      type: DataTypes.STRING,
      require: true
    },
    name: {
      type: DataTypes.STRING,
      require: true
    },
    total_supply: {
      type: DataTypes.STRING,
      require: true
    },
    fee_type: {
      type: DataTypes.STRING,
      require: true
    },
    fee_rate: {
      type: DataTypes.STRING,
      require: true
    },
    settings: {
      type: DataTypes.JSONB,
      require: true
    },
    controllers: {
      type: DataTypes.JSONB,
      require: true
    },
    issuer_info: {
      type: DataTypes.STRING,
      require: true
    }
  }, {
    freezeTableName: true
  })
  return token
}