module.exports = (sequelize, DataTypes) => {
    const epoch = sequelize.define('epoch', {
      delegate: {
        type: DataTypes.STRING,
        require: true
      },
      epoch_number: {
        type: DataTypes.STRING,
        require: true
      },
      sequence: {
        type: DataTypes.STRING,
        require: true
      },
      timestamp: {
        type: DataTypes.STRING,
        require: true
      },
      signature: {
        type: DataTypes.STRING,
        require: true
      },
      type: {
        type: DataTypes.STRING,
        require: true
      },
      transaction_fee_pool: {
        type: DataTypes.STRING,
        require: true
      },
      paricipation_map: {
        type: DataTypes.STRING,
        require: true
      },
      hash: {
        type: DataTypes.STRING,
        primaryKey: true
      }
    }, {
      freezeTableName: true
    })
    return epoch
  }
