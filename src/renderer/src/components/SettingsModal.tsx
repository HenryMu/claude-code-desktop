import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Editor from '@monaco-editor/react'
import type { ProfileData } from '../../../shared/types'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'editor' | 'profiles'>('editor')
  const [configText, setConfigText] = useState('')
  const [profiles, setProfiles] = useState<ProfileData[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [editProfile, setEditProfile] = useState<ProfileData | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const editorRef = useRef<any>(null)
  const profileEditorRef = useRef<any>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const loadConfigText = useCallback(async () => {
    try {
      const text = await window.electronAPI.readConfigFile()
      setConfigText(text)
    } catch { /* ignore */ }
  }, [])

  const loadProfiles = useCallback(async () => {
    try {
      const list = await window.electronAPI.listProfiles()
      setProfiles(list)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (open) {
      loadConfigText()
      loadProfiles()
      setTab('editor')
      setSelectedProfileId(null)
      setEditProfile(null)
    }
  }, [open, loadConfigText, loadProfiles])

  const handleSaveConfig = useCallback(async () => {
    try {
      await window.electronAPI.writeConfigFile(configText)
      showToast(t('settings.configSaved'))
    } catch {
      showToast(t('settings.configSaveError'))
    }
  }, [configText, t, showToast])

  const handleApplyProfile = useCallback(async (profile: ProfileData) => {
    try {
      await window.electronAPI.writeConfigFile(profile.content)
      setConfigText(profile.content)
      showToast(t('settings.applied'))
    } catch {
      showToast(t('settings.configSaveError'))
    }
  }, [t, showToast])

  const handleNewProfile = useCallback(() => {
    setEditProfile({
      id: '',
      name: '',
      content: configText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    setSelectedProfileId(null)
  }, [configText])

  const handleSaveProfile = useCallback(async () => {
    if (!editProfile) return
    try {
      await window.electronAPI.saveProfile(editProfile)
      await loadProfiles()
      showToast(t('settings.profileSaved'))
      setEditProfile(null)
    } catch {
      showToast(t('settings.configSaveError'))
    }
  }, [editProfile, loadProfiles, t, showToast])

  const handleDeleteProfile = useCallback(async (id: string) => {
    try {
      await window.electronAPI.deleteProfile(id)
      await loadProfiles()
      if (selectedProfileId === id) {
        setSelectedProfileId(null)
        setEditProfile(null)
      }
      showToast(t('settings.profileDeleted'))
    } catch { /* ignore */ }
  }, [selectedProfileId, loadProfiles, t, showToast])

  const handleEditorMount = (editor: any) => { editorRef.current = editor }
  const handleProfileEditorMount = (editor: any) => { profileEditorRef.current = editor }

  if (!open) return null

  const selectedProfile = profiles.find(p => p.id === selectedProfileId)

  const monacoOptions = {
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on' as const
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{t('settings.title')}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="tab-bar">
          <button className={`tab-item ${tab === 'editor' ? 'active' : ''}`} onClick={() => setTab('editor')}>
            {t('settings.configEditor')}
          </button>
          <button className={`tab-item ${tab === 'profiles' ? 'active' : ''}`} onClick={() => setTab('profiles')}>
            {t('settings.profiles')}
          </button>
        </div>
        <div className="modal-body">
          {tab === 'editor' && (
            <div className="editor-container">
              <Editor
                height="400px"
                language="json"
                theme="vs-dark"
                value={configText}
                onChange={v => v && setConfigText(v)}
                onMount={handleEditorMount}
                options={monacoOptions}
              />
              <div className="editor-toolbar">
                <span className="editor-path">~/.claude/settings.json</span>
                <button className="btn" onClick={handleSaveConfig}>{t('settings.saveConfig')}</button>
              </div>
            </div>
          )}

          {tab === 'profiles' && (
            <div className="profile-layout">
              <div className="profile-list">
                {profiles.length === 0 && (
                  <div className="profile-empty">{t('settings.noProfiles')}</div>
                )}
                {profiles.map(p => (
                  <div
                    key={p.id}
                    className={`profile-item ${selectedProfileId === p.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedProfileId(p.id); setEditProfile(null) }}
                  >
                    <span className={`profile-item-name ${selectedProfileId === p.id ? 'selected' : ''}`}>
                      {p.name || '(unnamed)'}
                    </span>
                    <button className="profile-apply-btn" onClick={e => { e.stopPropagation(); handleApplyProfile(p) }}>
                      {t('settings.applyProfile')}
                    </button>
                  </div>
                ))}
                <button className="profile-add-btn" onClick={handleNewProfile}>
                  + {t('settings.addProfile')}
                </button>
              </div>

              <div className="profile-form">
                {editProfile ? (
                  <>
                    <div className="config-field">
                      <label className="config-label">{t('settings.profileName')}</label>
                      <input
                        className="config-input"
                        type="text"
                        value={editProfile.name}
                        placeholder={t('settings.profileNamePlaceholder')}
                        onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                      />
                    </div>
                    <div className="profile-editor-wrapper">
                      <Editor
                        height="280px"
                        language="json"
                        theme="vs-dark"
                        value={editProfile.content}
                        onChange={v => v && setEditProfile({ ...editProfile, content: v })}
                        onMount={handleProfileEditorMount}
                        options={monacoOptions}
                      />
                    </div>
                    <div className="profile-form-actions">
                      <button className="btn" onClick={handleSaveProfile}>{t('settings.saveProfile')}</button>
                      <button className="btn btn-danger" onClick={() => setEditProfile(null)}>{t('settings.cancel')}</button>
                    </div>
                  </>
                ) : selectedProfile ? (
                  <>
                    <div className="config-field">
                      <label className="config-label">{t('settings.profileName')}</label>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{selectedProfile.name}</div>
                    </div>
                    <div className="profile-editor-wrapper">
                      <Editor
                        height="280px"
                        language="json"
                        theme="vs-dark"
                        value={selectedProfile.content}
                        options={{ ...monacoOptions, readOnly: true }}
                      />
                    </div>
                    <div className="profile-form-actions">
                      <button className="btn" onClick={() => setEditProfile({ ...selectedProfile })}>
                        {t('settings.editProfile')}
                      </button>
                      <button className="btn" onClick={() => handleApplyProfile(selectedProfile)}>
                        {t('settings.applyProfile')}
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDeleteProfile(selectedProfile.id)}>
                        {t('settings.deleteProfile')}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="profile-empty">{t('settings.selectProfileHint')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
