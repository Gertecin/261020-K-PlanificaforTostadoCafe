# Libreta de Tueste (261020-K-PlanificaforTostadoCafe)

Aplicación web mobile-first para planificar el tueste de café en una tostaduría costarricense que trabaja con microproductores y vende por suscripción (club de café). Calcula qué envíos caen en una semana, suma los kilos tostados por microlote, los convierte a café verde según la merma de cada café, parte ese verde en tandas que entren en el tostador, las distribuye en los días de tueste y controla el inventario de verde a cuatro semanas. La usa el tostador en la tostaduría, no el cliente final.

## URL de previsualización
https://gertecin.github.io/261020-K-PlanificaforTostadoCafe/

## Cómo correr y compilar

### Requisitos
- Node.js 18+ (descargar en https://nodejs.org)
- npm (viene incluido con Node.js)

### Pasos
1. Clonar el repositorio
   git clone https://github.com/Gertecin/261020-K-PlanificaforTostadoCafe.git
   cd 261020-K-PlanificaforTostadoCafe
2. Instalar dependencias
   npm install
3. Iniciar servidor de desarrollo
   npm run dev
4. Compilar para producción
   npm run build
5. Vista previa del build
   npm run preview
6. Ejecutar tests
   npm run test

### Configuración importante para el despliegue

Importante: base: '/261020-K-PlanificaforTostadoCafe/' en el archivo vite.config.ts es necesario para GitHub Pages bajo una subruta. Si se despliega en un dominio propio, cambiar a base: '/'.

## Gestión de claves usadas en LocalStorage

### Claves que se usa

La aplicación usa una clave en localStorage para la gestión de estado local:

Clave: tostado-cafe:v1
Contenido: Objeto JSON con microlotes, suscripciones, configuración del tostador, instantáneas de semanas enviadas e historial de compras.
Ejemplo: {"microlotes":[...],"suscripciones":[...],"config":{"capacidadTandaKg":12,"diasTueste":["lunes","miércoles"],"maxTandasPorDia":6,"horizonteSemanas":4},"sorpresaPorDefecto":"m2","sorpresaPorSemana":{},"semanasEnviadas":[],"historialCompras":[]}

### Cómo ver las claves

1. Abre el sitio en tu navegador.
2. Presiona F12 (o clic derecho → Inspeccionar).
3. Ve a la pestaña Application (Aplicación).
4. En el panel izquierdo, expande Local Storage y selecciona el dominio.
5. Verás la clave tostado-cafe:v1 con su valor actual.

### Cómo vaciar / reiniciar las claves

Abre la pestaña Console (dentro de las herramientas de desarrollador) y ejecuta:

localStorage.removeItem('tostado-cafe:v1')
location.reload()

O desde la aplicación: Más → Datos → Restaurar datos de ejemplo.

### Acceso para acceder a 'Más': 
GERtostado2026

### Como modificar la clave de 'Más': 
En el archio /src/constants.ts , cambiar la clave por la nueva:

estado inicial 
export const ADMIN_PASSWORD = 'GERtostado2026';

cambia la clave por la nueva por ejemplo 'NuevoPass2026'
export const ADMIN_PASSWORD = 'NuevoPass2026';

Compilar y subir cambios a Github

Nota de seguridad: Dado que esta es una aplicación sin backend, la clave está visible en el código fuente del navegador
Puede evitar modificaciones accidentales por parte de usuarios finales o clientes pero no se considera un sistema de seguridad. 

## Reglas de Negocio

### Envíos de la semana

Una suscripción activa tiene envío en la semana S si su proximoEnvio cae entre el lunes y el domingo de S, ambos inclusive. Para semanas futuras se proyecta avanzando la fecha según la frecuencia:
- Semanal: +7 días
- Quincenal: +14 días
- Mensual: +1 mes (mismo día del mes siguiente; si no existe, el último día de ese mes: 31/01 pasa a 28/02, o a 29/02 en año bisiesto)

Las suscripciones con proximoEnvio anterior a la semana abierta más antigua no cuentan en ninguna semana: se muestran como "envío atrasado" en un aviso con acción para corregirlas.

### Tostado, merma y verde

Demanda de tostado por microlote = suma de los tamaños de bolsa (en gramos) de los envíos de esa semana. Las suscripciones "sorpresa" suman al microlote elegido como sorpresa de esa semana (sorpresaPorSemana[lunes] o, si no hay, sorpresaPorDefecto).

Verde por microlote = tostado / (1 − merma), redondeado hacia arriba al medio kilo. Se usa aritmética entera (gramos y décimas de porcentaje) para evitar errores de coma flotante.

Ejemplo numérico: Tarrazú recibe 10 bolsas de 340 g y 3 de 1 kg:
- Tostado: 3,4 kg + 3 kg = 6,4 kg
- Verde: 6,4 / 0,85 = 7,53 kg → redondeado a 8,0 kg
- Tandas: 1 tanda de 8 kg (capacidad máxima 12 kg)

Caso de control: 10,2 kg tostados al 15% de merma = 12,0 kg de verde exactos (no 12,5 kg).

### Tandas

El verde de cada microlote se parte en tandas de hasta 12 kg (tandas completas de 12 kg y una última con el resto). Ninguna tanda supera la capacidad del tostador. Cada tanda muestra su verde y el tostado esperado (verde × (1 − merma)).

### Asignación a días

Se recorren los microlotes en el orden del catálogo y sus tandas se asignan primero al primer día de tueste (lunes) hasta 6 tandas y, si no entran, al siguiente (miércoles). Si no entran todas, las restantes quedan "sin asignar" y se muestra un aviso de capacidad semanal superada con la cantidad de tandas y kg de verde que faltan lugar. Nunca se descartan en silencio.

### Alerta de inventario

Para cada microlote, si la suma del verde planificado de las semanas del horizonte (la semana seleccionada y las 3 siguientes, 4 en total, sin contar semanas ya enviadas) es mayor que su verdeDisponibleKg, hay alerta. Se muestra el déficit en kg y la primera semana en que el acumulado supera lo disponible.

Acciones desde la alerta:
- Registrar compra de verde (simulada, suma kg al disponible y queda en el historial)
- Cambiar suscriptores de café (mover suscripciones de ese microlote a otro con holgura, mostrando cuánto le sobra)

### Marcar semana enviada

Con confirmación que resume envíos y kg de verde:
1. Para cada suscripción que tenía envío en esa semana, el próximo envío avanza 7 días, 14 días o un mes según su frecuencia.
2. Se descuenta del verde disponible el verde planificado de esa semana (nunca por debajo de 0).
3. Se guarda una instantánea de solo lectura de la semana, que es la que se muestra al volver a ella.

Incluye "Deshacer última semana enviada" que restaura los próximos envíos y el verde descontado.

### Sorpresa del tostador

Cambiar el microlote de la sorpresa de una semana recalcula de inmediato la demanda, el verde, las tandas y las alertas de esa semana y las siguientes. La app sugiere el microlote con mayor holgura en el plan de 4 semanas, sin imponerlo.

## Estructura del Proyecto

261020-K-PlanificaforTostadoCafe/
├── README.md
├── README.txt
├── .gitignore
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .github/
│   ── workflows/
│       └── deploy.yml
└── src/
    ├── main.tsx              # Punto de entrada
    ├── App.tsx               # Navegación por pestañas con hash
    ├── index.css             # Tailwind + estilos globales
    ├── lib/
    │   ├── types.ts          # Tipos TypeScript
    │   ├── calculations.ts   # Motor de cálculos (sin React)
    │   └── __tests__/
    │       ├── calculations.test.ts
    │       └── useLocalStorage.test.ts
    ├── data/
    │   └── seed.ts           # Datos de ejemplo (120 suscripciones)
    ├── state/
    │   └── useLocalStorage.ts # Hook de persistencia con clave versionada
    └── views/
        ├── SemanaView.tsx    # Pantalla principal
        ├── TuesteView.tsx    # Libreta de tueste
        ├── InventarioView.tsx # Control de stock
        ├── SuscripcionesView.tsx # Gestión de suscriptores
        └── MasView.tsx       # Configuración y datos

## Datos de Ejemplo y Restauración

La app inicia con:
- 6 microlotes con mermas y verde disponible específicos:
  - Tarrazú lavado La Pastora (15% / 180 kg)
  - West Valley Naranjo honey (16% / 60 kg)
  - Brunca natural Pérez Zeledón (17% / 45 kg)
  - Central Valley Poás lavado (14% / 120 kg)
  - Orosi anaeróbico (18% / 25 kg)
  - Guanacaste peaberry (15% / 40 kg)
- 120 suscripciones con nombres costarricenses creíbles y provincias de todo el país
- 22% en "sorpresa" (26 suscripciones)
- Sorpresa por defecto: West Valley Naranjo honey
- Tostador: 12 kg de verde por tanda, lunes y miércoles, hasta 6 tandas por día

Alertas intencionales: West Valley (35 kg) y Orosi (25 kg) disparan alerta de inventario en el plan de 4 semanas. 
La opcion del mensaje de  Cambiar la "Sorpresa del Tostador" al microlote con mayor stock en el caso de ejemplo Central Valley Poás  resuelve la alerta de West Valley. O entrar al inventario y “comprar” del microlote en falta.

Restauración: Desde Más → Datos → Restaurar datos de ejemplo se vuelven a los valores originales.

## Decisiones de Diseño

### Paleta
- #5A3A28 (café tostado): color primario y cabeceras
- #FFFFFF (blanco): fondos de tarjetas
- #2F4A3A (verde cafetal): confirmaciones y acciones secundarias
- #2A1B12 (texto oscuro): texto principal
- #92400E (ámbar oscuro): alertas (nunca rojo)
- #FAF9F6 (fondo cálido): fondo general

### Tipografía
- Poppins (títulos): font-display, font-bold
- Inter (texto): font-sans, con tabular-nums para alineación perfecta de cifras

### Colores por microlote
Cada microlote tiene un color propio, reconocible y no rojo, más una letra o sigla (TAR, WV, BRU, CV, ORO, GUA), para no depender solo del color.

### Ámbar en lugar de rojo
Las alertas se resuelven con un ámbar oscuro derivado (#92400E), siempre con ícono y texto además del color. Nunca se usa rojo para ningún texto ni cantidad.

### Funcionalidades adicionales implementadas

#### Protección del panel de administración
El panel "Más" (ruta `#/admin`) está protegido por clave de acceso. ‘GERtostado2026’ y se almacena en ‘src/constants.ts`
Para cambiarla, edita ese archivo y haz commit/push.

> ⚠️ Nota de seguridad: al ser una app frontend-only, la clave es visible en el código fuente del navegador. Esta protección evita modificaciones accidentales, no es un sistema de seguridad de grado bancario.

#### Ajuste masivo de fechas atrasadas
En la vista "Suscripciones", cuando hay suscriptores con `proximoEnvio` fuera de rango (atrasados o en día no válido), aparece un botón ámbar "🔄 Ajustar X atrasado(s)" que corrige todos a la vez. El ajuste individual por suscriptor sigue disponible.

#### Limpiar datos de la tostaduría
En Más → Datos, se agregó el botón "🗑️ Limpiar todos los datos" que pone las suscripciones y el inventario a cero, dejando un día de tueste base. Ideal para empezar de cero sin perder la configuración. Los datos de ejemplo se recuperan con el botón "Restaurar datos de ejemplo".

#### Validación de fechas en creación de suscriptores
Al crear o editar un suscriptor, el sistema valida que `proximoEnvio` caiga en un día de despacho válido (jueves o viernes). Si no, muestra un botón de ajuste inmediato.

## Notas para el Desarrollador de Backend
Esta aplicación fue construida sin backend. Toda la lógica de negocio y la persistencia corren en el cliente mediante localStorage.

### Qué está simulado

Función | Estado | Implementación
Persistencia de datos | ✅ Local | src/state/useLocalStorage.ts
Cálculo de demanda y verde | ✅ Local | src/lib/calculations.ts
Cierre de semana y deshacer | ✅ Local | cerrarSemana() y deshacerUltimaSemana()
Proyección de inventario | ✅ Local | evaluarInventario()
Envío de alertas por correo | ❌ | Preparado para integrar
Integración con proveedores | ❌ | Preparado para integrar
Autenticación de usuarios | ❌ | Un solo usuario local

## Tests

Los tests cubren:
- Cálculos de fechas (lunes, suma de días/meses, proyección de frecuencias)
- Cálculo de verde con redondeo al medio kilo (incluido caso de control)
- Generación de tandas (casos de borde)
- Asignación a días (límite de 6 tandas/día)
- Demanda de la semana (proyección de frecuencias)
- Alerta de inventario (detección de déficit)
- Cierre y deshacer de semana
- Seed (120 suscripciones, 22% sorpresa, alertas correctas)
- Persistencia (guardar, recargar, datos corruptos)

Ejecutar: npm run test

## Licencia
MIT

