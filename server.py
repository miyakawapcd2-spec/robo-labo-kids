#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ひらめき合体！ロボ・ラボ ローカルWi-Fi配信 ＆ VOICEVOX音声合成サーバー
- PCと同じWi-Fiに接続したiPhone / iPadからフルスクリーンで遊べます。
- VOICEVOX公式コア (voicevox_core) を内蔵駆動し、別アプリ起動不要で高音質フルボイスを配信します
  （外部 VOICEVOX Engine http://127.0.0.1:50021 が起動中の場合の連携にも対応）。
- 環境変数 PORT / HOST / VOICEVOX_CORE_DIR / VOICEVOX_ENGINE_URL で切替可能。
"""
from collections import OrderedDict
import glob
import json
import os
from pathlib import Path
import socket
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CORE_DIR = BASE_DIR.parent / "tools" / "voicevox" / "core"


def detect_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            if ip and not ip.startswith("127."):
                return ip
    except Exception:
        pass
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if ip and not ip.startswith("127."):
                return ip
    except Exception:
        pass
    return "127.0.0.1"


class VoicevoxBackend:
    """VOICEVOX Core 内蔵エンジン（優先）＋ 外部 VOICEVOX Engine HTTP フォールバック + LRUキャッシュ"""

    def __init__(self):
        self.mode = "unavailable"
        self.version = ""
        self.synth = None
        self.engine_url = os.environ.get("VOICEVOX_ENGINE_URL", "http://127.0.0.1:50021").rstrip("/")
        self.speakers = []
        self.style_ids = []
        self.synth_lock = threading.Lock()
        self.cache_lock = threading.Lock()
        self.wav_cache = OrderedDict()
        self.max_cache_items = 256

    def initialize(self):
        core_dir = Path(os.environ.get("VOICEVOX_CORE_DIR", str(DEFAULT_CORE_DIR)))
        if self._try_init_core(core_dir):
            return
        self._try_init_external_engine()

    def _try_init_core(self, core_dir: Path) -> bool:
        try:
            import voicevox_core
            import voicevox_core.blocking as vvb

            if not core_dir.exists():
                return False

            ort_dlls = glob.glob(str(core_dir / "onnxruntime" / "**" / "*.dll"), recursive=True)
            if not ort_dlls:
                ort_dlls = glob.glob(str(core_dir / "onnxruntime" / "**" / "*onnxruntime*"), recursive=True)
            dict_dirs = glob.glob(str(core_dir / "dict" / "open_jtalk_dic_*"))
            vvm_files = sorted(glob.glob(str(core_dir / "models" / "**" / "*.vvm"), recursive=True))

            if not (ort_dlls and dict_dirs and vvm_files):
                return False

            ort = vvb.Onnxruntime.get()
            if ort is None:
                ort = vvb.Onnxruntime.load_once(filename=ort_dlls[0])
            ojt = vvb.OpenJtalk(dict_dirs[0])
            synth = vvb.Synthesizer(ort, ojt)

            for vvm_path in vvm_files:
                with vvb.VoiceModelFile.open(vvm_path) as model:
                    synth.load_voice_model(model)

            speakers_info = []
            style_ids = []
            for meta in synth.metas():
                styles = []
                for st in meta.styles:
                    styles.append({"id": int(st.id), "name": st.name})
                    style_ids.append(int(st.id))
                speakers_info.append({"name": meta.name, "styles": styles})

            self.synth = synth
            self.mode = "voicevox_core"
            self.version = getattr(voicevox_core, "__version__", "0.17")
            self.speakers = speakers_info
            self.style_ids = style_ids
            print(f"[VOICEVOX] 内蔵 voicevox_core ({self.version}) ロード完了！利用可能スタイル数: {len(style_ids)}")
            return True
        except Exception as exc:
            print(f"[VOICEVOX] voicevox_core 初期化スキップ: {exc}")
            return False

    def _try_init_external_engine(self) -> bool:
        try:
            with urllib.request.urlopen(f"{self.engine_url}/speakers", timeout=1.5) as resp:
                if resp.status != 200:
                    return False
                data = json.loads(resp.read().decode("utf-8"))
            speakers_info = []
            style_ids = []
            for sp in data:
                styles = []
                for st in sp.get("styles", []):
                    sid = int(st["id"])
                    styles.append({"id": sid, "name": st["name"]})
                    style_ids.append(sid)
                speakers_info.append({"name": sp.get("name", ""), "styles": styles})
            self.mode = "voicevox_engine_http"
            self.version = "http"
            self.speakers = speakers_info
            self.style_ids = style_ids
            print(f"[VOICEVOX] 外部 VOICEVOX Engine ({self.engine_url}) 接続完了！")
            return True
        except Exception:
            return False

    @property
    def is_ready(self) -> bool:
        return self.mode in ("voicevox_core", "voicevox_engine_http")

    def synthesize_wav(self, text: str, speaker_id: int = 3, speed_scale: float = 1.04) -> bytes:
        clean_text = (text or "").strip()
        if not clean_text:
            raise ValueError("text is empty")
        if len(clean_text) > 260:
            clean_text = clean_text[:260]

        if not self.is_ready:
            # 外部エンジンが後から起動された可能性を再チェック
            self._try_init_external_engine()
        if not self.is_ready:
            raise RuntimeError("VOICEVOX engine is not available")

        if self.style_ids and speaker_id not in self.style_ids:
            speaker_id = 3 if 3 in self.style_ids else self.style_ids[0]

        cache_key = (speaker_id, round(speed_scale, 2), clean_text)
        with self.cache_lock:
            if cache_key in self.wav_cache:
                self.wav_cache.move_to_end(cache_key)
                return self.wav_cache[cache_key]

        if self.mode == "voicevox_core" and self.synth is not None:
            with self.synth_lock:
                aq = self.synth.create_audio_query(clean_text, speaker_id)
                aq.speed_scale = speed_scale
                aq.volume_scale = 1.15
                wav_bytes = self.synth.synthesis(aq, speaker_id)
        else:
            q_params = urllib.parse.urlencode({"text": clean_text, "speaker": speaker_id})
            req_q = urllib.request.Request(f"{self.engine_url}/audio_query?{q_params}", method="POST")
            with urllib.request.urlopen(req_q, timeout=8) as r1:
                query_json = json.loads(r1.read().decode("utf-8"))
            query_json["speedScale"] = speed_scale
            query_json["volumeScale"] = 1.15
            body = json.dumps(query_json).encode("utf-8")
            req_s = urllib.request.Request(
                f"{self.engine_url}/synthesis?speaker={speaker_id}",
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req_s, timeout=15) as r2:
                wav_bytes = r2.read()

        with self.cache_lock:
            self.wav_cache[cache_key] = wav_bytes
            if len(self.wav_cache) > self.max_cache_items:
                self.wav_cache.popitem(last=False)
        return wav_bytes

    def warmup_async(self):
        if not self.is_ready:
            return

        def _worker():
            phrases = [
                "タッチしてくれて ありがとう！きょうは どの ほしへ いく？",
                "やったね！大せいかい！",
                "めいちゅう！すごーい！",
                "もういちど！"
            ]
            spk = 3 if 3 in self.style_ids else (self.style_ids[0] if self.style_ids else 3)
            for p in phrases:
                try:
                    self.synthesize_wav(p, spk)
                except Exception:
                    break

        threading.Thread(target=_worker, daemon=True).start()


VV_BACKEND = VoicevoxBackend()


class RoboLaboHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def _send_bytes(self, status: int, content_type: str, body: bytes):
        try:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def _send_json(self, status: int, obj: dict):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self._send_bytes(status, "application/json; charset=utf-8", raw)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/ip":
            lan_ip = detect_lan_ip()
            port = self.server.server_port
            self._send_json(200, {
                "ip": lan_ip,
                "port": port,
                "url": f"http://{lan_ip}:{port}/"
            })
            return

        if parsed.path == "/api/voicevox/status":
            self._send_json(200, {
                "ok": VV_BACKEND.is_ready,
                "mode": VV_BACKEND.mode,
                "version": VV_BACKEND.version,
                "styleIds": VV_BACKEND.style_ids,
                "speakers": VV_BACKEND.speakers
            })
            return

        if parsed.path == "/api/tts":
            qs = urllib.parse.parse_qs(parsed.query)
            text = (qs.get("text") or [""])[0].strip()
            if not text:
                self._send_json(400, {"error": "text parameter is required"})
                return
            try:
                speaker = int((qs.get("speaker") or ["3"])[0])
            except ValueError:
                speaker = 3
            try:
                speed = float((qs.get("speed") or ["1.04"])[0])
                speed = max(0.7, min(1.6, speed))
            except ValueError:
                speed = 1.04

            try:
                wav_data = VV_BACKEND.synthesize_wav(text, speaker, speed)
                self._send_bytes(200, "audio/wav", wav_data)
            except Exception as exc:
                self._send_json(503, {"error": str(exc)})
            return

        super().do_GET()

    def log_message(self, fmt, *args):
        sys.stdout.write(f"[RoboLabo] {self.address_string()} - {fmt % args}\n")


def main():
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8777"))
    no_browser = os.environ.get("NO_BROWSER", "0") == "1"

    VV_BACKEND.initialize()
    VV_BACKEND.warmup_async()

    lan_ip = detect_lan_ip()
    local_url = f"http://localhost:{port}/"
    iphone_url = f"http://{lan_ip}:{port}/"

    print("=" * 64)
    print("  🤖 ひらめき合体！ロボ・ラボ (VOICEVOX フルボイス対応サーバー)")
    print("=" * 64)
    print(f"  [VOICEVOX状態]    : {VV_BACKEND.mode} ({len(VV_BACKEND.style_ids)} スタイル利用可能)")
    print(f"  [PCで開くURL]     : {local_url}")
    print(f"  [iPhoneで開くURL] : {iphone_url}")
    print("  ※ PC画面右上の「📱おうちのひと」ボタンからQRコードを表示し、")
    print("     iPhoneの標準カメラで読み取るとワンタップで開けます！")
    print("  ※ 音声クレジット: VOICEVOX:ずんだもん / 青山龍星 / 白上虎太郎 / 春日部つむぎ / 四国めたん")
    print("=" * 64)

    server = ThreadingHTTPServer((host, port), RoboLaboHandler)
    if not no_browser:
        try:
            webbrowser.open(local_url)
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nサーバーを終了しました。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
