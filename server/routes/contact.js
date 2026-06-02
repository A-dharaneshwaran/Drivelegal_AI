const express = require('express');
const router = express.Router();
const { sendEmail } = require('../services/emailService');

router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'All fields (name, email, subject, message) are required.' });
  }

  // Regex email validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email format.' });
  }

  try {
    const formattedSubject = `[DriveLegal Contact] ${subject}`;
    const textContent = `You have received a new message from the DriveLegal contact form:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`;
    const htmlContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr />
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
    `;

    await sendEmail({
      to: 'Drivelegalai@gmail.com',
      subject: formattedSubject,
      text: textContent,
      html: htmlContent
    });

    return res.status(200).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact email sending failed:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error. Failed to send message.' });
  }
});

module.exports = router;
