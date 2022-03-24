import { Client, TextChannel } from 'discord.js'
import config from './config.json'
import { MessagingClient } from '@botpress/messaging-client'
import express from 'express'

const app = express()
app.use(express.json())

const messaging = new MessagingClient({ ...config.messaging })
messaging.setup(app)

const port = 3124
app.listen(port)
console.log(`listening on port ${port}`)

const discord = new Client({
  intents: ['GUILDS', 'DIRECT_MESSAGES', 'GUILD_MESSAGES'],
  partials: ['MESSAGE', 'CHANNEL']
})

discord.once('ready', () => {
  console.log(`discord logged in as ${discord.user!.username} (${discord.user!.id})`)
})

discord.on('messageCreate', async (message) => {
  if (message.author.bot) {
    return
  }

  const conversationId = await messaging.mapEndpoint({
    channel: 'discord',
    identity: discord.user!.id,
    sender: message.author.id,
    thread: message.channel.id
  })
  const { userId } = (await messaging.getConversation(conversationId))!

  const sent = await messaging.createMessage(conversationId, userId, { type: 'text', text: message.content })
  console.log('sent', sent)
})

messaging.on('message', async ({ message }) => {
  if (message.authorId) {
    return
  }

  const [endpoint] = await messaging.listEndpoints(message.conversationId)

  const channel = discord.channels.cache.get(endpoint.thread) as TextChannel
  await channel.send(message.payload.text)
  console.log('received', message)
})

discord.login(config.discord.token)
