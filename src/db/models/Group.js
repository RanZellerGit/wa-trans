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

  return Group;
};
