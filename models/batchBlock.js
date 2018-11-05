module.exports = (sequelize, DataTypes) => {
    const batchBlocks = sequelize.define('batchBlocks', {
      hash: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      timestamp: {
        type: DataTypes.BIGINT,
        require: true
      },
      previous: {
        type: DataTypes.STRING,
        require: true
      },
      block_count: {
        type: DataTypes.SMALLINT,
        require: true
      },
      signature: {
        type: DataTypes.STRING,
        require: true
      }
    }, {
      freezeTableName: true
    })
    return batchBlocks
  }
