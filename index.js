// For loading environment variables
require('dotenv').config();
const express = require('express');
const { gmail, fetchUnreadEmails, fetchAllInboxEmails, getLabeledEmails, moveEmailToLabel } = require('./gmail-service');
const { categorizeEmail } = require('./gemini-service');

const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON bodies
app.use(express.json());

let isProcessing = false;

// Reusable email organization logic
const organizeEmails = async (emailFetcher) => {
  if (isProcessing) {
    console.log('Already processing emails. Skipping this run.');
    return { success: false, message: 'Processing already in progress.' };
  }
  isProcessing = true;
  console.log(`--- Starting Email Organization ---`);

  try {
    const emailsToProcess = await emailFetcher();
    if (emailsToProcess.length === 0) {
      console.log('No emails to process.');
      isProcessing = false;
      return { success: true, message: 'No emails to process.' };
    }
    console.log(`Found ${emailsToProcess.length} email(s) to process.`);

    const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
    const userLabels = labelsResponse.data.labels.filter(label => label.type === 'user');

    // ** ADDED CHECK **: Ensure there are labels to work with.
    if (userLabels.length === 0) {
        const noLabelsMessage = "No user-created labels found. Please create at least one label in Gmail (e.g., 'Work', 'Personal') for the AI to categorize emails into.";
        console.log(noLabelsMessage);
        isProcessing = false;
        return { success: false, message: noLabelsMessage };
    }

    const exampleEmails = {};
    for (const label of userLabels) {
      const emailsInLabel = await getLabeledEmails(label.id);
      exampleEmails[label.name] = emailsInLabel.map(email => ({ subject: email.subject, body: email.snippet }));
    }

    let processedCount = 0;
    for (const email of emailsToProcess) {
      const emailContent = { subject: email.subject, sender: email.from, body: email.snippet };
      const category = await categorizeEmail(emailContent, exampleEmails);
      const targetLabel = userLabels.find(label => label.name === category);

      if (targetLabel) {
        await moveEmailToLabel(email.id, targetLabel.id);
        console.log(`- Moved email from ${email.from} to ${category}`);
        processedCount++;
      } else {
        console.log(`- Could not find a label for category: "${category}". Email from ${email.from} will remain in inbox.`);
      }
    }
    const resultMessage = `Successfully processed ${processedCount} of ${emailsToProcess.length} emails.`;
    console.log(resultMessage);
    return { success: true, message: resultMessage, processedCount: processedCount };

  } catch (error) {
    console.error('Error organizing emails:', error);
    return { success: false, message: 'An error occurred during email organization.' };
  } finally {
    isProcessing = false;
    console.log('--- Finished Email Organization ---');
  }
};

// Route for event-driven notifications from Pub/Sub
app.post('/', async (req, res) => {
  if (!req.body || !req.body.message) {
    return res.status(400).send('Bad Request: Invalid Pub/Sub message format');
  }
  console.log('Received Pub/Sub message.');
  await organizeEmails(fetchUnreadEmails);
  res.status(204).send();
});

// Route for manual cleanup, triggered by the Gmail Add-on
app.post('/cleanup', async (req, res) => {
    const expectedKey = process.env.CLEANUP_SECRET_KEY;
    const providedKey = req.headers['x-cleanup-secret'];

    if (!expectedKey || providedKey !== expectedKey) {
        return res.status(401).send('Unauthorized');
    }

    console.log('Received request for manual cleanup.');
    const result = await organizeEmails(fetchAllInboxEmails);
    res.status(200).json(result);
});

// Add a new, simple test route
app.get('/test', (req, res) => {
    res.status(200).send('The server is running the latest version of the code!');
});


// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
