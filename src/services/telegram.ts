export interface TelegramBotConfig {
  botToken: string
  chatId: string
}

export interface PromotionMessage {
  text: string
  images?: string[]
  parseMode?: 'HTML' | 'Markdown'
  replyMarkup?: any
}

export const telegramService = {
  async sendPromotionMessage(
    config: TelegramBotConfig, 
    message: PromotionMessage
  ): Promise<boolean> {
    try {
      const { botToken, chatId } = config
      const baseUrl = `https://api.telegram.org/bot${botToken}`

      if (message.images && message.images.length > 0) {
        // Send as media group if multiple images
        if (message.images.length > 1) {
          const media = message.images.map((url, index) => ({
            type: 'photo',
            media: url,
            caption: index === 0 ? message.text : undefined,
            parse_mode: message.parseMode || 'HTML'
          }))

          const response = await fetch(`${baseUrl}/sendMediaGroup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              media: media
            })
          })

          return response.ok
        } else {
          // Send single photo with caption
          const response = await fetch(`${baseUrl}/sendPhoto`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              photo: message.images[0],
              caption: message.text,
              parse_mode: message.parseMode || 'HTML',
              reply_markup: message.replyMarkup
            })
          })

          return response.ok
        }
      } else {
        // Send text message only
        const response = await fetch(`${baseUrl}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message.text,
            parse_mode: message.parseMode || 'HTML',
            reply_markup: message.replyMarkup
          })
        })

        return response.ok
      }
    } catch (error) {
      console.error('Error sending Telegram message:', error)
      return false
    }
  },

  async scheduleMessage(
    config: TelegramBotConfig,
    message: PromotionMessage,
    scheduledDate: Date
  ): Promise<boolean> {
    // For now, we'll store scheduled messages in localStorage
    // In a real app, you'd want to use a proper scheduling service
    const scheduledMessages = JSON.parse(
      localStorage.getItem('scheduledPromotions') || '[]'
    )

    const scheduledPromotion = {
      id: Date.now().toString(),
      config,
      message,
      scheduledDate: scheduledDate.toISOString(),
      status: 'scheduled'
    }

    scheduledMessages.push(scheduledPromotion)
    localStorage.setItem('scheduledPromotions', JSON.stringify(scheduledMessages))

    // Set timeout for immediate scheduling (for demo purposes)
    const timeUntilSend = scheduledDate.getTime() - Date.now()
    if (timeUntilSend > 0 && timeUntilSend < 24 * 60 * 60 * 1000) { // Within 24 hours
      setTimeout(async () => {
        const success = await this.sendPromotionMessage(config, message)
        if (success) {
          // Update status in localStorage
          const updatedMessages = JSON.parse(
            localStorage.getItem('scheduledPromotions') || '[]'
          )
          const messageIndex = updatedMessages.findIndex(
            (m: any) => m.id === scheduledPromotion.id
          )
          if (messageIndex !== -1) {
            updatedMessages[messageIndex].status = 'sent'
            localStorage.setItem('scheduledPromotions', JSON.stringify(updatedMessages))
          }
        }
      }, timeUntilSend)
    }

    return true
  }
}