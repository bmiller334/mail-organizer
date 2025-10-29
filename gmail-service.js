const { google } = require('googleapis');
const { get } = require('http');

// Configure the OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Function to fetch unread emails (for event-driven processing)
async function fetchUnreadEmails() {
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread in:inbox',
  });

  if (!response.data.messages) {
    return [];
  }

  const emails = [];
  for (const message of response.data.messages) {
    const email = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
    });

    const headers = email.data.payload.headers;
    const subject = headers.find(header => header.name === 'Subject').value;
    const from = headers.find(header => header.name === 'From').value;

    emails.push({
      id: email.data.id,
      subject,
      from,
      snippet: email.data.snippet,
    });
  }

  return emails;
}

// Function to fetch all emails in the inbox (for manual cleanup)
async function fetchAllInboxEmails() {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox',
    });
  
    if (!response.data.messages) {
      return [];
    }
  
    const emails = [];
    for (const message of response.data.messages) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });
  
      const headers = email.data.payload.headers;
      const subject = headers.find(header => header.name === 'Subject').value;
      const from = headers.find(header => header.name === 'From').value;
  
      emails.push({
        id: email.data.id,
        subject,
        from,
        snippet: email.data.snippet,
      });
    }
  
    return emails;
  }


// Function to get emails from a specific label
async function getLabeledEmails(labelId) {
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [labelId],
      maxResults: 5, // Get up to 5 examples per label
    });
  
    if (!response.data.messages) {
      return [];
    }
  
    const emails = [];
    for (const message of response.data.messages) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });
  
      const headers = email.data.payload.headers;
      const subject = headers.find(header => header.name === 'Subject').value;
  
      emails.push({
        subject,
        snippet: email.data.snippet,
      });
    }
  
    return emails;
  }
  
  // Function to move an email to a specific label
  async function moveEmailToLabel(emailId, labelId) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        addLabelIds: [labelId],
        removeLabelIds: ['INBOX', 'UNREAD'],
      },
    });
  }

module.exports = { gmail, fetchUnreadEmails, fetchAllInboxEmails, getLabeledEmails, moveEmailToLabel };