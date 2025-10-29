// The Cloud Run URL of your deployed service. Replace with your actual URL.
var SERVICE_URL = 'https://gmail-gemini-organizer-a1b2c3d4ef-uc.a.run.app'; 
// The secret key you will add to your environment variables.
var CLEANUP_SECRET_KEY = 'YOUR_SECRET_KEY'; // Replace with a strong, unique secret

/**
 * The entry point for the add-on's homepage card.
 * This function is called when the user opens the add-on.
 */
function onGmailHomepage(e) {
  return createHomepageCard('Welcome!', 'Click the button below to organize your entire inbox.');
}

/**
 * Creates the main card for the Add-on interface.
 * @param {string} titleText - The title to display on the card.
 * @param {string} messageText - The message to display below the title.
 * @returns {Card} A card object to be displayed in the Gmail UI.
 */
function createHomepageCard(titleText, messageText) {
  var builder = CardService.newCardBuilder();

  // Add the header
  builder.setHeader(CardService.newCardHeader().setTitle(titleText));
  
  // Add a section with a descriptive message
  var section = CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(messageText));

  // Add the Cleanup button
  var cleanupAction = CardService.newAction()
      .setFunctionName('triggerCleanup');
  var cleanupButton = CardService.newTextButton()
      .setText('Cleanup Inbox')
      .setOnClickAction(cleanupAction);
  section.addWidget(cleanupButton);

  builder.addSection(section);
  return builder.build();
}

/**
 * Calls the /cleanup endpoint on the Cloud Run service.
 * This function is triggered when the user clicks the "Cleanup Inbox" button.
 */
function triggerCleanup() {
  var headers = {
    'x-cleanup-secret': CLEANUP_SECRET_KEY,
    'Content-Type': 'application/json'
  };

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': headers,
  };

  try {
    var response = UrlFetchApp.fetch(SERVICE_URL + '/cleanup', options);
    var result = JSON.parse(response.getContentText());

    var message = result.success ? result.message : 'Error: ' + result.message;
    // Show a notification to the user
    return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText(message))
        .build();

  } catch (e) {
    // Handle errors and notify the user
    return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Failed to start cleanup: ' + e.toString()))
        .build();
  }
}
