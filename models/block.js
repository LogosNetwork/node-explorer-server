module.exports = (sequelize, DataTypes) => {
    const blocks = sequelize.define('blocks', {
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
      }
    }, {
      freezeTableName: true
    })
    return blocks
  }