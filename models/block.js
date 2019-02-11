module.exports = (sequelize, DataTypes) => {
    const block = sequelize.define('block', {
      account: {
        type: DataTypes.STRING,
        require: true
      },
      sequence: {
        type: DataTypes.STRING,
        require: true
      },
      transaction_type: {
        type: DataTypes.STRING,
        require: true
      },
      transaction_fee: {
        type: DataTypes.STRING,
        require: true
      },
      signature: {
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
      },
      index_in_batch: {
        type: DataTypes.STRING,
        require: true
      }
    }, {
      freezeTableName: true
    })
    return block
  }
