# keijiban

Forwards emails from a whitelisted sender to a channel in a Discord server.

Pre-reqs:
- a Google Apps Script project
- a discord webhook created in the channel you want to post/test in
- a major/minor in Japanese :) (or just ask faculty to add you to the list)

### Set up CI

*Get Credentials for Clasp*

Clasp is a command-line tool used to push code to an Apps Script deployment. In order to get the creds it needs to run with in our CI, we authenticate via Clasp locally.

`CLASPRC_JSON`
1. Login into Google Apps Script using the account used for keijiban dev/prod deployments.
2. Install [Clasp](https://github.com/google/clasp) locally.
3. Run `npm run login` and go through the authentication procedure. A `.clasprc.json` will be generated, likely in your home directory.
4. Go to the GitHub repo > Settings > Secrets and variables > Actions. Paste the contents of .clasprc.json into the repository secret `CLASPRC_JSON`.

`CLASP_JSON_DEV`,`CLASP_JSON_PROD`
1. Go to/create a new Apps Script project which you are using for your dev/prod environment
2. Go to settings > copy the script ID
4. Create new repository secrets for the above, using the contents of `.clasp.json.example` with the pasted script ID

Now you can run the CI!
