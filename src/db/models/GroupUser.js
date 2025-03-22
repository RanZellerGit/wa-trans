const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const GroupUser = sequelize.define(
    "GroupUser",
    {
      groupId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "groups",
          key: "id",
        },
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      inviter: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      tableName: "group_users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return GroupUser;
};
