# Prepara uma máquina Windows para o fluxo dos desenhos animados. Rode na pasta do projeto (o clone do repositório):
#   powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1            instala o que faltar e testa
#   powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1 -SoChecar  só mostra o que tem e o que falta
#   ... -Whisper   também instala o faster-whisper (para alinhar a gravação da sua voz; o modelo baixa ~480 MB no 1º uso)
param([switch]$SoChecar, [switch]$Whisper)
$ErrorActionPreference = "Stop"
$proj = (Get-Location).Path
if (-not (Test-Path "$proj\scripts\produzir.mjs")) { Write-Host "Rode dentro da pasta do projeto (onde está package.json)." -ForegroundColor Red; exit 1 }
function Reload-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
Reload-Path
$falta = @()

Write-Host "`n== 1. Programas ==" -ForegroundColor Cyan
$progs = @(
  @{ cmd = "git";    id = "Git.Git";                nome = "Git" },
  @{ cmd = "gh";     id = "GitHub.cli";             nome = "GitHub CLI" },
  @{ cmd = "node";   id = "OpenJS.NodeJS.LTS";      nome = "Node.js" },
  @{ cmd = "ffmpeg"; id = "Gyan.FFmpeg";            nome = "ffmpeg" },
  @{ cmd = "py";     id = "Python.Python.3.13";     nome = "Python 3 (com o lançador py)" }
)
foreach ($p in $progs) {
  if (Has $p.cmd) { Write-Host ("  ok     {0}" -f $p.nome) }
  elseif ($SoChecar) { Write-Host ("  FALTA  {0}  (winget install --id {1})" -f $p.nome, $p.id) -ForegroundColor Yellow; $falta += $p.nome }
  else { Write-Host ("  instalando {0}..." -f $p.nome); winget install --id $p.id -e --source winget --accept-package-agreements --accept-source-agreements --silent | Out-Null; Reload-Path }
}
$chrome = @("C:\Program Files\Google\Chrome\Application\chrome.exe", "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) { Write-Host "  ok     Google Chrome" }
elseif ($SoChecar) { Write-Host "  FALTA  Google Chrome  (winget install --id Google.Chrome)" -ForegroundColor Yellow; $falta += "Chrome" }
else { Write-Host "  instalando Google Chrome..."; winget install --id Google.Chrome -e --source winget --accept-package-agreements --accept-source-agreements --silent | Out-Null }

Write-Host "`n== 2. Pacotes do projeto (npm) ==" -ForegroundColor Cyan
if (Test-Path "$proj\node_modules\remotion") { Write-Host "  ok     node_modules" }
elseif ($SoChecar) { Write-Host "  FALTA  npm install" -ForegroundColor Yellow; $falta += "npm install" }
else { npm install --no-audit --no-fund }

Write-Host "`n== 3. Pacotes de som/voz (Python) ==" -ForegroundColor Cyan
$pyPk = @("numpy", "scipy", "edge_tts", "soundfile") + $(if ($Whisper) { @("faster_whisper") } else { @() })
foreach ($m in $pyPk) {
  py -c "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('$m') else 1)" 2>$null
  $ok = ($LASTEXITCODE -eq 0)
  if ($ok) { Write-Host "  ok     $m" }
  elseif ($SoChecar) { Write-Host "  FALTA  $m" -ForegroundColor Yellow; $falta += $m }
  else { py -m pip install --quiet ($m -replace "_", "-") }
}

Write-Host "`n== 4. Skill do Claude Code ==" -ForegroundColor Cyan
$dst = "$env:USERPROFILE\.claude\skills\desenho-animado"
$src = "$proj\skill\desenho-animado"
if ($SoChecar) { Write-Host ("  {0} {1}" -f $(if (Test-Path "$dst\SKILL.md") { "ok    " } else { "FALTA " }), $dst) }
else {
  if (Test-Path $dst) { New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skill-backups" | Out-Null; $bk = "$env:USERPROFILE\.claude\skill-backups\desenho-animado-" + (Get-Date -Format "yyyyMMdd-HHmmss"); Move-Item $dst $bk; Write-Host "  skill antiga guardada em $bk (fora da pasta de skills, para não duplicar)" }
  New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
  Copy-Item -Recurse $src $dst
  # aponta a skill para ESTA pasta do projeto (no PC original o caminho era outro)
  $skillMd = "$dst\SKILL.md"
  $t = [IO.File]::ReadAllText($skillMd) -replace [regex]::Escape("C:\Users\Usuario\Documents\Codex\2026-11-10\ex\outputs\visualizador\desenho-eleicoes-2026"), $proj.Replace("\", "\\").Replace("\\", "\")
  [IO.File]::WriteAllText($skillMd, $t, (New-Object Text.UTF8Encoding($false)))
  if (Test-Path "$bk\references\frames") { Copy-Item -Recurse "$bk\references\frames", "$bk\references\sheets" "$dst\references\" -ErrorAction SilentlyContinue }
  Write-Host "  skill instalada em $dst (apontando para $proj)"
}

Write-Host "`n== 5. Teste rápido ==" -ForegroundColor Cyan
if ($falta.Count) { Write-Host ("  faltando: {0}. Rode sem -SoChecar para instalar." -f ($falta -join ", ")) -ForegroundColor Yellow; exit 0 }
Reload-Path
Write-Host ("  node {0} | ffmpeg {1} | {2}" -f (node -v), ((ffmpeg -version | Select-Object -First 1) -split " ")[2], (py --version))
npx tsc --noEmit -p .; if ($LASTEXITCODE -eq 0) { Write-Host "  ok     tipos (tsc)" } else { Write-Host "  ERRO   tsc" -ForegroundColor Red }
node scripts/preflight.mjs src/videos/apagao | Select-Object -Last 1
Write-Host "`nPronto. Falta só (uma vez): gh auth login   para poder subir para o GitHub." -ForegroundColor Green
Write-Host "Teste completo (renderiza o apagão, ~15 min): npm run produzir -- apagao"
