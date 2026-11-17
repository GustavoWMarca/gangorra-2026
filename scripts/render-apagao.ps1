$ErrorActionPreference = "Stop"
$env:TEMP = "$PWD\out\tmp"; $env:TMP = $env:TEMP
$chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe"
npx remotion render src/index.ts ApagaoShort out/apagao/video.mp4 --codec h264 --crf 18 --scale 0.6666666666666666 --props=out/eleicoes/props.json --gl=angle --concurrency 2 --browser-executable $chrome --log=error
npx remotion render src/index.ts LegendasApagao out/apagao/legendas.mov --codec prores --prores-profile 4444 --image-format png --pixel-format yuva444p10le --scale 0.6666666666666666 --concurrency 4 --browser-executable $chrome --log=error
Set-Location out/apagao
ffmpeg -y -loglevel error -i video.mp4 -i mix.wav -map 0:v:0 -map 1:a:0 -c:v libx264 -crf 24 -preset slow -c:a aac -b:a 192k -movflags +faststart -shortest apagao-dia-17.mp4
ffmpeg -y -loglevel error -i apagao-dia-17.mp4 -i legendas.mov -filter_complex "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]" -map "[v]" -map 0:a -c:v libx264 -crf 22 -preset slow -c:a copy -movflags +faststart apagao-dia-17-legendado.mp4
"pronto"
