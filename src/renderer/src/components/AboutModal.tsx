import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

const REPO_URL = 'https://github.com/HenryMu/claude-libre'

interface AboutModalProps {
  open: boolean
  onClose: () => void
}

type CheckStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'error'

export default function AboutModal({ open, onClose }: AboutModalProps) {
  const { t } = useTranslation()
  const [version, setVersion] = useState('')
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!open) return
    window.electronAPI.getAppVersion().then(setVersion)
    setCheckStatus('idle')
    setUpdateVersion('')
    setErrorMsg('')
  }, [open])

  const handleCheckUpdate = useCallback(async () => {
    setCheckStatus('checking')
    setUpdateVersion('')
    setErrorMsg('')
    try {
      const result = await window.electronAPI.checkForUpdates()
      if (result.error) {
        setErrorMsg(result.error)
        setCheckStatus('error')
      } else if (result.updateInfo) {
        setUpdateVersion(result.updateInfo.version)
        setCheckStatus('available')
      } else {
        setCheckStatus('up-to-date')
      }
    } catch (err: any) {
      setErrorMsg(err.message || String(err))
      setCheckStatus('error')
    }
  }, [])

  const handleDownload = async () => {
    setCheckStatus('checking')
    try {
      await window.electronAPI.downloadUpdate()
    } catch {
      // downloadUpdate failed (e.g. dev mode), open GitHub releases instead
      window.electronAPI.openExternal(REPO_URL + '/releases/latest')
      setCheckStatus('idle')
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-about" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{t('about.title', 'About')}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="about-content">
            <div className="about-logo">
              <span className="about-logo-icon">C</span>
            </div>
            <h2 className="about-app-name">Claude Libre</h2>
            <p className="about-desc">
              {t('about.description', 'A free, open-source Claude Code CLI desktop session management GUI client.')}
            </p>

            <div className="about-info-grid">
              <div className="about-info-item">
                <span className="about-info-label">{t('about.version', 'Version')}</span>
                <span className="about-info-value about-version-tag">v{version}</span>
              </div>
              <div className="about-info-item">
                <span className="about-info-label">{t('about.github', 'GitHub')}</span>
                <span
                  className="about-info-value about-github-link"
                  role="button"
                  tabIndex={0}
                  onClick={e => { e.stopPropagation(); window.electronAPI.openExternal(REPO_URL) }}
                  onKeyDown={e => { if (e.key === 'Enter') window.electronAPI.openExternal(REPO_URL) }}
                >
                  HenryMu/claude-libre
                  <svg className="about-link-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                </span>
              </div>
            </div>

            <div className="about-update-section">
              {checkStatus === 'idle' && (
                <button className="about-btn about-btn-primary" onClick={handleCheckUpdate}>
                  {t('about.checkUpdate', 'Check for Updates')}
                </button>
              )}

              {checkStatus === 'checking' && (
                <div className="about-update-status">
                  <span className="about-spinner" />
                  <span>{t('about.checking', 'Checking for updates...')}</span>
                </div>
              )}

              {checkStatus === 'up-to-date' && (
                <div className="about-update-status about-status-success">
                  <span>{t('about.upToDate', 'Already up to date')}</span>
                </div>
              )}

              {checkStatus === 'available' && (
                <div className="about-update-available">
                  <span className="about-update-new-version">
                    {t('update.available', 'New version {{version}} available', { version: updateVersion })}
                  </span>
                  <button className="about-btn about-btn-primary" onClick={handleDownload}>
                    {t('update.download', 'Download')}
                  </button>
                </div>
              )}

              {checkStatus === 'error' && (
                <div className="about-update-status about-status-error">
                  <span>{errorMsg}</span>
                  <button className="about-btn about-btn-ghost" onClick={handleCheckUpdate}>
                    {t('about.retry', 'Retry')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
