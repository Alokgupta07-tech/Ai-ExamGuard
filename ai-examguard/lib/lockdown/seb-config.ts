import crypto from 'node:crypto'

export interface SebConfigOptions {
  examId: string
  examTitle: string
  startUrl: string
  quitUrl?: string
  quitPassword?: string
  allowPreferencesWindow?: boolean
  browserExamKeySalt?: string
}

/**
 * Safe Exam Browser (SEB) XML Configuration Generator & Browser Exam Key (BEK) Validator.
 * Generates official plist/xml .seb configuration documents for institutional examination kiosks.
 */
export class SebConfigService {
  /**
   * Generates official XML configuration for Safe Exam Browser.
   */
  static generateSebXml(options: SebConfigOptions): string {
    const quitUrl = options.quitUrl || `${options.startUrl}/submission-receipt`
    const hashedQuitPassword = options.quitPassword
      ? crypto.createHash('sha256').update(options.quitPassword).digest('hex')
      : ''

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>originatorVersion</key>
  <string>AI ExamGuard SEB Engine v2.0</string>
  <key>startURL</key>
  <string>${escapeXml(options.startUrl)}</string>
  <key>quitURL</key>
  <string>${escapeXml(quitUrl)}</string>
  <key>hashedQuitPassword</key>
  <string>${hashedQuitPassword}</string>
  <key>allowPreferencesWindow</key>
  <${options.allowPreferencesWindow ? 'true' : 'false'}/>
  <key>allowQuit</key>
  <true/>
  <key>browserWindowAllowReload</key>
  <false/>
  <key>browserWindowShowURL</key>
  <false/>
  <key>enableAltTab</key>
  <false/>
  <key>enableF1</key>
  <false/>
  <key>enableF2</key>
  <false/>
  <key>enableF3</key>
  <false/>
  <key>enableF4</key>
  <false/>
  <key>enableF5</key>
  <false/>
  <key>enableF6</key>
  <false/>
  <key>enableF7</key>
  <false/>
  <key>enableF8</key>
  <false/>
  <key>enableF9</key>
  <false/>
  <key>enableF10</key>
  <false/>
  <key>enableF11</key>
  <false/>
  <key>enableF12</key>
  <false/>
  <key>enablePrintScreen</key>
  <false/>
  <key>hookKeys</key>
  <true/>
  <key>killExplorerShell</key>
  <false/>
  <key>examId</key>
  <string>${escapeXml(options.examId)}</string>
</dict>
</plist>`
  }

  /**
   * Computes expected Browser Exam Key (BEK) hash for verifying client authenticity.
   */
  static computeBrowserExamKey(requestUrl: string, configXml: string, salt = ''): string {
    const raw = `${requestUrl}${configXml}${salt}`
    return crypto.createHash('sha256').update(raw).digest('hex')
  }

  /**
   * Verifies an incoming HTTP request header against the institution's expected BEK.
   */
  static verifySebRequestHeader(
    providedHeader: string | null | undefined,
    requestUrl: string,
    configXml: string,
    salt = ''
  ): boolean {
    if (!providedHeader) return false
    const expected = this.computeBrowserExamKey(requestUrl, configXml, salt)
    return crypto.timingSafeEqual(Buffer.from(providedHeader), Buffer.from(expected))
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case '\'':
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return c
    }
  })
}

