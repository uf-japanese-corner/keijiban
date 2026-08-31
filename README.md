# Keijiban

Forwards emails from a whitelisted sender to a channel in a Discord server.

Pre-reqs:
- a Google Apps Script project
- a discord webhook created in the channel you want to post/test in
- a major/minor in Japanese :) (or just ask faculty to add you to the list)

### Set up Apps Script Deployments
1. Login to Google Apps Script
2. Create two projects, one for testing (dev environment) and one for production
3. In each one, go to the settings page > Script Properties. Add the following envars:

   * DISCORD_PING_ROLE_ID: Copy the role ID of the role you want the webhook to ping when it sends a message. You can do this by sending a message with `\@<role name>`.
   * DISCORD_WEBHOOK_URL: Go to the Discord channel you want the webhook to post in > Connected Services > Webhooks > Create webhook > Copy webhook URL. Paste the full url as the value of this envar.
   * SENDER_WHITELIST: This is the email in Gmail which you want to forward messages from. *All emails received from this user will be posted publicly.*
     * It is up to you to setup forwarding emails to the keijiban deployment's Gmail. If you happen to be using an outlook account that happens to restrict automating the forwarding of emails, then I suggest looking into using Power Automate.
     * Note: you can also use a list. just separate emails with a single comma (`,`). The email `noreply-apps-scripts-notifications@google.com` also provides notifications for errors.

### Set up CI

*Get Credentials for Clasp*

Clasp is a command-line tool used to push code to an Apps Script deployment. In order to get the creds it needs to run with in our CI, we authenticate via Clasp locally.

`CLASPRC_JSON`
1. Login into Google Apps Script using the account used for keijiban dev/prod deployments.
2. Install [Clasp](https://github.com/google/clasp) locally.
3. Run `npm run login` and go through the authentication procedure. A `.clasprc.json` will be generated, likely in your home directory.
4. Go to the GitHub repo > Settings > Secrets and variables > Actions. Paste the contents of .clasprc.json into the repository secret `CLASPRC_JSON`.

`CLASP_JSON_DEV`,`CLASP_JSON_PROD`
1. Go to your Apps Script project which you are using for your dev/prod environment
2. Go to settings > copy the script ID
4. Create new repository secrets for the above, using the contents of `.clasp.json.example` with the pasted script ID

`appsscript.json`
This is in the repo, but if you need to manually obtain it:
1. Go to one of your Apps Script deployments
2. Go to settings
3. Check [show "appsscript.json" manifest file in editor](https://developers.google.com/apps-script/concepts/manifests?hl=ja)

[Enable the Apps Script API](https://script.google.com/home/usersettings)
- Go to the link and switch to "on"

Now you can run the CI!

### Setting the Trigger (Deployment)

When you are ready for messages to be posted publically:

1. Go to your Apps Script deployment
2. Go to the Triggers tab
3. Add trigger > under "select timer based on hour" select "date based timer" and set to a reasonable hour of the day (like 10~11 AM)
