const discordWebhookURL = "";
const pingRoleId = ""

const convertEmailToDiscord = (msg, payloads) => {
  if (!msg.isUnread()) return;
  let subject = msg.getSubject();
  let emailBody = msg.getPlainBody(); // mail without formatting
  const attachments = msg.getAttachments();
  const firstEmailHeaderRegex = /^_{32}((.|\n)*?)_{32}/; // Email header containing sensitive data.
  emailBody.replace(firstEmailHeaderRegex, ''); // remove header info from fwded email
  // TODO: get second header info, surround in code block
  subject = subject.replace(/^(FW: )*/, '');
  
  let embeds = [];
  console.log("body length: ", emailBody.length);

  while (emailBody.length > 0) {          
    // const emailHeaderRegex = /\b___(.*?|\n)*Subject.*\n\n\b/;
    // const emailHeaderRegex = /\b_{32}(?:.*?|\r\n)*\b/dm;
    let lastIndex = emailBody.lastIndexOf("\n", 1991); // last newline counting back from max char limit.
    if (lastIndex == -1) lastIndex = emailBody.lastIndexOf(".", 1990) + 1; // last period.
    if (lastIndex == -1) lastIndex = 1991;
    if (emailBody.length <= 1991) lastIndex = 1991; // last chunk of text.

    const embedBody = emailBody.substring(0, lastIndex);
    emailBody = emailBody.substring(lastIndex);
    const embed = (
      {
        title: '',
        description: embedBody,
        color: 5538103,
      }
    );
    embeds.push(embed);
  }

  // Embeds
  if (embeds.length == 0) return;
  embeds[0].title = subject;
  
  while (embeds.length > 0) {
    const payload = {
      content: "",
      embeds: embeds.slice(0,3), // Discord can only accept messages with embeds summing 6000 char, or 3 2000 char embeds.
    }

    embeds.shift(3);   
    payloads.push(payload);
  }

  // Attatchments
  if (attachments.length > 10) {
    attachments = attachments.slice(0, 10); // Only 10 are allowed max
  }
  if (attachments.length !== 0) {
    const payload = {
      files: [],
      embeds: []
    }
    
    console.log("files: ", attachments.length);
    attachments.forEach((a) => payload.files.push(a));
    payloads.push(payload);
  }

  return;
}

const forwardEmailToDiscord = () => {
  // Email adress of sender
  const whitelist = ['pgutierrez2@ufl.edu', 'noreply-apps-scripts-notifications@google.com'];
  const query = 'is:unread from:' + whitelist.toString().replace(',', ' OR from:');
  const payloads = [];

  const threads = GmailApp.search(query);

  threads.forEach((thread) => {
    var mailMsgs = thread.getMessages();

    // Iterate through all mails from a thread
    mailMsgs.forEach(async (msg) => {
      // async/await used for correct msg send order
      console.log(msg);
      await convertEmailToDiscord(msg, payloads);
      msg.markRead();
    });
  });
  
  if (payloads.length === 0) return;
  payloads.push({content: pingRoleId}); // Ping once everything is done being sent;

  payloads.forEach((payload) => {
    sendDiscordMessage(payload);
  });

  return
}

const sendDiscordMessage = (payload) => {
  const options = {
    muteHttpExceptions: false,
    method: "post",
    contentType: "application/json",
  }

  if (payload.files !== undefined) {
    // Create message containing URLs to files, which will be rendered in Discord. Size won't matter.
    let content = "";
    const rootFolder = DriveApp.getRootFolder();
    const parentFolder = DriveApp.getFoldersByName("keijiban-attachments").next();
    
    payload.files.forEach((f) => {
      const driveFile = DriveApp.createFile(f.copyBlob());
      parentFolder.addFile(driveFile);
      rootFolder.removeFile(driveFile);
      const driveFileObj = Drive.Files.get(driveFile.getId(), {fields: "name,thumbnailLink"})
      console.log(driveFileObj.thumbnailLink);
      if (driveFileObj.thumbnailLink !== undefined) {
        if (f.getContentType() === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || f.getContentType() === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
          driveFile.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
          content += `[${f.getName()}](${driveFile.getDownloadUrl()})` // For non-image files
        } else {
          // For images only
          const thumbnailUrl = driveFileObj.thumbnailLink

          // This method creates a single (yes, single) embed with multiple images; Not documented by Discord.
          if (payload.embeds.length === 10) return;
          payload.embeds.push(
            {
              description: `Attatchments: ${payload.files.length} ${payload.files.length > 4 ? `(click image to see all)` : ''}`,
              color: 5538103,
              image: {url: thumbnailUrl},
              url: 'https://example.com/'
            }
          );
        }
      } else {
        driveFile.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
        content += `[${f.getName()}](${driveFile.getDownloadUrl()})` // For non-image files
      }
    });

    options.payload = JSON.stringify({content: content, embeds: payload.embeds});
  } else {
    options.payload = JSON.stringify(payload);
  }

  UrlFetchApp.fetch(discordWebhookURL, options);
  return;
}
