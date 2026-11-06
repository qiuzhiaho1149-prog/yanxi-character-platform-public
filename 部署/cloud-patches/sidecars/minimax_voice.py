#!/usr/bin/env python3
"""MiniMax 音色复刻 + TTS（云端小工具）。
用法:
  python minimax_voice.py clone <参考音频> [voice_id]
  python minimax_voice.py tts <文本> <输出mp3> [emotion] [speed] [pitch]
依赖: requests；环境变量 MINIMAX_API_KEY；可选 MINIMAX_GROUP_ID / MINIMAX_VOICE_ID。
"""
import json, os, sys, requests

BASE = "https://api.minimax.cn"
KEY = os.environ.get("MINIMAX_API_KEY", "").strip()
GROUP = os.environ.get("MINIMAX_GROUP_ID", "").strip()
VOICE = os.environ.get("MINIMAX_VOICE_ID", "yanxiClone01").strip() or "yanxiClone01"

def headers():
    if not KEY:
        raise SystemExit("缺少 MINIMAX_API_KEY")
    return {"Authorization": "Bearer " + KEY}

def upload(path, purpose):
    with open(path, "rb") as f:
        r = requests.post(BASE + "/v1/files/upload", headers=headers(),
                          data={"purpose": purpose},
                          files={"file": (os.path.basename(path), f)}, timeout=120)
    r.raise_for_status()
    data = r.json()
    fid = (data.get("file") or {}).get("file_id")
    if not fid:
        raise SystemExit("上传失败: " + json.dumps(data, ensure_ascii=False)[:1000])
    return fid

def clone(ref, voice_id):
    fid = upload(ref, "voice_clone")
    body = {"file_id": fid, "voice_id": voice_id}
    if GROUP:
        body["group_id"] = GROUP
    r = requests.post(BASE + "/v1/voice_clone", headers={**headers(), "Content-Type": "application/json"},
                      data=json.dumps(body), timeout=180)
    r.raise_for_status()
    print(json.dumps(r.json(), ensure_ascii=False))
    return voice_id

def tts(text, out, emotion="", speed=1.0, pitch=0, sound_effect="", intensity=0, timbre=0):
    vs = {"voice_id": VOICE, "speed": float(speed), "vol": 1.0, "pitch": int(pitch)}
    if emotion:
        vs["emotion"] = emotion
    body = {
        "model": "speech-2.8-hd",
        "text": text,
        "stream": False,
        "voice_setting": vs,
        "audio_setting": {"audio_sample_rate": 32000, "bitrate": 128000, "format": "mp3"},
    }
    modify = {}
    if sound_effect:
        modify["sound_effects"] = sound_effect
    if int(intensity):
        modify["intensity"] = max(-100, min(100, int(intensity)))
    if int(timbre):
        modify["timbre"] = max(-100, min(100, int(timbre)))
    if modify:
        body["voice_modify"] = modify
    r = requests.post(BASE + "/v1/t2a_v2", headers={**headers(), "Content-Type": "application/json"},
                      data=json.dumps(body), timeout=180)
    r.raise_for_status()
    data = r.json()
    audio = ((data.get("data") or {}).get("audio") or "").strip()
    if not audio:
        raise SystemExit("TTS 没有 audio: " + json.dumps(data, ensure_ascii=False)[:1500])
    with open(out, "wb") as f:
        f.write(bytes.fromhex(audio))
    print(out)

if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "clone":
        ref = sys.argv[2]; vid = sys.argv[3] if len(sys.argv) > 3 else VOICE
        clone(ref, vid)
    elif len(sys.argv) >= 4 and sys.argv[1] == "tts":
        emotion = sys.argv[4] if len(sys.argv) > 4 else ""
        speed = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
        pitch = int(float(sys.argv[6])) if len(sys.argv) > 6 else 0
        sound_effect = sys.argv[7] if len(sys.argv) > 7 else ""
        intensity = int(float(sys.argv[8])) if len(sys.argv) > 8 else 0
        timbre = int(float(sys.argv[9])) if len(sys.argv) > 9 else 0
        tts(sys.argv[2], sys.argv[3], emotion, speed, pitch, sound_effect, intensity, timbre)
    else:
        print(__doc__); sys.exit(2)
