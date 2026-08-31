const forwardEmailToDiscord = () => {
	const config = loadConfig();
	if (!config.discordWebhookURL) {
		console.error("Set DISCORD_WEBHOOK_URL in Script Properties first")
		return;
	}
	if (!config.whitelist || config.whitelist.length === 0) {
		console.error("SENDER_WHITELIST is empty. Nothing will be forwarded!");
		return;
	}

	const query = `is:unread from:${config.whitelist.join(' OR from:')}`;
	const threads = GmailApp.search(query);
	if (threads.length === 0) return;

	let forwarded = 0;
	let failures = 0;

	threads.forEach((thread) => {
		thread.getMessages().forEach((msg) => {
			if (!msg.isUnread()) return;
			try {
				runMessage(msg, config);
				msg.markRead();
				forwarded++;
			} catch (err) {
				failures++;
				console.error(`Failed to forward "${msg.getSubject()}" (${msg.getId()}):`, err);
				// message left unread, so it is retried on the next execution
			}
		});
	});

	if (forwarded > 0) sendPing(config);
	console.log(`keijiban: ${forwarded} emails forwarded. ${failures} failure(s).`)
};

const runMessage = (msg, config) => {
	const mail = extractMail(msg);

	mailToMessages(mail).forEach((content) =>
		sendTextMessage(config.discordWebhookURL, content));

	mailAttachmentBatches(mail).forEach(({ blobs, caption }) => {
		if (blobs.length > 0) {
			sendMessageWithFiles(config.discordWebhookURL, caption, blobs);
		} else if (caption) {
			sendTextMessage(config.discordWebhookURL, caption);
		}
	});
};

const sendPing = (config) => {
	if (!config.pingRoleId) return;
	sendTextMessage(config.discordWebhookURL, `<@&${config.pingRoleId}>`);
};

