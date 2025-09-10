📊 Clasificación Financiera - Extensión

Este proyecto está basado en un repositorio original, pero se extendió con nuevas funcionalidades en el frontend.

✅ Cambios realizados
1. Carpeta experimental

Se creó la carpeta:

src/experimental/recent-movements/


Contiene el componente RecentMovements.jsx, que muestra ingresos, gastos y productos añadidos.

2. Servicio de API

Se creó el archivo:

src/services/movements.js


Permite obtener los movimientos recientes desde un backend o desde json-server (mock API).

3. Integración en el Dashboard

Se importó RecentMovements en Dashboard.jsx.

Ahora el Dashboard muestra:

Resumen de ingresos, gastos y balance.

Últimas transacciones.

Movimientos Recientes (conectados a json-server).

4. API Mock con json-server

Se agregó el archivo db.json en la raíz con datos de ejemplo.

Se configuró el script en package.json:

"server": "npx json-server --watch db.json --port 4000"


Permite levantar un servidor de prueba en:

http://localhost:4000/movimientos

5. Dependencias

Se instaló json-server como dependencia de desarrollo:

npm install --save-dev json-server

🚀 Cómo ejecutar

Instalar dependencias:

npm install


Iniciar backend simulado:

npm run server


Iniciar frontend:

npm start


Abrir en navegador:

http://localhost:3000/

📌 Rama actual

Este trabajo se encuentra en la rama:

feature/movimientos-recientes

🔮 Próximos pasos sugeridos

Conectar el componente RecentMovements a un backend real (Django/Node).

Ampliar el Dashboard con un botón "Ver más" para mostrar el historial completo de movimientos.

Unificar estilos con el resto de páginas (Clientes, Facturación, Inventario).

🔗 Repositorio original

Este proyecto fue descargado y extendido a partir de otro repositorio base.