# 🕐 KRONO

Sistema web de gestión escolar para **PRoA**, desarrollado por **Quintero & Leyria**.

KRONO fue diseñado para optimizar y digitalizar distintas tareas de preceptoría, centralizando en una misma plataforma la gestión de asistencias, avisos, documentación, certificados y otra información académica de los estudiantes.

> ⚠️ **Este es un repositorio personal/institucional.** Además de KRONO, puede contener otros proyectos y archivos de uso propio. Si llegaste buscando el proyecto, estás en el lugar correcto.

---

## ¿Qué es KRONO?

**KRONO** es una plataforma web pensada principalmente para facilitar el trabajo de preceptoría y reducir la cantidad de tareas que deben realizar manualmente.

El sistema permite llevar un registro preciso de la asistencia de los estudiantes. Cada alumno puede acceder a un **código QR personal**, que es escaneado al ingresar a la institución y permite registrar automáticamente la **hora exacta de llegada**. A partir de estos datos, el sistema identifica las llegadas a horario, las tardanzas y las inasistencias.

Además del control de asistencia, KRONO centraliza diferentes tareas que normalmente requieren registros separados. Preceptoría puede publicar **avisos para los estudiantes**, registrar y consultar faltas, acceder a certificados y gestionar la documentación personal de cada alumno.

### Para preceptores

Los preceptores pueden:

* Consultar las asistencias e inasistencias de los estudiantes.
* Registrar y consultar llegadas tarde y sus motivos.
* Acceder a los certificados enviados por los estudiantes para justificar faltas.
* Descargar un **Excel con información sobre asistencias e inasistencias**.
* Publicar avisos generales para los estudiantes, por ejemplo, ante cambios en los horarios de ingreso o ausencia de profesores.
* Enviar avisos individuales solicitando a un estudiante documentación faltante.

### Para estudiantes

Los estudiantes pueden ingresar utilizando su **correo institucional**, mediante un sistema de verificación con un código enviado al mismo.

Desde su cuenta pueden:

* Acceder a su código QR personal para registrar su ingreso.
* Consultar sus propias faltas, incluyendo las justificadas.
* Subir certificados para justificar inasistencias.
* Recibir avisos enviados por preceptoría.
* Consultar su promedio de calificaciones.
* Recibir solicitudes relacionadas con documentación faltante y completar los documentos requeridos.

### Para directivos

Los directivos cuentan con un panel protegido mediante contraseña desde el cual pueden **consultar el flujo de información de la plataforma** y acceder a las estadísticas correspondientes.

Su función dentro del sistema es principalmente de consulta, sin modificar ni cargar información de los demás usuarios.

### Para profesores

Los profesores cuentan con un sistema de tarjetas que les permite cargar las calificaciones correspondientes a cada **materia, curso y estudiante**.

También pueden descargar la **libreta de calificaciones** seleccionando el trimestre, la materia y el curso que necesiten consultar.

---

## Stack

* **Frontend:** HTML + CSS + JavaScript
* **Backend:** Python
* **Servidor local:** XAMPP
* **Base de datos:** SQL
* **Editor recomendado:** Visual Studio Code

---

## Funcionalidades

* Registro de asistencia mediante código QR personal.
* Registro de la hora exacta de ingreso de cada estudiante.
* Clasificación automática de asistencia: **presente / tarde / ausente**.
* Registro de faltas y llegadas tarde.
* Registro de motivos y justificaciones.
* Subida y consulta de certificados.
* Panel de consulta de asistencias para preceptores.
* Consulta de faltas por parte de los estudiantes.
* Sistema de avisos generales de preceptoría.
* Sistema de avisos individuales para solicitar documentación faltante.
* Digitalización de documentos personales de los estudiantes.
* Consulta de estadísticas para directivos.
* Descarga de información de asistencias e inasistencias en formato Excel.
* Sistema de ingreso mediante correo institucional y código de verificación.
* Panel de carga de calificaciones para profesores.
* Consulta y descarga de libretas según trimestre, materia y curso.
* Consulta del promedio de calificaciones por parte de los estudiantes.

---

## Estado

🔧 **En desarrollo — Septiembre 2026**

* [x] Diseño de base de datos
* [x] Interfaz web
* [x] Conexión Python ↔ SQL
* [ ] Panel de estadísticas - Directivos
* [x] Integración código QR
* [x] Panel de registro de faltas
* [ ] Sistema de ingreso
* [ ] Chatbot (en riesgo de descarte)
* [x] Sistema de digitalización de documentación
* [ ] Panel de carga de notas

---

*Desarrollado para PRoA 🏫*

---

## Instalación

Para utilizar el proyecto, descargue el archivo `.zip` correspondiente y busque la carpeta **CÓDIGO** dentro de **TESINA**.

### Pasos

1. Asegurarse de tener instalados todos los programas y herramientas indicados anteriormente.
2. Cargar la carpeta del proyecto en XAMPP.
3. Abrir la carpeta del proyecto en **Visual Studio Code**.
4. Iniciar XAMPP.
5. Ejecutar el archivo `app.py`.
6. Abrir **Google Chrome** y acceder a la dirección correspondiente al proyecto en `localhost:8080`, utilizando la carpeta del proyecto.

Ejemplo:

```text
http://localhost:8080/carpeta/
```
