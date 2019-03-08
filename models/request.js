module.exports = (sequelize, DataTypes) => {
    const request = sequelize.define('request', {
      type: {
        type: DataTypes.STRING,
        require: true
      },
      origin: {
        type: DataTypes.STRING,
        require: true
      },
      signature: {
        type: DataTypes.STRING,
        require: true
      },
      fee: {
        type: DataTypes.STRING,
        require: true
      },
      sequence: {
        type: DataTypes.STRING,
        require: true
      },
      hash: {
        type: DataTypes.STRING,
        primaryKey: true
      },

      // Optional Request Specific Values
      transactions: {
        type: DataTypes.JSONB,
        require: false
      },
      transaction: {
        type: DataTypes.JSONB,
        require: false
      },
      account: {
        type: DataTypes.STRING,
        require: false
      },
      amount: {
        type: DataTypes.STRING,
        require: false
      },
      token_id: {
        type: DataTypes.STRING,
        require: false
      },
      symbol: {
        type: DataTypes.STRING,
        require: false
      },
      name: {
        type: DataTypes.STRING,
        require: false
      },
      total_supply: {
        type: DataTypes.STRING,
        require: false
      },
      fee_type: {
        type: DataTypes.STRING,
        require: false
      },
      fee_rate: {
        type: DataTypes.STRING,
        require: false
      },
      token_fee: {
        type: DataTypes.STRING,
        require: false
      },
      settings: {
        type: DataTypes.JSONB,
        require: false
      },
      controllers: {
        type: DataTypes.JSONB,
        require: false
      },
      action: {
        type: DataTypes.STRING,
        require: false
      },
      controller: {
        type: DataTypes.JSONB,
        require: false
      },
      issuer_info: {
        type: DataTypes.STRING,
        require: false
      },
      new_info: {
        type: DataTypes.STRING,
        require: false
      },
      setting: {
        type: DataTypes.STRING,
        require: false
      },
      value: {
        type: DataTypes.STRING,
        require: false
      }
    }, {
      freezeTableName: true
    })
    return request
  }
