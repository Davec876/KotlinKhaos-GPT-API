# Create a new GPT conversation utilizing a prompt
POST /android-problem/:userId?prompt="yourPrompt"

# Get a GPT conversation by Id
GET /android-problem/:userId/:conversationId

# Give GPT feedback to a user's answer
POST /android-problem/:userId/:conversationId

    JSON {
        answer: "yourAnswer"
    }

# POST GPT continue a conversation
POST /android-problem/:userId/:conversationId/continue
