import { Client, TextChannel } from 'discord.js'
import config from './config.json'
import { MessagingClient } from '@botpress/messaging-client'
import express from 'express'

// we setup an express server to receive webhooks
const app = express()
app.use(express.json())

const messaging = new MessagingClient({ ...config.messaging })
// creates a route handler for POST requests on /callback to handle webhooks
// the webhook pointing here is assumed to be created before
messaging.setup(app, '/callback')

// setup discord.js to receive and send messages to discord
const discord = new Client({
  intents: ['GUILDS', 'DIRECT_MESSAGES', 'GUILD_MESSAGES'],
  partials: ['MESSAGE', 'CHANNEL']
})

discord.once('ready', () => {
  console.log(`discord logged in as ${discord.user!.username} (${discord.user!.id})`)
})

discord.on('messageCreate', async (message) => {
  if (message.author.bot) {
    // we ignore bot messages
    return
  }

  // obtain a conversation id by mapping user information
  const conversationId = await messaging.mapEndpoint({
    channel: 'discord',
    identity: discord.user!.id,
    sender: message.author.id,
    thread: message.channel.id
  })
  const { userId } = (await messaging.getConversation(conversationId))!

  // sends a text message to messaging using the ids we obtained above
  const sent = await messaging.createMessage(conversationId, userId, { type: 'text', text: message.content })

  console.log('sent', sent)
})

// adds an event listener for message webhooks
messaging.on('message', async ({ message }) => {
  if (message.authorId) {
    // we ingore user messages
    return
  }

  // we get back our endpoint using the conversation id
  const [endpoint] = await messaging.listEndpoints(message.conversationId)

  // send message to that endpoint
  const channel = discord.channels.cache.get(endpoint.thread) as TextChannel
  await channel.send(message.payload.text)

  console.log('received', message)
})

discord.login(config.discord.token)
app.listen(3124)

console.log(`listening on port 3124`)
