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
      work: {
        type: DataTypes.STRING,
        require: true
      },
      number_transactions: {
        type: DataTypes.STRING,
        require: false
      },
      hash: {
        type: DataTypes.STRING,
        primaryKey: true
      }
    }, {
      freezeTableName: true
    })
    return request
  }
