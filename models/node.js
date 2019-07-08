module.exports = (sequelize, DataTypes) => {
  const node = sequelize.define('node', {
    uid: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    ip: {
      type: DataTypes.STRING
    }
  }, {
    freezeTableName: true
  })
  return node
}
