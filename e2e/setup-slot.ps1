# Deja un slot del sistema paralelo capaz de correr la suite Playwright por su cuenta.
#
# Nace del hallazgo 20260805-playwright-no-ejecutable-desde-un-slot: hasta agosto de 2026 ningun
# slot podia correr esta suite. Le faltaban cuatro cosas y las cuatro las resuelve este script:
#   1. @playwright/test no estaba instalado en el worktree, y el navegador tampoco.
#   2. e2e/.env.e2e no existe en el repo (esta en .gitignore porque lleva credenciales).
#   3. playwright.config.js cae por default en http://localhost:8080, que es la SPA de la carpeta
#      fija C:\wamp64\www\empresa, donde Lucas prueba a mano y donde el slot tiene PROHIBIDO tocar.
#   4. La base sembrada tambien era la de la carpeta fija (empresa_testing a secas).
#
# Convencion de puertos, para que N slots convivan sin pisarse ni pisar la carpeta fija (8000/8080):
#   API = 8100 + <numero de slot>     SPA = 8180 + <numero de slot>
#
# Uso, parado en cualquier lado:
#   powershell -NoProfile -ExecutionPolicy Bypass -File <raiz_slot>\empresa-spa\e2e\setup-slot.ps1
#
# Deja preparado el entorno y NO levanta los servidores: los imprime al final para que los corras en
# dos consolas aparte (o en background), porque son procesos de larga vida.

[CmdletBinding()]
param(
    # Salta npm install / playwright install. Util cuando solo hace falta resembrar la base.
    [switch] $SinDependencias,

    # Salta migrate:fresh + seeder. Util para no perder datos de una corrida que estas depurando.
    [switch] $SinBase
)

$ErrorActionPreference = 'Stop'

# --- Ubicacion --------------------------------------------------------------------------------
# <raiz_slot>\empresa-spa\e2e\setup-slot.ps1  ->  <raiz_slot>
$spa_dir  = Split-Path -Parent $PSScriptRoot
$raiz     = Split-Path -Parent $spa_dir
$api_dir  = Join-Path $raiz 'empresa-api'
$slot_json = Join-Path $raiz '.claude\SLOT.json'

if (-not (Test-Path $slot_json)) {
    throw "No encontre $slot_json. Este script corre adentro de un slot del sistema paralelo."
}

$slot = Get-Content $slot_json -Raw | ConvertFrom-Json
$n    = [int] $slot.slot
$base = $slot.base_datos

if ([string]::IsNullOrWhiteSpace($base)) {
    throw "SLOT.json no declara base_datos. Sin eso el harness apuntaria a la base de la carpeta fija."
}

$puerto_api = 8100 + $n
$puerto_spa = 8180 + $n
$host_local = 'empresa.local'   # ya resuelve a 127.0.0.1 en el hosts de esta maquina
$url_api    = "http://${host_local}:${puerto_api}"
$url_spa    = "http://${host_local}:${puerto_spa}"

Write-Host "slot s$n - base $base - API $url_api - SPA $url_spa"

