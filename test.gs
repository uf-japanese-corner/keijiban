// Wrapper in case `forwardEmailToDiscord` (a const arrow fn) isn't
// selectable in the Run dropdown — triggers CAN run it, the UI sometimes can't.
function runOnce() { forwardEmailToDiscord(); }

// 1) Webhook smoke test — no Gmail needed. Just confirms auth + URL work.
function sendTestMessage() {
 const config = loadConfig();
 if (!config.discordWebhookURL) throw new Error('Set DISCORD_WEBHOOK_URL first.');
 console.log('sendTestMessage ->', sendTextMessage(config.discordWebhookURL, 'keijiban smoke test'));
}

// 2) Multipart upload smoke test — posts a 1x1 PNG so you see the image path work.
function sendTestUpload() {
 const config = loadConfig();
 const png = Utilities.base64Decode(
   'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
 );
 const blob = Utilities.newBlob(png, 'image/png', 'test.png');
 console.log('sendTestUpload ->', sendMessageWithFiles(config.discordWebhookURL, 'keijiban uploadtest', [blob]));
}

// 3) DRY RUN — parses every matching unread email and prints exactly what
//    would be posted. Marks NOTHING read, posts NOTHING.
function previewUnread() {
 const config = loadConfig();
 const threads = GmailApp.search(`is:unread from:${config.whitelist.join(' OR from:')}`);
 console.log(`is:unread from:${config.whitelist.join(' OR from:')}`);
 console.log(`preview: ${threads.length} thread(s)`);
 threads.forEach((t) =>
   t.getMessages().filter((m) => m.isUnread()).forEach(previewMessage));
}

function previewMessage(msg) {
 const mail = extractMail(msg);
 console.log('---', msg.getSubject(), '|', msg.getDate());
 const messages = mailToMessages(mail);
 console.log(`${messages.length} text message(s):`);
 messages.forEach((m, i) =>
   console.log(`  [${i}] ${m.length}ch :: ${m.slice(0, 100).replace(/\n/g, ' / ')}${m.length > 100 ?
'…' : ''}`));
 const batches = mailAttachmentBatches(mail);
 batches.forEach((b, i) =>
   console.log(`  attachments batch ${i}: ${b.blobs.length} file(s) to Discord,
caption=${JSON.stringify(b.caption)}`));
}
