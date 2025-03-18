const { Client } = require("whatsapp-web.js");
const logger = require("../utils/logger");

// Handle WhatsApp group invites
const handleWhatsAppGroupInvite = async (client, inviteCode) => {
  try {
    // Join the group using the invite code
    const joinedGroup = await client.acceptInvite(inviteCode);

    if (joinedGroup) {
      logger.info(`Successfully joined group: ${joinedGroup.name}`);
      return joinedGroup;
    }
  } catch (error) {
    logger.error(`Error joining group: ${error.message}`);
    throw error;
  }
};

// Get invite info without accepting
const getGroupInviteInfo = async (client, inviteCode) => {
  try {
    const inviteInfo = await client.getInviteInfo(inviteCode);
    logger.info(`Retrieved invite info for group: ${inviteInfo.title}`);
    return inviteInfo;
  } catch (error) {
    logger.error(`Error getting invite info: ${error.message}`);
    throw error;
  }
};

module.exports = {
  handleWhatsAppGroupInvite,
  getGroupInviteInfo,
};
