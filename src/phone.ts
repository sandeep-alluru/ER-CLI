import { pair, ask, isPaired, unpair, bridgeBase, setBridgeUrl, health } from './lib/bridge'

// The phone half of the app.
//
// The G2 has no keyboard — the touchpad reports taps and scrolls, nothing more.
// So the prompt is typed here, in the companion WebView, and the answer is
// rendered on the lenses. This screen is the keyboard.

export interface PhoneCallbacks {
  onStatus(text: string): void
  onAnswer(text: string): void
  onError(text: string): void
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] => {
  const node = Object.assign(document.createElement(tag), props)
  for (const c of children) node.append(c)
  return node
}

export function mountPhoneUI(root: HTMLElement, cb: PhoneCallbacks): void {
  const render = () => {
    root.replaceChildren(isPaired() ? askView() : pairView())
  }

  /**
   * The bridge address, editable on the device.
   *
   * An installed build uses the Even Hub host rather than the bridge machine.
   * Configure an HTTPS address reachable from the phone. A saved address takes
   * precedence over the build-time default; Save & test checks reachability.
   */
  function bridgeUrlRow(): HTMLElement {
    const field = el('input', {
      className: 'url',
      value: bridgeBase(),
      spellcheck: false,
      autocapitalize: 'off',
      autocomplete: 'off',
    })
    const test = el('button', { className: 'link', textContent: 'Save & test' })
    const out = el('p', { className: 'tiny' })

    test.onclick = async () => {
      out.textContent = 'Testing…'
      await setBridgeUrl(field.value)
      out.textContent = (await health())
        ? `Reachable: ${bridgeBase()}`
        : `No answer from ${bridgeBase()}`
    }

    return el('details', { className: 'settings' }, [
      el('summary', { textContent: 'Bridge address' }),
      field,
      test,
      out,
    ])
  }

  function pairView(): HTMLElement {
    const status = el('p', { className: 'status' })
    const input = el('input', {
      className: 'code',
      placeholder: 'ABC123',
      maxLength: 6,
      autocapitalize: 'characters',
      autocomplete: 'off',
      spellcheck: false,
    })
    const button = el('button', { className: 'primary', textContent: 'Pair this phone' })

    button.onclick = async () => {
      const code = input.value.trim()
      if (code.length !== 6) {
        status.textContent = 'The code is 6 characters.'
        return
      }
      button.disabled = true
      status.textContent = 'Pairing…'
      try {
        await pair(code, navigator.userAgent.includes('iPhone') ? 'iPhone' : 'phone')
        cb.onStatus('Paired')
        render()
      } catch (e) {
        status.textContent = e instanceof Error ? e.message : String(e)
        button.disabled = false
      }
    }

    return el('div', { className: 'card' }, [
      el('h1', { textContent: 'G2 Claude' }),
      el('p', {
        className: 'muted',
        textContent:
          'Run the bridge on your machine, then enter the pairing code it prints. ' +
          'Codes are single-use and expire in 5 minutes.',
      }),
      input,
      button,
      status,
      bridgeUrlRow(),
    ])
  }

  function askView(): HTMLElement {
    const status = el('p', { className: 'status' })
    const answer = el('pre', { className: 'answer' })
    const box = el('textarea', {
      className: 'prompt',
      placeholder: 'Ask Claude Code anything about your machine…',
      rows: 4,
    })
    const button = el('button', { className: 'primary', textContent: 'Ask' })

    const submit = async () => {
      const prompt = box.value.trim()
      if (!prompt) return
      button.disabled = true
      status.textContent = 'Thinking…'
      answer.textContent = ''
      cb.onStatus('Thinking…')
      const started = Date.now()
      try {
        const text = await ask(prompt)
        const secs = ((Date.now() - started) / 1000).toFixed(1)
        status.textContent = `Answered in ${secs}s`
        answer.textContent = text
        cb.onAnswer(text)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        status.textContent = msg
        cb.onError(msg)
        if (!isPaired()) render() // token was rejected — back to pairing
      } finally {
        button.disabled = false
      }
    }

    button.onclick = submit
    // Cmd/Ctrl+Enter sends, so a hardware keyboard can drive it too.
    box.onkeydown = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
    }

    const unpairBtn = el('button', { className: 'link', textContent: 'Unpair' })
    unpairBtn.onclick = async () => {
      await unpair()
      render()
    }

    return el('div', { className: 'card' }, [
      el('h1', { textContent: 'G2 Claude' }),
      box,
      button,
      status,
      answer,
      bridgeUrlRow(),
      unpairBtn,
    ])
  }

  render()

  // Surface an unreachable bridge immediately — otherwise the first Ask just
  // hangs and looks like Claude is slow rather than the machine being asleep.
  void health().then((ok) => {
    if (!ok) cb.onError(`Bridge unreachable\n${bridgeBase()}`)
  })
}
