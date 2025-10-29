// For loading environment variables
require('dotenv').config();
const express = require('express');
const { gmail, fetchUnreadEmails, getLabeledEmails, moveEmailToLabel } = require('./gmail-service');
const { categorizeEmail } = require('./gemini-service');

const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON bodies, which is what Pub/Sub sends
app.use(express.json());

let isProcessing = false;

// Main function to run the email organization process
const organizeEmails = async () => {
  if (isProcessing) {
    console.log('Already processing emails. Skipping this run.');
    return;
  }
  isProcessing = true;
  console.log('--- New Email Notification Received - Starting Organization ---');

  try {
    // 1. Fetch unread emails
    console.log('Step 1: Fetching unread emails...');
    const unreadEmails = await fetchUnreadEmails();

    if (unreadEmails.length === 0) {
      console.log('No unread emails to process.');
      isProcessing = false;
      return;
    }
    console.log(`Found ${unreadEmails.length} unread email(s).`);

    // 2. Get existing labels and example emails for each label
    console.log('Step 2: Fetching user-created labels and example emails...');
    const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
    const userLabels = labelsResponse.data.labels.filter(label => label.type === 'user');
    const exampleEmails = {};
    console.log('Available user labels:', userLabels.map(l => l.name).join(', '));

    for (const label of userLabels) {
      const emailsInLabel = await getLabeledEmails(label.id);
      exampleEmails[label.name] = emailsInLabel.map(email => ({
        subject: email.subject,
        body: email.snippet,
      }));
    }
    console.log('Done fetching examples.');

    // 3. Categorize each unread email
    console.log('Step 3: Categorizing unread emails...');
    for (const email of unreadEmails) {
      const emailContent = {
        subject: email.subject,
        sender: email.from,
        body: email.snippet,
      };

      console.log(`- Analyzing email from ${email.from} with subject: "${email.subject}"`);
      const category = await categorizeEmail(emailContent, exampleEmails);
      console.log(`- Gemini AI decided the category is: ${category}`);

      // 4. Move the email to the corresponding label
      console.log('Step 4: Moving email to the correct label...');
      const targetLabel = userLabels.find(label => label.name === category);
      if (targetLabel) {
        await moveEmailToLabel(email.id, targetLabel.id);
        console.log(`- Successfully moved email to ${category}`);
      } else {
        console.log(`- Could not find a user label named "${category}". Email will remain in the inbox.`);
      }
    }
  } catch (error) {
    console.error('Error organizing emails:', error);
  } finally {
    isProcessing = false;
    console.log('--- Finished Email Organization ---');
  }
};

// Define the route that Pub/Sub will push to
app.post('/', async (req, res) => {
  if (!req.body || !req.body.message) {
    console.log('Received invalid request format.');
    return res.status(400).send('Bad Request: Invalid Pub/Sub message format');
  }
  console.log('Received Pub/Sub message.');
  await organizeEmails();
  res.status(204).send();
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
