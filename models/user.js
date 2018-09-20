module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('user', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    address: {
      type: DataTypes.STRING,
      require: true,
      validate: {
        is: /((?:xrb_[13][a-km-zA-HJ-NP-Z0-9]{59})|(?:nano_[13][a-km-zA-HJ-NP-Z0-9]{59}))/,
      }
    },
    fn: {
      type: DataTypes.STRING,
      require: true
    },
    ln: {
      type: DataTypes.STRING,
      require: true
    },
    birthday: {
      type: DataTypes.DATE,
      require: true
    },
    email: {
      type: DataTypes.STRING,
      require: true
    },
    emailRegistered: {
      type: DataTypes.BOOLEAN,
      require: true,
      defaultValue: false
    },
    phone: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      unique: true,
      validate: {
        isValidPhoneNo: (value) => {
          if (!value) return value;
          const regexp = /^[0-9]+$/;
          let values = (Array.isArray(value)) ? value : [value];

          values.forEach((val) => {
            if (!regexp.test(val)) {
              throw new Error("Number only is allowed.");
            }
          });
          return value;
        }
      }
    },
    phoneRegistered: {
      type: DataTypes.BOOLEAN,
      require: true,
      defaultValue: false
    }
  }, {
    freezeTableName: true,
    timestamps: true
  });
  return User;
};