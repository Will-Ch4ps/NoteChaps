Set WshShell = CreateObject("WScript.Shell")
' O número 0 no final significa "esconda a janela"
WshShell.Run "npm run dev", 0, False
Set WshShell = Nothing