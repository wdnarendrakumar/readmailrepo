const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
// async function listLabels(auth) {
//   const gmail = google.gmail({version: 'v1', auth});
//   const res = await gmail.users.labels.list({
//     userId: 'me',
//   });
//   const labels = res.data.labels;
//   if (!labels || labels.length === 0) {
//     console.log('No labels found.');
//     return;
//   }
//   console.log('Labels:');
//   labels.forEach((label) => {
//     console.log(`- ${label.name}`);
//   });
// }

function listMessages(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    gmail.users.messages.list(
      {
        userId: 'me',
        labelIds: 'INBOX',
      },
      (err, res) => {
        if (err) return console.log('The API returned an error:', err);
  
        const messages = res.data.messages;
        if (messages.length) {
          console.log('Messages:');
          messages.forEach((message) => {
            gmail.users.messages.get(
              {
                userId: 'me',
                id: message.id,
                format: 'full', // This will fetch the full content of each message
              },
              (err, messageRes) => {
                if (err) return console.log('Error fetching message:', err);
                console.log('Message ID:', messageRes.data.id);
                console.log('From:', messageRes.data.payload.headers.find((h) => h.name === 'From').value);
                console.log('Subject:', messageRes.data.payload.headers.find((h) => h.name === 'Subject').value);
                console.log('Body:', messageRes.data.snippet);
                console.log('------------------------');
              }
            );
          });
        } else {
          console.log('No messages found.');
        }
      }
    );
  }

  

authorize().then(listMessages).catch(console.error);