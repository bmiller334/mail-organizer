const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configure the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to categorize an email using the Gemini API
async function categorizeEmail(emailContent, exampleEmails) {
  // Switched to the stable 'gemini-pro' model
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  let prompt = `Analyze the following email and categorize it into one of the existing user-created labels.

Email Subject: "${emailContent.subject}"
Email Sender: "${emailContent.sender}"
Email Body: "${emailContent.body}"

Here are the available labels and some examples of emails within them:
`;

  const availableLabels = Object.keys(exampleEmails);

  for (const label of availableLabels) {
    prompt += `\n--- Label: ${label} ---\n`;
    if (exampleEmails[label] && exampleEmails[label].length > 0) {
      for (const example of exampleEmails[label].slice(0, 2)) {
        prompt += `- Subject: "${example.subject}", Body: "${example.body.substring(0, 100)}..."\n`;
      }
    } else {
      prompt += "- No examples available for this label.\n";
    }
  }

  prompt += `\nBased on the content and the provided examples, which single label is the best fit for this email? Please provide only the label name as the answer from the following list: ${availableLabels.join(', ')}.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    console.log('Raw Gemini Response Text:', response.text());

    // Clean up the response to get only the label name
    const category = response.text().trim().replace(/[^a-zA-Z0-9\s/_-]/g, '');
    return category;
  } catch (error) {
    console.error('Error categorizing email with Gemini:', error);
    return 'Uncategorized';
  }
}

module.exports = { categorizeEmail };
