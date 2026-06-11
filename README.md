<div align="center">
<img width="1200" height="475" alt="GHBanner" src="public/assets/DFIT_LOGO.jpeg" />
</div>

# DFIT SYSTEM MANAGER

## 📌 Descripción:
Sistema de gestión administrativo y operativo de la BBDD de clientes de DFIT.

## 🛠️ Tecnologías y Herramientas
* **Frontend:** React (TypeScript, Python, HTML5, CSS3)
* **Cloud & Backend (Serverless):** AWS Amplify, Amazon API Gateway, Amazon DynamoDB, Amazon S3
* **Seguridad & Monitoreo:** AWS IAM, Amazon CloudWatch
* **Automatización:** CI/CD integrado mediante AWS Amplify

## 📐 Arquitectura Cloud Implementada
1. El frontend en **React** se aloja y distribuye globalmente mediante **AWS Amplify**.
2. Las peticiones del usuario se gestionan de forma segura a través de **API Gateway**.
3. Los datos persistentes se almacenan en tablas optimizadas de **DynamoDB**.
4. Los archivos estáticos o multimedia del cliente se guardan de forma segura en **Amazon S3**.
5. Todo el entorno cuenta con monitoreo activo de errores mediante **CloudWatch** y roles restringidos en **IAM**.

## 🤖 Flujo de Automatización y CI/CD (GitOps)
El proyecto implementa un pipeline de Integración y Despliegue Continuo (CI/CD) totalmente automatizado que optimiza el ciclo de desarrollo:

1. **Control de Versiones Local:** Gestión del código fuente mediante la terminal del IDE utilizando comandos nativos de **Git** (git add, git commit, git push).
2. **Disparador Automático (Webhook):** Al realizar un *push* hacia la rama principal en el repositorio remoto de **GitHub**, se activa un disparador automático hacia la nube.
3. **Pipeline en la Nube (AWS Amplify):** AWS Amplify detecta el cambio, inicia la etapa de construcción (*build*), compila la aplicación en **React** y realiza el despliegue (*deploy*) en los servidores de producción de forma 100% automatizada y sin interrupciones del servicio.