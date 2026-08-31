const THROTTLE_MS = 250; // max ~30 msg/min, 5 per 10s

const sendTextMessage = (webhookURL, content, retriesLeft = 3) => {
  if (!webhookURL) throw new Error('Discord webhook URL is missing (check DISCORD_WEBHOOK_URL + config.discordWebhookURL)');
  const response = UrlFetchApp.fetch(webhookURL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ content }),
    muteHttpExceptions: true
  });
  return handleResponse(response, retriesLeft, () =>
    sendTextMessage(webhookURL, content, retriesLeft - 1));
}

const sendMessageWithFiles = (webhookURL, content, blobs) => {
  if (!webhookURL) throw new Error('Discord webhook URL is missing (check DISCORD_WEBHOOK_URL + config.discordWebhookURL)');
  const payload = { content };
  blobs.forEach((blob, i) => { payload[`files[${i}]`] = blob; });

  const response = UrlFetchApp.fetch(webhookURL, {
    method: 'post',
    payload,
    muteHttpExceptions: true,
  });
  return handleResponse(response, 3, () => 
    sendMessageWithFiles(webhookURL, content, blobs));
};

const handleResponse = (response, retriesLeft, retryFn) => {
  const code = response.getResponseCode();
  if (code >= 200 && code < 300) {
    Utilities.sleep(THROTTLE_MS); // Don't post retries too quickly.
    return true;
  }

  console.error(`Discord responded ${code}: ${response.getContentText()}`);

  if (code === 429 && retriesLeft > 0) {
    let retryAfterMs = Number(response.getHeaders()['retry-after']) * 1000;
    if (!isFinite(retryAfterMs) || retryAfterMs <= 0) retryAfterMs = 1000;
    Utilities.sleep(retryAfterMs);
    return retryFn();
  }
  return false;
};

