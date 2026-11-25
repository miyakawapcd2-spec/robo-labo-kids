# ひらめき合体！ロボ・ラボ ほしのたんけんたい

4歳と7歳の男の子向け（1人プレイ＆2人同時協力タッグ対応）のiPhone知育PWAゲームです。

## 📱 パソコンの電源をつけずに iPhone 単体・オフラインで遊ぶ方法

1. iPhone の **Safari** で公開HTTPSページを開きます：
   - `https://miyakawapcd2-spec.github.io/robo-labo-kids/`
2. 画面下の共有ボタン **`[⬆️]` → `[ホーム画面に追加]`** をタップします。
3. Service Worker によりゲーム本体と **事前生成済みVOICEVOXボイスパック（MP3スプライト）** がiPhone内に保存されるため、以降は **PCの電源が切れていても・外出先のオフライン状態でも** フルボイスで遊べます。
4. 音が出ない場合は、iPhone側面の **消音スイッチ（マナーモード）** を解除し、音量を上げてください。

## 💻 ローカルPCで開発サーバーを起動する場合（任意）

- `start_game.bat` をダブルクリックすると `http://localhost:8777/` で起動します。
- 別のPCへ移動してローカル動的合成を行う場合は `setup_voicevox.bat` を実行してください。またローカルWi-Fi経由でiPhoneからPCへ直接接続する場合は、Windowsファイアウォールで Python のプライベートネットワーク通信を許可してください。

## 🎙️ 音声合成クレジット（VOICEVOX利用規約に基づく表記）

- VOICEVOX:ずんだもん
- VOICEVOX:青山龍星
- VOICEVOX:白上虎太郎
- VOICEVOX:春日部つむぎ
- VOICEVOX:四国めたん
- VOICEVOX:雨晴はう
