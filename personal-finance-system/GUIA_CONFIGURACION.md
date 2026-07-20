# 🚀 Guía de Configuración - Sistema de Finanzas Personales

Esta guía te ayudará a configurar y ejecutar el proyecto `transaction_extractor.py` paso a paso.

## 📋 Requisitos Previos

- **macOS** (Monterey o posterior recomendado)
- **Python 3.8+** instalado
- **Docker** (opcional, pero recomendado) o **PostgreSQL** instalado localmente
- **Acceso a la base de datos de Messages** de macOS

---

## 🐳 Opción 1: Configuración con Docker (RECOMENDADA - Más Fácil)

### Paso 1: Iniciar PostgreSQL con Docker

```bash
# Desde el directorio del proyecto
docker-compose up -d
```

Esto iniciará PostgreSQL con:
- **Base de datos:** `personal_finance`
- **Usuario:** `postgres`
- **Contraseña:** `postgres`
- **Puerto:** `5432`
- El esquema se creará automáticamente

### Paso 2: Crear archivo `.env`

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```bash
# PostgreSQL Configuration
DB_HOST=localhost
DB_NAME=personal_finance
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5432

# Extractor Configuration
DAYS_BACK=30
```

### Paso 3: Crear entorno virtual de Python

```bash
# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate
```

### Paso 4: Instalar dependencias

```bash
# Instalar las dependencias
pip install -r requirements_finance.txt
```

### Paso 5: Configurar permisos de macOS

**MUY IMPORTANTE:** Para que el script pueda leer los mensajes:

1. Abre **Configuración del Sistema** → **Privacidad y Seguridad**
2. Ve a **Acceso Completo al Disco**
3. Haz clic en el **🔒** para desbloquear
4. Haz clic en **+** y agrega:
   - **Terminal** (si ejecutas desde Terminal)
   - **Cursor** o tu editor de código (si ejecutas desde ahí)
5. Reinicia Terminal/la aplicación

### Paso 6: Ejecutar el script

```bash
# Asegúrate de estar en el entorno virtual
source venv/bin/activate

# Ejecutar el extractor
python3 transaction_extractor.py
```

---

## 💻 Opción 2: Configuración Manual (Sin Docker)

### Paso 1: Instalar PostgreSQL

Si no tienes PostgreSQL instalado:

```bash
# Con Homebrew
brew install postgresql@14
brew services start postgresql@14
```

### Paso 2: Crear la base de datos

```bash
# Crear base de datos
createdb personal_finance

# O si necesitas especificar usuario
createdb -U tu_usuario personal_finance
```

### Paso 3: Ejecutar el esquema SQL

```bash
# Ejecutar el esquema
psql -d personal_finance -f finance_schema.sql

# O con usuario específico
psql -U tu_usuario -d personal_finance -f finance_schema.sql
```

### Paso 4: Crear archivo `.env`

Crea un archivo `.env` con tus credenciales:

```bash
# PostgreSQL Configuration
DB_HOST=localhost
DB_NAME=personal_finance
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_contraseña_postgres
DB_PORT=5432

# Extractor Configuration
DAYS_BACK=30
```

### Paso 5: Crear entorno virtual e instalar dependencias

```bash
# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
pip install -r requirements_finance.txt
```

### Paso 6: Configurar permisos (igual que Opción 1)

Sigue el **Paso 5** de la Opción 1.

### Paso 7: Ejecutar el script

```bash
source venv/bin/activate
python3 transaction_extractor.py
```

---

## 🎯 Opción 3: Usar el Script de Instalación Automática

El proyecto incluye un script que automatiza todo:

```bash
# Dar permisos de ejecución
chmod +x install_finance.sh

# Ejecutar instalación
./install_finance.sh
```

El script te guiará paso a paso y:
- ✅ Verificará Python y PostgreSQL
- ✅ Creará el entorno virtual
- ✅ Instalará dependencias
- ✅ Creará la base de datos
- ✅ Configurará el archivo `.env`
- ✅ Ejecutará una prueba inicial

---

## ✅ Verificar que Todo Funciona

### 1. Verificar conexión a PostgreSQL

```bash
# Con Docker
docker exec -it personal-finance-db psql -U postgres -d personal_finance

# O manualmente
psql -d personal_finance
```

### 2. Verificar que el script puede leer mensajes

```bash
# Ejecutar el script
source venv/bin/activate
python3 transaction_extractor.py
```

Deberías ver en la salida:
- ✅ Mensajes extraídos de Bancolombia
- ✅ Transacciones procesadas
- ✅ Resumen de procesamiento

### 3. Ver los logs

```bash
# Ver el log del extractor
tail -f transaction_extractor.log
```

---

## 🔍 Solución de Problemas

### Error: "Messages database not found"

**Solución:**
- Verifica que los mensajes estén sincronizados en iCloud
- iPhone: Configuración → Mensajes → Mensajes en iCloud (activado)
- Mac: Mensajes → Configuración → iMessage (misma cuenta)

### Error: "Error connecting to PostgreSQL"

**Solución con Docker:**
```bash
# Verificar que el contenedor está corriendo
docker ps

# Si no está corriendo, iniciarlo
docker-compose up -d

# Ver logs del contenedor
docker-compose logs postgres
```

**Solución sin Docker:**
```bash
# Verificar que PostgreSQL está corriendo
brew services list

# Iniciar PostgreSQL
brew services start postgresql@14
```

### Error: "Permission denied" al leer Messages

**Solución:**
- Verifica que Terminal/Cursor tiene **Acceso Completo al Disco**
- Reinicia Terminal después de otorgar permisos

### Error: "No module named 'psycopg2'"

**Solución:**
```bash
# Asegúrate de estar en el entorno virtual
source venv/bin/activate

# Reinstala las dependencias
pip install -r requirements_finance.txt
```

---

## 📊 Uso Diario

### Ejecutar manualmente

```bash
# Activar entorno virtual
source venv/bin/activate

# Ejecutar extractor
python3 transaction_extractor.py
```

### Consultar la base de datos

```bash
# Conectar a PostgreSQL
psql -d personal_finance

# Ver últimas transacciones
SELECT * FROM transactions ORDER BY transaction_date DESC LIMIT 10;

# Resumen mensual
SELECT * FROM monthly_summary;

# Ingresos vs gastos
SELECT * FROM income_vs_expenses;
```

### Configurar ejecución automática

```bash
# Dar permisos
chmod +x setup_cron_finance.sh

# Configurar cron
./setup_cron_finance.sh
```

---

## 📝 Resumen Rápido

**Para empezar rápido con Docker:**

```bash
# 1. Iniciar PostgreSQL
docker-compose up -d

# 2. Crear .env (copia el contenido de arriba)

# 3. Configurar Python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_finance.txt

# 4. Configurar permisos en macOS (Acceso Completo al Disco)

# 5. Ejecutar
python3 transaction_extractor.py
```

¡Listo! 🎉

