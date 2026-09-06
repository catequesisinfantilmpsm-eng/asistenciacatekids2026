# Aplicación CATEKIDS — Consulta de asistencias

Esta aplicación se conecta al archivo **QR ASISTENCIA** y permite escanear las tarjetas actuales. No publica la hoja ni muestra teléfonos, tutores, fechas de nacimiento, fotografías o ubicaciones.

## Instalación en Google Sheets

1. Abre el archivo **QR ASISTENCIA**.
2. En el menú, entra a **Extensiones → Apps Script**.
3. Reemplaza el contenido de `Code.gs` por el contenido del archivo `Code.gs` de este paquete.
4. Pulsa **+ → HTML**, llámalo exactamente `Index` y pega el contenido de `Index.html`.
5. Guarda el proyecto.
6. Pulsa **Implementar → Nueva implementación**.
7. Elige **Aplicación web**.
8. En **Ejecutar como**, selecciona **Yo**.
9. En **Quién tiene acceso**, selecciona **Cualquier persona**.
10. Autoriza el acceso y copia la dirección web generada.

Los padres abrirán esa dirección, tocarán **Escanear mi tarjeta QR** y apuntarán la cámara a la tarjeta.

## Reglas de cálculo

- Inicio del ciclo: **31/08/2026**.
- Misa dominical: cada domingo transcurrido.
- Hora Santa: cada jueves transcurrido.
- Misa solemne: fechas detectadas en `QR ASISTENCIA` cuando la incidencia dice `MISA SOLEMNE`.
- Entrada y salida del mismo día cuentan como **una sola asistencia**.
- Una fecha sin registro válido aparece como falta.

## Agregar una misa solemne antes de que tenga registros

En `Code.gs`, busca:

```javascript
solemnDates: []
```

Escribe las fechas obligatorias en formato año-mes-día:

```javascript
solemnDates: ['2026-12-12', '2027-01-01']
```

Después guarda y usa **Implementar → Administrar implementaciones → Editar → Nueva versión**.

## Prueba sugerida

Pega en el campo manual este código:

`Conf2 Dulceamor De Jesús Alvarado Rojas`

La búsqueda ignora diferencias de acentos, mayúsculas y espacios.
