; Nova Launcher hooks for the electron-builder NSIS installer (package.json → build.nsis.include).
;
; An update replaces the files of the installed copy. That fails, and can leave Nova half removed,
; when a program still has a file of the installation open, or when something starts Nova again while
; its files are being replaced: AnyFSE, "Start Nova at sign-in", or the updater's own relaunch.
; So, before the old version is removed:
;   1. Nova's executable is renamed, so nothing can start it until the new one is in place;
;   2. every process running from the installation folder (Nova, DiscordAdapter, the bundled node,
;      NovaDevices) gets a few seconds to close by itself during an update, and is then closed.
; If either step is impossible, the original name is restored, the installed copy is left untouched
; and, for a silent update, that copy is started again.

!macro novaRestoreExecutable
  ${If} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}.updating"
  ${AndIfNot} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    Rename "$INSTDIR\${APP_EXECUTABLE_FILENAME}.updating" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  ${EndIf}
  ClearErrors
!macroend

!macro novaStartInstalledCopy
  ${If} ${Silent}
  ${AndIf} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    Exec '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  ${EndIf}
!macroend

!macro customCheckAppRunning
  ; The folder reaches PowerShell through the environment, so no path can break the command line.
  System::Call 'Kernel32::SetEnvironmentVariable(t "NOVA_INSTDIR", t "$INSTDIR")i'
  ; $R8 exits with the number of processes running from the folder; $R9 closes them.
  StrCpy $R8 `"$PowerShellPath" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$$d=[IO.Path]::GetFullPath($$env:NOVA_INSTDIR).TrimEnd('\')+'\'; exit @(Get-CimInstance Win32_Process | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$d,[StringComparison]::OrdinalIgnoreCase) }).Count"`
  StrCpy $R9 `"$PowerShellPath" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$$d=[IO.Path]::GetFullPath($$env:NOVA_INSTDIR).TrimEnd('\')+'\'; Get-CimInstance Win32_Process | Where-Object { $$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$d,[StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"`
  StrCpy $R7 0
  ${If} ${isUpdated}
    StrCpy $R7 1
  ${EndIf}

  nsExec::Exec $R8
  Pop $R0
  ${If} $R0 != 0
  ${AndIf} $R7 == 0
  ${AndIfNot} ${Silent}
    ; Installed by hand while Nova is open: ask before closing it, as electron-builder does.
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" IDOK +2
    Quit
  ${EndIf}

  DetailPrint "$(appClosing)"
  ; Renaming works even while the file is running; from here on nothing can start the old copy.
  ${If} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    Rename "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "$INSTDIR\${APP_EXECUTABLE_FILENAME}.updating"
  ${EndIf}
  ClearErrors

  StrCpy $R1 0
  ${Do}
    nsExec::Exec $R8
    Pop $R0
    ${If} $R0 == 0
      ${ExitDo}
    ${EndIf}
    ${If} $R0 == "error"
    ${OrIf} $R0 == "timeout"
      ; PowerShell is not usable: close Nova's own executables by name instead.
      nsExec::Exec `"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
      Pop $R0
      nsExec::Exec `"$SYSDIR\taskkill.exe" /F /IM "DiscordAdapter.exe"`
      Pop $R0
      nsExec::Exec `"$SYSDIR\taskkill.exe" /F /IM "NovaDevices.exe"`
      Pop $R0
      Sleep 2000
      ${ExitDo}
    ${EndIf}
    IntOp $R1 $R1 + 1
    ; During an update Nova closes by itself after saving (up to about six seconds); then it is closed.
    ${If} $R7 == 0
    ${OrIf} $R1 > 12
      nsExec::Exec $R9
      Pop $R0
    ${EndIf}
    ${If} $R1 > 40
      !insertmacro novaRestoreExecutable
      MessageBox MB_OK|MB_ICONEXCLAMATION "$(appCannotBeClosed)"
      !insertmacro novaStartInstalledCopy
      SetErrorLevel 2
      Quit
    ${EndIf}
    Sleep 500
  ${Loop}
  ; Give Windows a moment to release the file handles of the closed processes.
  Sleep 1000
!macroend

; Replaces electron-builder's handling of a failed removal of the old version: the old copy is
; put back in a startable state instead of being left without its executable.
!macro customUnInstallCheck
  ${If} ${Errors}
    DetailPrint `Uninstall was not successful. Not able to launch uninstaller!`
  ${ElseIf} $R0 != 0
    !insertmacro novaRestoreExecutable
    MessageBox MB_OK|MB_ICONEXCLAMATION "$(uninstallFailed): $R0"
    DetailPrint `Uninstall was not successful. Uninstaller error code: $R0.`
    !insertmacro novaStartInstalledCopy
    SetErrorLevel 2
    Quit
  ${EndIf}
!macroend
