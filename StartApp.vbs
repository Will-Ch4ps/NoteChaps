Set fso = CreateObject("Scripting.FileSystemObject")
Set wshShell = CreateObject("WScript.Shell")

baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
prodExe = baseDir & "\release\win-unpacked\NoteChaps.exe"

If fso.FileExists(prodExe) Then
  wshShell.Run """" & prodExe & """", 1, False
Else
  ' Fallback to dev with visible console so startup errors are not hidden.
  wshShell.Run "cmd /k cd /d """ & baseDir & """ && npm run dev", 1, False
End If

Set wshShell = Nothing
Set fso = Nothing
