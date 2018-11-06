module.exports = (sequelize, DataTypes) => {
    const microEpoch = sequelize.define('microEpoch', {
      hash: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      timestamp: {
        type: DataTypes.STRING,
        require: true
      },
      delegate: {
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
      micro_block_number: {
        type: DataTypes.STRING,
        require: true
      },
      number_batch_blocks: {
        type: DataTypes.STRING,
        require: true
      },
      last_micro_block: {
        type: DataTypes.STRING,
        require: true
      },
      signature: {
        type: DataTypes.STRING,
        require: true
      }
    }, {
      freezeTableName: true
    })
    return microEpoch
  }
