import { SupportedLocale } from '../store/LocaleProvider'

export default interface LocaleInfo {
  locale: SupportedLocale
  label: string
  icon: string
}
