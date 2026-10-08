import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import isLeapYear from 'dayjs/plugin/isLeapYear'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import localeData from 'dayjs/plugin/localeData'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import minMax from 'dayjs/plugin/minMax'
import updateLocale from 'dayjs/plugin/updateLocale'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/ro'
import { dayjsLocalizer } from 'react-big-calendar'

// Single dayjs configuration for every react-big-calendar instance in the app.
//
// dayjsLocalizer needs this plugin set, and the locale needs a Monday week start in both
// languages. Doing it per component meant the setup only ran if that component happened to
// be imported — a calendar rendered on its own would silently fall back to a Sunday week
// start, which does not match AvailabilityBlock's 0=Mon convention.
//
// Importing this module applies the configuration as a side effect, so any file that needs
// configured dayjs can simply import `localizer` from here.

dayjs.extend(isBetween)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(localeData)
dayjs.extend(localizedFormat)
dayjs.extend(minMax)
dayjs.extend(utc)
dayjs.extend(isLeapYear)
dayjs.extend(updateLocale)

// Romanian already starts its week on Monday; English does not.
dayjs.updateLocale('en', { weekStart: 1 })

export const localizer = dayjsLocalizer(dayjs)
