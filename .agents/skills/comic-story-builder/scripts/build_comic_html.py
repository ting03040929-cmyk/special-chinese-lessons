# -*- coding: utf-8 -*-
"""
build_comic_html.py
自動建置課文逐句情境連環漫畫與繪本網頁 (單檔獨立 HTML)
- 使用 edge-tts 合成 zh-TW-HsiaoChenNeural @ 0.8x 語速 (rate="-20%")
- 圖片與音訊 Base64 內嵌
- 支援雙模式切換 (4x2 連環漫畫網格 + 滿版大圖繪本)
- 支援播放/暫停/繼續/停止/單格朗讀
"""

import os
import sys
import json
import base64
import asyncio
import argparse
import tempfile
import edge_tts

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>__PAGE_TITLE__</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Zen+Maru+Gothic:wght@500;700;900&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Zen Maru Gothic', 'Noto Sans TC', sans-serif;
            background-color: #faf9f6;
            background-image: radial-gradient(#e0e7ff 1.5px, transparent 1.5px);
            background-size: 24px 24px;
        }
        .comic-card {
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .comic-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
        }
        .playing-card {
            border-color: #f59e0b !important;
            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3), 0 16px 28px -6px rgba(245, 158, 11, 0.25) !important;
            transform: scale(1.02) translateY(-4px);
        }
        .speech-bubble {
            position: relative;
            background: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 14px;
        }
        .speech-bubble::before {
            content: '';
            position: absolute;
            top: -10px;
            left: 24px;
            border-width: 0 10px 10px;
            border-style: solid;
            border-color: transparent transparent #e2e8f0;
            display: block;
            width: 0;
        }
        .speech-bubble::after {
            content: '';
            position: absolute;
            top: -7px;
            left: 25px;
            border-width: 0 9px 9px;
            border-style: solid;
            border-color: transparent transparent #ffffff;
            display: block;
            width: 0;
        }
    </style>
