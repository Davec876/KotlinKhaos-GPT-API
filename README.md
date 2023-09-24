# Create a new GPT conversation utilizing a prompt
POST /android-problem?prompt="yourPrompt"

# Get a GPT conversation by Id
GET /android-problem/:conversationId

# Give GPT feedback to a user's answer
POST /android-problem/:conversationId

    JSON {
        answer: "yourAnswer"
    }

# POST GPT continue a conversation
POST /android-problem/:conversationId/continue
