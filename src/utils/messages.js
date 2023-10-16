const messageModel = require('../models/messages.model');

const saveMessages = async ({ from, to, message, time }) => {
  const token = getToken(from, to);
  const data = {
    from,
    message,
    time,
  };

  try {
    const response = await messageModel.updateOne(
      { userToken: token },
      {
        $push: { messages: data },
      }
    );
  } catch (error) {
    console.error(error);
  }
};

const getToken = (sender, receiver) => {
  const key = [sender, receiver].sort().join('_');
  return key;
};

const fetchMessages = async (io, sender, receiver) => {
  const token = getToken(sender, receiver);

  const foundToken = await messageModel.findOne({ userToken: token });
  if (foundToken) {
    io.to(sender).emit('stored-messages', { messages: foundToken.messages });
  } else {
    const data = {
      userToken: token,
      messages: [],
    };

    new messageModel(data).save();
  }
};

module.exports = { saveMessages, fetchMessages };
