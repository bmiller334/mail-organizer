const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleAuth } = require('google-auth-library');

// Initialize Vertex AI with application default credentials
const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform'
});
const vertex_ai = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: 'us-central1',
  auth: auth
});

// Configure the model
// Note the Vertex AI model name is slightly different
const model = vertex_ai.getGenerativeModel({
  model: 'gemini-1.5-flash-001',
});

// Function to categorize an email using the Vertex AI API
async function categorizeEmail(emailContent, exampleEmails) {
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

  // Vertex AI expects the prompt in a specific request object
  const request = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };

  try {
    const result = await model.generateContent(request);
    
    // The response structure is different in Vertex AI
    const response = result.response;
    if (!response.candidates || response.candidates.length === 0) {
      console.error('No candidates found in Vertex AI response');
      return 'Uncategorized';
    }
    
    const text = response.candidates[0].content.parts[0].text;
    console.log('Raw Vertex AI Response Text:', text);

    // Clean up the response to get only the label name
    const category = text.trim().replace(/[^a-zA-Z0-9\s/_-]/g, '');
    return category;
  } catch (error) {
    console.error('Error categorizing email with Vertex AI:', error);
    return 'Uncategorized';
  }
}

module.exports = { categorizeEmail };
