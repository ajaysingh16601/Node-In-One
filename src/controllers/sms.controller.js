import { sendSMS } from '../utils/sms.js';

export const sendTestSMS = async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ success: false, message: 'Phone and message are required.' });
  }

  try {
    const response = await sendSMS({ to: phone, body: message });
    res.status(200).json({ success: true, message: 'SMS sent', sid: response.sid });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
