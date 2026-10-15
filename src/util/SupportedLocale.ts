export enum SupportedLocale {
  EN_US = 'enUS',
  RO_RO = 'roRO'
}

/**
 * The dayjs locale name for one of ours.
 *
 * dayjs spells its locales differently from the app, and every calendar, dialog and card that
 * formats a date needs the translation. Fifteen components had worked it out for themselves —
 * three different spellings of the same ternary — which is fifteen places to miss when a third
 * language arrives.
 */
export function toDayjsLocale(locale: SupportedLocale | string): string {
  return locale === SupportedLocale.RO_RO ? 'ro' : 'en'
}
