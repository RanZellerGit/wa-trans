const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Message = sequelize.define(
    "Message",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      message_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      sender: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      recipient: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      group_id: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: "groups",
          key: "id",
        },
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "messages",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  Message.associate = (models) => {
    Message.belongsTo(models.Group, {
      foreignKey: "group_id",
      as: "group",
    });
  };

  return Message;
};
