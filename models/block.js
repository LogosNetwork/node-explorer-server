module.exports = (sequelize, DataTypes) => {
    const block = sequelize.define('block', {
      hash: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      timestamp: {
        type: DataTypes.STRING,
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
      representative: {
        type: DataTypes.STRING,
        require: true
      },
      amount: {
        type: DataTypes.STRING,
        require: true
      },
      link: {
        type: DataTypes.STRING,
        require: true
      },
      link_as_account: {
        type: DataTypes.STRING,
        require: true
      },
      work: {
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
      batchBlockHash: {
        type: DataTypes.STRING,
        require: true
      }
    }, {
      freezeTableName: true
    })
    return block
  }
