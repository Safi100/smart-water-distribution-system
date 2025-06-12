const Notification = require("../models/notification.model");

module.exports.sendNotification = async (message, userID) => {
  try {
    const notification = new Notification({
      message,
      user: userID,
    });
    await notification.save();
    console.log(`Notification sent to user ${userID}: ${message}`);
  } catch (error) {
    console.error(`Error sending notification: ${error.message}`);
  }
};

module.exports.getAllNotifications = async (userID) => {
  try {
    const notifications = await Notification.find({ user: userID })
      .sort({
        createdAt: -1,
      })
      .select("-user");
    return notifications;
  } catch (error) {
    console.error(`Error fetching notifications: ${error.message}`);
  }
};
