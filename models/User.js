const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      push_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      is_business: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      last_seen: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  User.associate = (models) => {
    User.hasMany(models.Message, {
      foreignKey: "sender",
      as: "sent_messages",
    });
    User.belongsToMany(models.Group, {
      through: "group_members",
      foreignKey: "user_id",
      as: "groups",
    });
  };

  return User;
};
