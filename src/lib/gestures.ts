import { OsEventTypeList as E } from '@evenrealities/even_hub_sdk'

type Envelope = { eventType?: E }
export function gestureOf(event: { sysEvent?: Envelope; textEvent?: Envelope }): 'back' | 'next' | 'previous' | 'tap' | 'foreground' | 'exit' | null {
  const types = [event.sysEvent, event.textEvent].filter((value): value is Envelope => Boolean(value)).map(value => value.eventType ?? E.CLICK_EVENT)
  if (types.includes(E.DOUBLE_CLICK_EVENT)) return 'back'
  if (types.includes(E.SYSTEM_EXIT_EVENT) || types.includes(E.ABNORMAL_EXIT_EVENT)) return 'exit'
  if (types.includes(E.SCROLL_BOTTOM_EVENT)) return 'next'
  if (types.includes(E.SCROLL_TOP_EVENT)) return 'previous'
  if (types.includes(E.FOREGROUND_ENTER_EVENT)) return 'foreground'
  return types.includes(E.CLICK_EVENT) ? 'tap' : null
}