</head>
<body class="text-slate-800 min-h-screen flex flex-col justify-between">

    <!-- Top Banner -->
    <header class="bg-white/95 backdrop-blur shadow-sm border-b border-amber-100 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center space-x-3">
                <span class="text-3xl">✨</span>
                <div>
                    <h1 class="text-xl sm:text-2xl font-black text-amber-950 tracking-tight leading-tight">__LESSON_HEADER_TITLE__</h1>
                    <p class="text-xs text-amber-700/80 font-bold">逐句圖文情境對照 · 特教專注閱讀</p>
                </div>
            </div>

            <div class="flex items-center flex-wrap gap-2">
                <!-- Mode Switcher -->
                <div class="bg-amber-100/70 p-1 rounded-xl flex items-center text-xs font-bold text-amber-900 border border-amber-200/60 shadow-inner">
                    <button id="btnModeComic" onclick="switchMode('comic')" class="px-3 py-1.5 rounded-lg bg-white shadow-sm text-amber-950 flex items-center space-x-1.5 transition">
                        <i class="fa-solid fa-table-cells-large text-amber-600"></i>
                        <span>連環漫畫</span>
                    </button>
                    <button id="btnModeBook" onclick="switchMode('book')" class="px-3 py-1.5 rounded-lg text-amber-800/80 hover:text-amber-950 flex items-center space-x-1.5 transition">
                        <i class="fa-solid fa-book-open text-amber-600"></i>
                        <span>故事繪本</span>
                    </button>
                </div>

                <!-- TTS Audio Controls -->
                <div class="flex items-center space-x-1.5 bg-amber-50 p-1 rounded-xl border border-amber-200">
                    <button id="btnPlayAll" onclick="startPlayAll()" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition">
                        <i class="fa-solid fa-play"></i>
                        <span id="playAllText">朗讀全文</span>
                    </button>
                    <button id="btnPause" onclick="pausePlay()" class="px-2.5 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 active:scale-95 text-amber-950 font-bold text-xs hidden items-center space-x-1 transition" title="暫停">
                        <i class="fa-solid fa-pause"></i>
                        <span>暫停</span>
                    </button>
                    <button id="btnResume" onclick="resumePlay()" class="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs hidden items-center space-x-1 transition" title="繼續">
                        <i class="fa-solid fa-play"></i>
                        <span>繼續</span>
                    </button>
                    <button id="btnStop" onclick="stopPlay()" class="px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 active:scale-95 text-red-700 font-bold text-xs hidden items-center space-x-1 transition" title="停止">
                        <i class="fa-solid fa-stop"></i>
                        <span>停止</span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-grow">
        
        <!-- View 1: Comic Grid -->
        <div id="viewComicGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <!-- Panels injected by JS -->
        </div>

        <!-- View 2: Storybook Reader -->
        <div id="viewStoryBook" class="hidden max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-4 border-amber-200">
            <div class="flex flex-col md:flex-row gap-6 items-center">
                <!-- Large Picture -->
                <div class="w-full md:w-3/5 rounded-2xl overflow-hidden border-2 border-amber-300 shadow-md aspect-video bg-amber-50 flex items-center justify-center">
                    <img id="bookImg" src="" alt="情境圖" class="w-full h-full object-cover">
                </div>
                <!-- Story Text & Control -->
                <div class="w-full md:w-2/5 flex flex-col justify-between self-stretch py-2">
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <span id="bookBadge" class="bg-amber-100 text-amber-800 text-xs font-extrabold px-3 py-1 rounded-full border border-amber-300">
                                第一段
                            </span>
                            <span id="bookPageIndicator" class="text-xs font-bold text-slate-600">1 / 8</span>
                        </div>
                        <h3 id="bookTitle" class="text-lg font-black text-slate-800 mb-3">分鏡標題</h3>
                        <p id="bookText" class="text-xl sm:text-2xl font-bold text-slate-700 leading-relaxed tracking-wide bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                            課文內容
                        </p>
                    </div>

                    <!-- Book Nav Buttons -->
                    <div class="flex items-center justify-between pt-6 border-t border-slate-100 mt-4">
                        <button onclick="prevBookPage()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center space-x-1.5 transition">
                            <i class="fa-solid fa-chevron-left"></i>
                            <span>上一頁</span>
                        </button>
                        <button onclick="playBookCurrentAudio()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center space-x-1.5 shadow-md active:scale-95 transition">
                            <i class="fa-solid fa-volume-high"></i>
                            <span>聽這段</span>
                        </button>
                        <button onclick="nextBookPage()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center space-x-1.5 transition">
                            <span>下一頁</span>
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </main>

    <!-- Footer -->
    <footer class="bg-white/80 border-t border-amber-100 py-4 mt-8 text-center text-xs text-amber-800/80">
        <p class="font-bold">✨ 國中特教國文情境教材 · 逐句課文繪本 · 微軟 Edge-TTS 0.8x 慢速伴讀</p>
    </footer>

    <!-- Hidden Audio Player -->
    <audio id="audioPlayer" preload="auto"></audio>

    <script>
        const panelsData = __PANELS_JSON_DATA__;

        let currentMode = 'comic';
        let bookPageIndex = 0;
        let isPlayingAll = false;
        let playAllIndex = 0;
        let isPaused = false;
        const player = document.getElementById('audioPlayer');

        function renderComicGrid() {
            const container = document.getElementById('viewComicGrid');
            container.innerHTML = '';

            panelsData.forEach((panel, idx) => {
                const card = document.createElement('div');
                card.id = `comic-card-${panel.id}`;
                card.className = "comic-card bg-white rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm flex flex-col justify-between relative";

                card.innerHTML = `
                    <div>
                        <!-- Image Container with 16:9 ratio -->
                        <div class="w-full aspect-video bg-amber-50 overflow-hidden relative border-b border-slate-100">
                            <img src="${panel.b64}" alt="${panel.title}" class="w-full h-full object-cover">
                            <div class="absolute top-2.5 left-2.5 bg-amber-950/80 backdrop-blur text-amber-100 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                                第 ${panel.id} 格
                            </div>
                        </div>

                        <!-- Card Content -->
                        <div class="p-3.5">
                            <h3 class="text-xs font-black text-amber-900 mb-1.5 flex items-center justify-between">
                                <span>${panel.title}</span>
                            </h3>
                            <div class="speech-bubble p-2.5">
                                <p class="text-[13px] font-bold text-slate-700 leading-snug">
                                    ${panel.text}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Bar -->
                    <div class="px-3.5 pb-3 pt-1 flex items-center justify-end">
                        <button onclick="playSingle(${panel.id})" class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-extrabold flex items-center space-x-1 border border-amber-200 active:scale-95 transition" title="點擊朗讀此句">
                            <i class="fa-solid fa-volume-high text-amber-600"></i>
                            <span>點讀</span>
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        function switchMode(mode) {
            currentMode = mode;
            const btnComic = document.getElementById('btnModeComic');
            const btnBook = document.getElementById('btnModeBook');
            const viewComic = document.getElementById('viewComicGrid');
            const viewBook = document.getElementById('viewStoryBook');

            if (mode === 'comic') {
                btnComic.className = "px-3 py-1.5 rounded-lg bg-white shadow-sm text-amber-950 flex items-center space-x-1.5 transition";
                btnBook.className = "px-3 py-1.5 rounded-lg text-amber-800/80 hover:text-amber-950 flex items-center space-x-1.5 transition";
                viewComic.classList.remove('hidden');
                viewBook.classList.add('hidden');
            } else {
                btnBook.className = "px-3 py-1.5 rounded-lg bg-white shadow-sm text-amber-950 flex items-center space-x-1.5 transition";
                btnComic.className = "px-3 py-1.5 rounded-lg text-amber-800/80 hover:text-amber-950 flex items-center space-x-1.5 transition";
                viewComic.classList.add('hidden');
                viewBook.classList.remove('hidden');
                updateBookPage();
            }
        }

        function updateBookPage() {
            const p = panelsData[bookPageIndex];
            if (!p) return;
            document.getElementById('bookImg').src = p.b64;
            document.getElementById('bookBadge').innerText = `第 ${p.id} 格`;
            document.getElementById('bookPageIndicator').innerText = `${bookPageIndex + 1} / ${panelsData.length}`;
            document.getElementById('bookTitle').innerText = p.title;
            document.getElementById('bookText').innerText = p.text;
        }

        function nextBookPage() {
            if (bookPageIndex < panelsData.length - 1) {
                bookPageIndex++;
                updateBookPage();
            }
        }

        function prevBookPage() {
            if (bookPageIndex > 0) {
                bookPageIndex--;
                updateBookPage();
            }
        }

        function playBookCurrentAudio() {
            const p = panelsData[bookPageIndex];
            playAudioData(p.audio_b64);
        }

        function playSingle(panelId) {
            stopPlay();
            const panel = panelsData.find(x => x.id === panelId);
            if (!panel) return;
            highlightCard(panel.id);
            playAudioData(panel.audio_b64, () => {
                removeHighlight(panel.id);
            });
        }

        function playAudioData(b64Audio, onEnd) {
            player.src = b64Audio;
            player.onended = () => {
                if (onEnd) onEnd();
            };
            player.play();
        }

        function startPlayAll() {
            isPlayingAll = true;
            isPaused = false;
            playAllIndex = 0;
            updateControlUI();
            playNextInSequence();
        }

        function playNextInSequence() {
            if (!isPlayingAll) return;
            if (playAllIndex >= panelsData.length) {
                stopPlay();
                return;
            }

            const panel = panelsData[playAllIndex];
            highlightCard(panel.id);

            if (currentMode === 'book') {
                bookPageIndex = playAllIndex;
                updateBookPage();
            }

            playAudioData(panel.audio_b64, () => {
                removeHighlight(panel.id);
                playAllIndex++;
                setTimeout(() => {
                    playNextInSequence();
                }, 500);
            });
        }

        function pausePlay() {
            if (!isPlayingAll || isPaused) return;
            player.pause();
            isPaused = true;
            updateControlUI();
        }

        function resumePlay() {
            if (!isPlayingAll || !isPaused) return;
            player.play();
            isPaused = false;
            updateControlUI();
        }

        function stopPlay() {
            isPlayingAll = false;
            isPaused = false;
            player.pause();
            player.currentTime = 0;
            panelsData.forEach(p => removeHighlight(p.id));
            updateControlUI();
        }

        function highlightCard(id) {
            panelsData.forEach(p => removeHighlight(p.id));
            const card = document.getElementById(`comic-card-${id}`);
            if (card) {
                card.classList.add('playing-card');
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        function removeHighlight(id) {
            const card = document.getElementById(`comic-card-${id}`);
            if (card) {
                card.classList.remove('playing-card');
            }
        }

        function updateControlUI() {
            const btnPlay = document.getElementById('btnPlayAll');
            const btnPause = document.getElementById('btnPause');
            const btnResume = document.getElementById('btnResume');
            const btnStop = document.getElementById('btnStop');

            if (isPlayingAll) {
                btnPlay.classList.add('hidden');
                btnStop.classList.remove('hidden');
                btnStop.classList.add('flex');

                if (isPaused) {
                    btnPause.classList.add('hidden');
                    btnResume.classList.remove('hidden');
                    btnResume.classList.add('flex');
                } else {
                    btnResume.classList.add('hidden');
                    btnPause.classList.remove('hidden');
                    btnPause.classList.add('flex');
                }
            } else {
                btnPlay.classList.remove('hidden');
                btnPause.classList.add('hidden');
                btnResume.classList.add('hidden');
                btnStop.classList.add('hidden');
            }
        }

        // Keyboard arrows for storybook
        window.addEventListener('keydown', (e) => {
            if (currentMode === 'book') {
                if (e.key === 'ArrowRight') nextBookPage();
                if (e.key === 'ArrowLeft') prevBookPage();
            }
        });

        // Init
        renderComicGrid();
    </script>
</body>
</html>"""

async def build_comic_story(data_json_path, img_dir, output_path, lesson_title):
    with open(data_json_path, "r", encoding="utf-8") as f:
        panels = json.load(f)

    with tempfile.TemporaryDirectory() as temp_dir:
        for p in panels:
            img_file = p["img"]
            full_img_p = os.path.join(img_dir, img_file)
            if not os.path.exists(full_img_p):
                raise FileNotFoundError(f"Image not found: {full_img_p}")
            
            with open(full_img_p, "rb") as f_img:
                b64_img = base64.b64encode(f_img.read()).decode("utf-8")
            p["b64"] = f"data:image/jpeg;base64,{b64_img}"

            # edge-tts at 0.8x speed
            mp3_temp = os.path.join(temp_dir, f"audio_{p['id']}.mp3")
            comm = edge_tts.Communicate(p["text"], "zh-TW-HsiaoChenNeural", rate="-20%")
            await comm.save(mp3_temp)

            with open(mp3_temp, "rb") as f_aud:
                b64_aud = base64.b64encode(f_aud.read()).decode("utf-8")
            p["audio_b64"] = f"data:audio/mp3;base64,{b64_aud}"
            print(f"Generated TTS for panel {p['id']}: {p['title']}")

    panels_json = json.dumps(panels, ensure_ascii=False)
    html_code = HTML_TEMPLATE
    html_code = html_code.replace("__PAGE_TITLE__", lesson_title)
    html_code = html_code.replace("__LESSON_HEADER_TITLE__", lesson_title)
    html_code = html_code.replace("__PANELS_JSON_DATA__", panels_json)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f_out:
        f_out.write(html_code)

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Successfully generated {output_path} ({file_size_mb:.2f} MB)")

def main():
    parser = argparse.ArgumentParser(description="Build comic storybook HTML with edge-tts 0.8x audio.")
    parser.add_argument("--data-json", required=True, help="Path to panels JSON file")
    parser.add_argument("--img-dir", required=True, help="Path to images directory")
    parser.add_argument("--output", required=True, help="Output HTML file path")
    parser.add_argument("--title", default="情境漫畫故事繪本", help="Page and header title")
    args = parser.parse_args()

    asyncio.run(build_comic_story(args.data_json, args.img_dir, args.output, args.title))

if __name__ == "__main__":
    main()
