/**
 * Utility functions for generating and handling shop-specific Mini App links
 */

export interface ShopLinkOptions {
  botUsername?: string
  includeDescription?: boolean
  customMessage?: string
}

export const shopLinkUtils = {
  /**
   * Generate a shop-specific Mini App link
   * @param shopId - The shop ID
   * @param options - Additional options for link generation
   * @returns The complete Telegram Mini App link
   */
  generateShopLink(shopId: string, options: ShopLinkOptions = {}): string {
    const botUsername = options.botUsername || import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'YourBot'
    return `https://t.me/${botUsername}?start=${shopId}`
  },

  /**
   * Generate a shareable message for a shop
   * @param shop - The shop object
   * @param options - Additional options for message generation
   * @returns The formatted share message
   */
  generateShareMessage(shop: any, options: ShopLinkOptions = {}): string {
    const link = this.generateShopLink(shop.id, options)
    const customMessage = options.customMessage || ''
    
    let message = `🛍️ **${shop.name}**\n\n`
    
    if (options.includeDescription && shop.description) {
      message += `${shop.description}\n\n`
    }
    
    if (customMessage) {
      message += `${customMessage}\n\n`
    }
    
    // Add business info if available
    if (shop.businessInfo) {
      if (shop.businessInfo.address) {
        message += `📍 ${shop.businessInfo.address}\n`
      }
      if (shop.businessInfo.phone) {
        message += `📞 ${shop.businessInfo.phone}\n`
      }
      if (shop.businessInfo.website) {
        message += `🌐 ${shop.businessInfo.website}\n`
      }
      message += '\n'
    }
    
    // Add operating hours if available
    if (shop.settings?.businessHours) {
      const { open, close, days } = shop.settings.businessHours
      if (days && days.length > 0) {
        message += `🕒 Open: ${open} - ${close}\n`
        message += `📅 Days: ${days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}\n\n`
      }
    }
    
    message += `🚀 Browse our catalog: ${link}`
    
    return message
  },

  /**
   * Parse shop ID from a Mini App link
   * @param link - The Telegram Mini App link
   * @returns The shop ID or null if not found
   */
  parseShopIdFromLink(link: string): string | null {
    try {
      const url = new URL(link)
      const startParam = url.searchParams.get('start')
      return startParam || null
    } catch (error) {
      console.error('Error parsing shop link:', error)
      return null
    }
  },

  /**
   * Validate if a link is a valid shop Mini App link
   * @param link - The link to validate
   * @returns True if valid, false otherwise
   */
  isValidShopLink(link: string): boolean {
    try {
      const url = new URL(link)
      return url.hostname === 't.me' && url.searchParams.has('start')
    } catch (error) {
      return false
    }
  },

  /**
   * Generate QR code URL for a shop link (using a free QR service)
   * @param shopId - The shop ID
   * @param options - Additional options
   * @returns QR code image URL
   */
  generateQRCodeUrl(shopId: string, options: ShopLinkOptions = {}): string {
    const link = this.generateShopLink(shopId, options)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`
  },

  /**
   * Copy shop link to clipboard with fallback
   * @param shopId - The shop ID
   * @param shopName - The shop name for success message
   * @param options - Additional options
   */
  async copyShopLinkToClipboard(shopId: string, shopName: string, options: ShopLinkOptions = {}): Promise<void> {
    const link = this.generateShopLink(shopId, options)
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = link
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      
      // Show success message
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(`${shopName} link copied to clipboard!`)
      } else {
        alert(`${shopName} link copied to clipboard!`)
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      throw error
    }
  }
}