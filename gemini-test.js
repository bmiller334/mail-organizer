
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function runTest() {
  try {
    console.log("Initializing Gemini Client...");
    // Ensure the API key is loaded
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not found in .env file.");
      return;
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("Getting model 'gemini-1.5-flash-latest'...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    console.log("Sending a simple prompt...");
    const prompt = "What is the capital of France?";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("\n--- SUCCESS ---");
    console.log("Received response from Gemini API:");
    console.log(text);
    console.log("-----------------");

  } catch (error) {
    console.error("\n--- FAILED ---");
    console.error("An error occurred while trying to contact the Gemini API:");
    console.error(error);
    console.error("--------------");
  }
}

runTest();