# --- 1. Dependencias de node ------------------------------------------------------------------
if (-not $SinDependencias) {
    Write-Host "[1/5] npm install + navegador de Playwright..."
    Push-Location $spa_dir
    try {
        npm install --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw "npm install fallo (exit $LASTEXITCODE)" }
        npx playwright install chromium
        if ($LASTEXITCODE -ne 0) { throw "playwright install fallo (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[1/5] dependencias: salteado por -SinDependencias"
}

# --- 2. .env.testing de la API apuntado a los puertos del slot ---------------------------------
# El archivo esta gitignoreado (.gitignore de empresa-api, linea .env.*), asi que se edita local y
# no ensucia el repo. Se reemplaza SOLO el puerto: el resto del archivo (base, credenciales) no se
# toca, y DB_DATABASE ya tiene que decir la base del slot.
Write-Host "[2/5] .env.testing -> puertos del slot"
$env_testing = Join-Path $api_dir '.env.testing'
if (-not (Test-Path $env_testing)) {
    throw "No existe $env_testing. Copialo de .env.testing.example y poné DB_DATABASE=$base."
}
$contenido = Get-Content $env_testing -Raw
if ($contenido -notmatch "DB_DATABASE=$([regex]::Escape($base))") {
    throw "El .env.testing no apunta a $base. No sigo: sembrar la base equivocada le pisa el fixture a otro slot (o a la carpeta fija)."
}
$contenido = $contenido -replace 'APP_URL=http://[^\r\n]+',              "APP_URL=$url_spa"
$contenido = $contenido -replace 'API_URL=http://[^\r\n]+',              "API_URL=$url_api"
$contenido = $contenido -replace 'APP_IMAGES_URL=http://[^\r\n]+',       "APP_IMAGES_URL=$url_api/"
$contenido = $contenido -replace 'SANCTUM_STATEFUL_DOMAINS=[^\r\n]+',    "SANCTUM_STATEFUL_DOMAINS=${host_local}:${puerto_spa}"
$contenido = $contenido -replace 'SANCTUM_STATEFUL_CORS=[^\r\n]+',       "SANCTUM_STATEFUL_CORS=$url_spa"
Set-Content $env_testing $contenido -Encoding UTF8 -NoNewline

# --- 3. Base del slot: migrate:fresh + fixture determinista ------------------------------------
if (-not $SinBase) {
    Write-Host "[3/5] migrate:fresh + TestingFerreteriaSeeder sobre $base"
    Push-Location $api_dir
    try {
        # APP_ENV va por ENTORNO y no por --env: es lo que hace que Laravel cargue .env.testing
        # tanto aca como en el `artisan serve` de mas abajo (checkForSpecificEnvironmentFile).
        $env:APP_ENV = 'testing'
        php artisan migrate:fresh --force
        if ($LASTEXITCODE -ne 0) { throw "migrate:fresh fallo (exit $LASTEXITCODE)" }
        php artisan db:seed --class="Database\Seeders\testing\TestingFerreteriaSeeder" --force
        if ($LASTEXITCODE -ne 0) { throw "el seeder fallo (exit $LASTEXITCODE)" }

        # El usuario del fixture nace apuntando a la carpeta fija: UserSeeder siembra
        # default_version = http://empresa.local:8080 y api_url = :8000. Con eso,
        # src/mixins/check_version.js compara el origin actual contra default_version y REDIRIGE el
        # navegador apenas hay sesion, sacando al harness del slot y metiendolo en el entorno de
        # Lucas. Se corrige como dato del fixture (no tocando src/): le cambia el arranque solo a
        # este usuario de prueba, en esta base.
        # activity_minutes = 0 apaga el lock de sesion unica SOLO para el usuario de este fixture.
        # AuthHelper::ya_paso_el_tiempo() lo lee de users.activity_minutes (que la migracion crea en
        # 60) y recien cae a env('USER_ACTIVITY_MINUTES') si la columna es null: por eso tocar el
        # .env no alcanza. Sin esto, cada corrida deja el lock tomado con un session_id nuevo y la
        # SIGUIENTE corrida no puede loguear por ~60 minutos: el sintoma es un login que se queda
        # en /login sin ningun error visible. Medido el 10/8/2026: POST /login devolvia
        # {"login":false,"user_last_activity":true,"user_last_activity_wait_minutes":58}.
        $sql = "\App\Models\User::query()->update(['default_version' => '$url_spa', 'estable_version' => null, 'api_url' => '$url_api', 'activity_minutes' => 0, 'session_id' => null, 'last_activity' => null]);"
        php artisan tinker --execute="$sql"
        if ($LASTEXITCODE -ne 0) { throw "no pude apuntar default_version al puerto del slot (exit $LASTEXITCODE)" }
    } finally {
        Remove-Item Env:\APP_ENV -ErrorAction SilentlyContinue
        Pop-Location
    }
} else {
    Write-Host "[3/5] base: salteado por -SinBase"
}

# --- 4. .env.local de la SPA (gitignored) ------------------------------------------------------
Write-Host "[4/5] .env.local de la SPA"
$env_local = Join-Path $spa_dir '.env.local'
@"
# Generado por e2e/setup-slot.ps1 para el SLOT $n. No se commitea (.env.local esta en .gitignore).
VUE_APP_API_URL=$url_api
VUE_APP_APP_URL=$url_spa

# Sin esto la app NO ARRANCA: src/main.js:39 hace ``new Echo({key: process.env.VUE_APP_PUSHER_KEY})``
# y laravel-echo tira "You must pass your app key when you instantiate Pusher" ANTES de montar #app.
# El sintoma es una pagina en blanco sin un solo data-testid, y desde el test se ve como "no encuentro
# el input de login": el primer rojo de la suite salia por aca. La key de Pusher no es secreta
# (cualquier VUE_APP_* termina compilada en el bundle publico).
VUE_APP_PUSHER_KEY=98f389f62ef4a392fc77
VUE_APP_PUSHER_CLUSTER=sa1

VUE_APP_IDIOM=en
VUE_APP_APP_NAME=ComercioCity
VUE_APP_ROUTE_INDEX=article
VUE_APP_ROUTE_TO_REDIRECT_IF_UNAUTHENTICATED=login
VUE_APP_CUSTOM_CONFIGURATION_PAGE=true
VUE_APP_USE_HOME_PAGE=true
VUE_APP_USE_HELP_DROPDOWN=true
VUE_APP_HAS_EXTRA_CONFIG=true
VUE_APP_ATTEMPT_PROP=doc_number
VUE_APP_ATTEMPT_TEXT="numero de documento"

VUE_APP_USER_LAST_ACTIVITY_MINUTES=10
"@ | Set-Content $env_local -Encoding UTF8

# --- 5. e2e/.env.e2e --------------------------------------------------------------------------
# Las credenciales NO se inventan: salen de database/seeders/UserSeeder.php (doc_number 1234 /
# password 1234). El login de la SPA es por numero de documento, no por email, aunque la variable
# se llame E2E_EMAIL (ver e2e/.env.e2e.example).
Write-Host "[5/5] e2e/.env.e2e"
@"
# Generado por e2e/setup-slot.ps1 para el SLOT $n. No se commitea.
E2E_BASE_URL=$url_spa

E2E_EMAIL=1234
E2E_PASSWORD=1234
"@ | Set-Content (Join-Path $PSScriptRoot '.env.e2e') -Encoding UTF8

Write-Host ""
Write-Host "Listo. Levanta los dos servidores (cada uno en su consola) y despues corre la suite:"
Write-Host ""
Write-Host "  cd $api_dir; `$env:APP_ENV='testing'; php artisan serve --host=$host_local --port=$puerto_api"
Write-Host "  cd $spa_dir; `$env:NODE_OPTIONS='--openssl-legacy-provider'; npx vue-cli-service serve --host $host_local --port $puerto_spa"
Write-Host "  cd $spa_dir; npm run test:e2e"
Write-Host ""
Write-Host "La primera compilacion de la SPA tarda varios minutos; espera a que diga 'Compiled successfully'."
