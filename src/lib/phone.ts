import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

export function formatPhoneNumber(phoneNumber: string, countryCode?: string): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, countryCode as any)
    return parsed.format('E.164') // Returns +1234567890 format
  } catch (error) {
    throw new Error('Invalid phone number format')
  }
}

export function validatePhoneNumber(phoneNumber: string, countryCode?: string): boolean {
  try {
    return isValidPhoneNumber(phoneNumber, countryCode as any)
  } catch (error) {
    return false
  }
}

export function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length < 4) return phoneNumber
  const masked = phoneNumber.slice(0, -4).replace(/\d/g, '*') + phoneNumber.slice(-4)
  return masked
}

// Generate default avatar for phone users
export function generatePhoneAvatar(phoneNumber: string): string {
  const lastFour = phoneNumber.slice(-4)
  const colors = [
    '3B82F6', '10B981', 'F59E0B', 'EF4444', 
    '8B5CF6', '06B6D4', 'F97316', 'EC4899'
  ]
  
  const colorIndex = phoneNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const backgroundColor = colors[colorIndex]
  
  return `https://ui-avatars.com/api/?name=${lastFour}&background=${backgroundColor}&color=ffffff&size=200&bold=true`
}
