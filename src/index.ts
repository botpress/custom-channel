import { Client, TextChannel } from 'discord.js'
import config from './config.json'
import { MessagingClient } from '@botpress/messaging-client'

const discord = new Client({
  intents: ['GUILDS', 'DIRECT_MESSAGES', 'GUILD_MESSAGES'],
  partials: ['MESSAGE', 'CHANNEL']
})
const messaging = new MessagingClient({ ...config.messaging })

discord.once('ready', () => {
  console.log('Ready!')
})

discord.on('messageCreate', async (message) => {
  if (message.author.bot) {
    return
  }

  const conversationId = await messaging.mapEndpoint({
    channel: 'discord' as any,
    identity: '*',
    sender: message.author.id,
    thread: message.channel.id
  })

  const conversation = await messaging.getConversation(conversationId)
  await messaging.createMessage(conversationId, conversation!.userId, { type: 'text', text: message.content })
})

messaging.on('message', async ({ message }) => {
  if (message.authorId) {
    return
  }

  const endpoint = (await messaging.listEndpoints(message.conversationId)).find((x) => x.channel === 'discord')

  const channel = discord.channels.cache.find((channel) => channel.id === endpoint!.thread) as TextChannel
  await channel.send(message.payload.text)
})

discord.login(config.discord.token)
