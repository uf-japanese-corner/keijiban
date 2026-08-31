   const MAX_MESSAGE_CHARS = 2000;          // Discord content limit per message
   const MAX_FILES_PER_MESSAGE = 10;        // webhook attachment limit
   const MAX_FILE_BYTES = 8 * 1024 * 1024;  // free-tier limit for Discord servers
   const FENCE_COST = 8;                    // ```\n + \n``` around a fenced block
   const HEADER_DELIM_RE = /^_{20,}\s*$/;  // runs of ≥20 underscores delimit forwarded headers
   const HEADER_LINE_RE = /^[A-Za-z][A-Za-z0-9-]*: /; // "Field: value" lines inside a header
   const CID_LINE_RE = /^\[cid:[^\]]+\]\s*$/;      // Outlook inline-image placeholder
   const SEPARATOR_LINE_RE = /^[-_]{10,}\s*$/;       // stray rule lines (signature dividers)

   const cleanSubject = (subject) =>
     subject.replace(/^(?:FWD|FW|Fwd|Re|RE)\s*:\s*/g, '').trim();

   // Line-oriented parser: an underscore delimiter toggles header mode;
   // consecutive "Field: value" lines become a fenced code block, closed by
   // the first non-header line. Works whether or not the body ends with a
   // closing delimiter (Outlook forwards render a single rule).
   const parseSegments = (raw) => {
     const segments = [];
     let text = [];        // pending plain-text lines
     let header = [];      // pending header lines (fenced)
     let inHeader = false;

     const flushText = () => {
       const value = text
         .join('\n')
         .replace(CID_LINE_RE, '')        // drop [cid:...] placeholders
         .replace(SEPARATOR_LINE_RE, '')  // drop stray rules
         .replace(/\n{3,}/g, '\n\n')
         .trim();
       if (value) segments.push({ type: 'text', value });
       text = [];
     };
     const flushHeader = () => {
       const value = header.join('\n').trim();
       if (value) segments.push({ type: 'code', value });
       header = [];
       inHeader = false;
     };

     for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
       if (HEADER_DELIM_RE.test(line)) {
         flushText();
         flushHeader();
         inHeader = true;
       } else if (inHeader && HEADER_LINE_RE.test(line)) {
         header.push(line);
       } else {
         if (inHeader) flushHeader(); // first non-header line closes the block
         text.push(line);
       }
     }
     flushText();
     flushHeader();
     return segments;
   };

   // Split one segment into pieces that each fit a message.
   const renderAndSplit = (seg) => {
     const limit = seg.type === 'code' ? MAX_MESSAGE_CHARS - FENCE_COST : MAX_MESSAGE_CHARS;
     const pieces = [];
     let rest = seg.value.trim();

     while (rest.length > limit) {
       let cut = rest.lastIndexOf('\n', limit);
       if (cut <= 0) cut = rest.lastIndexOf(' ', limit);
       if (cut <= 0) cut = limit;
       pieces.push(rest.slice(0, cut).trim());
       rest = rest.slice(cut).trim();
     }
     if (rest) pieces.push(rest);

     // Code segments are re-fenced per piece so a fence never spans messages.
     return seg.type === 'code'
       ? pieces.map((p) => `\`\`\`\n${p}\n\`\`\``)
       : pieces;
   };

   // Segments: ≤2000-char messages, joined by newlines. 
   const chunkSegments = (segments) => {
     const messages = [];
     let current = '';

     for (const seg of segments) {
       for (const piece of renderAndSplit(seg)) {
         const sep = current ? 1 : 0; // '\n' between pieces
         if (current.length + sep + piece.length <= MAX_MESSAGE_CHARS) {
           current = current ? current + '\n' + piece : piece;
         } else {
           if (current) messages.push(current);
           current = piece;
         }
       }
     }
     if (current) messages.push(current);
     return messages;
   };

   // Pull the fields we care about out of a GmailMessage.
   const extractMail = (msg) => ({
     subject: cleanSubject(msg.getSubject()),
     segments: parseSegments(msg.getPlainBody()),
     attachments: msg.getAttachments(), // DiscordClient batches in groups of 10
   });

   const mailToMessages = (mail) => {
     const segments = [];
     if (mail.subject) segments.push({ type: 'text', value: `**${mail.subject}**` });
     return chunkSegments([...segments, ...mail.segments]);
   };

   /**
    * batches of ≤10 attachment blobs. Files Discord can't take (>8 MB)
    * fall back to a Drive link kept in the batch's caption instead of a blob.
    */
   const mailAttachmentBatches = (mail) => {
     const batches = [];
     for (let i = 0; i < mail.attachments.length; i += MAX_FILES_PER_MESSAGE) {
       batches.push(mail.attachments.slice(i, i + MAX_FILES_PER_MESSAGE));
     }

     return batches.map((files) => {
       const blobs = [];
       const links = [];
       files.forEach((file) => {
         if (file.getSize() > MAX_FILE_BYTES) {
           links.push(`[${file.getName()}](${archiveFile(file)}): too large for Discord`);
         } else {
           blobs.push(file.copyBlob());
         }
       });
       return { blobs, caption: links.join('\n') };
     });
   };

