@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================================
echo   VOICEVOX Core ローカル開発環境セットアップ
echo   ※通常のゲームプレイには事前生成ボイスパックが同梱されているため不要です。
echo   ※別PCでボイスパックを再生成・サーバー合成したい場合のみ実行してください。
echo ================================================================
set VV_DIR=%~dp0..\tools\voicevox
if not exist "%VV_DIR%" mkdir "%VV_DIR%"
echo.
echo 1. voicevox_core Pythonパッケージをインストール中...
python -m pip install "https://github.com/VOICEVOX/voicevox_core/releases/download/0.17.1/voicevox_core-0.17.1-cp310-abi3-win_amd64.whl"
echo.
echo 2. VOICEVOX ダウンローダを取得し、利用規約確認の上モデルを導入します...
if not exist "%VV_DIR%\download-windows-x64.exe" (
  curl.exe -sSL "https://github.com/VOICEVOX/voicevox_core/releases/download/0.17.1/download-windows-x64.exe" -o "%VV_DIR%\download-windows-x64.exe"
)
"%VV_DIR%\download-windows-x64.exe" --only onnxruntime dict models --models-pattern "0.vvm" -o "%VV_DIR%\core"
curl.exe -sSL "https://github.com/VOICEVOX/voicevox_vvm/releases/download/0.17.1/9.vvm" -o "%VV_DIR%\core\models\vvms\9.vvm"
curl.exe -sSL "https://github.com/VOICEVOX/voicevox_vvm/releases/download/0.17.1/15.vvm" -o "%VV_DIR%\core\models\vvms\15.vvm"
echo.
echo セットアップが完了しました！
pause
