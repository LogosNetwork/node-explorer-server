module.exports = (sequelize, DataTypes) => {
    const batchBlock = sequelize.define('batchBlock', {
      hash: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      timestamp: {
        type: DataTypes.STRING,
        require: true
      },
      previous: {
        type: DataTypes.STRING,
        require: true
      },
      block_count: {
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
    return batchBlock
  }
