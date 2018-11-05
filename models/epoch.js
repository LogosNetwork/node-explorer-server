module.exports = (sequelize, DataTypes) => {
    const epoch = sequelize.define('epoch', {
      hash: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      timestamp: {
        type: DataTypes.BIGINT,
        require: true
      },
      account: {
        type: DataTypes.STRING,
        require: true
      },
      previous: {
        type: DataTypes.STRING,
        require: true
      },
      epoch_number: {
        type: DataTypes.STRING,
        require: true
      },
      micro_block_tip: {
        type: DataTypes.STRING,
        require: true
      },
      transaction_fee_pool: {
        type: DataType.STRING,
        require: true
      },
      signature: {
        type: DataTypes.STRING,
        require: true
      }
    }, {
      freezeTableName: true
    })
    return epoch
  }
