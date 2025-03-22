const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Group = sequelize.define(
    "Group",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "groups",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  Group.associate = (models) => {
    Group.hasMany(models.Message, {
      foreignKey: "group_id",
      as: "messages",
    });
    Group.belongsToMany(models.User, {
      through: "group_users",
      foreignKey: "groupId",
      otherKey: "userId",
    });
  };

  return Group;
};
