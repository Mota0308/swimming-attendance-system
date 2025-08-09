!macro customInstall
  ; 创建开始菜单快捷方式
  CreateDirectory "$SMPROGRAMS\游泳課程出席管理系統"
  CreateShortCut "$SMPROGRAMS\游泳課程出席管理系統\游泳課程出席管理系統.lnk" "$INSTDIR\游泳課程出席管理系統.exe"
  CreateShortCut "$SMPROGRAMS\游泳課程出席管理系統\卸载.lnk" "$INSTDIR\Uninstall.exe"
  
  ; 写入注册表信息
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\游泳課程出席管理系統" "DisplayName" "游泳課程出席管理系統"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\游泳課程出席管理系統" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\游泳課程出席管理系統" "DisplayIcon" "$INSTDIR\游泳課程出席管理系統.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\游泳課程出席管理系統" "Publisher" "Swimming Attendance System"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\游泳課程出席管理系統" "DisplayVersion" "1.0.0"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\游泳課程出席管理系統" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\游泳課程出席管理系統" "NoRepair" 1
  
  ; 创建数据目录
  CreateDirectory "$LOCALAPPDATA\游泳課程出席管理系統"
  CreateDirectory "$LOCALAPPDATA\游泳課程出席管理系統\logs"
  CreateDirectory "$LOCALAPPDATA\游泳課程出席管理系統\data"
  
  ; 复制后端文件到数据目录
  CopyFiles /SILENT "$INSTDIR\resources\backend\*" "$LOCALAPPDATA\游泳課程出席管理系統\backend\"
!macroend

!macro customUnInstall
  ; 删除开始菜单快捷方式
  Delete "$SMPROGRAMS\游泳課程出席管理系統\游泳課程出席管理系統.lnk"
  Delete "$SMPROGRAMS\游泳課程出席管理系統\卸载.lnk"
  RMDir "$SMPROGRAMS\游泳課程出席管理系統"
  
  ; 删除注册表信息
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\游泳課程出席管理系統"
  
  ; 删除数据目录（可选，保留用户数据）
  ; RMDir /r "$LOCALAPPDATA\游泳課程出席管理系統"
!macroend 