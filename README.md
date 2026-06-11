<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DFIT SYSTEM MANAGER

## 📌 Descripción:
Sistema de gestión administrativo y operativo de la BBDD de clientes de DFIT.

## 🛠️ Tecnologías y Herramientas
* **Frontend:** React (JavaScript, HTML5, CSS3)
* **Cloud & Backend (Serverless):** AWS Amplify, Amazon API Gateway, Amazon DynamoDB, Amazon S3
* **Seguridad & Monitoreo:** AWS IAM, Amazon CloudWatch
* **Automatización:** CI/CD integrado mediante AWS Amplify

## 📐 Arquitectura Cloud Implementada
1. El frontend en **React** se aloja y distribuye globalmente mediante **AWS Amplify**.
2. Las peticiones del usuario se gestionan de forma segura a través de **API Gateway**.
3. Los datos persistentes se almacenan en tablas optimizadas de **DynamoDB**.
4. Los archivos estáticos o multimedia del cliente se guardan de forma segura en **Amazon S3**.
5. Todo el entorno cuenta con monitoreo activo de errores mediante **CloudWatch** y roles restringidos en **IAM**.