See https://kotlin-khaos-api.maximoguk.com/docs for a documented list of routes!

## Quick Start:

```bash
# Install dependencies
npm install

# Install wrangler
npm install -g wrangler
```

# Prior to running development server you'll need the following configured

```bash
# .dev.vars
# Options are true or false (default is false)
GPT_4=
# Populate with your openai api key https://platform.openai.com/account/api-keys
OPENAI_API_TOKEN=
# Populate with your firebase api key https://console.cloud.google.com/apis/credentials?project={firebase-project-name}
FIREBASE_API_KEY=
```

You'll also want to create a firebase-secret.json in the root of your project

- This is just a renamed google-services.json https://support.google.com/firebase/answer/7015592?hl=en

# Start development server

```bash
wrangler dev
```
