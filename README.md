# Spark Grid CRM - Node.js Backend

A scalable **Node.js backend** for the **Spark Grid CRM** application. It provides secure REST APIs, authentication, user management, customer management, lead tracking, task management, notifications, and real-time services for the CRM frontend.

---

# Overview

The Spark Grid CRM backend acts as the central API service responsible for:

- User Authentication & Authorization
- Customer Management
- Lead Management
- Employee Management
- Task & Activity Management
- Dashboard Analytics
- Notifications
- File Uploads
- Reporting
- Database Operations
- REST API Services

---

# Tech Stack

- Node.js
- Express.js
- MySQL / PostgreSQL
- JWT Authentication
- Sequelize / Prisma / Knex (Project dependent)
- Axios
- Multer
- Bcrypt
- CORS
- dotenv

---

# Features

- 🔐 JWT Authentication
- 👤 User Management
- 👥 Role & Permission Management
- 🏢 Customer Management
- 📞 Lead Management
- 📋 Task Management
- 📊 Dashboard Statistics
- 📂 File Upload
- 🔍 Search & Filtering
- 📈 Reports
- 🔔 Notifications
- 📝 Activity Logs
- 📧 Email Integration
- 🌐 RESTful APIs

---

# Project Structure

```
.
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── helpers/
├── utils/
├── uploads/
├── logs/
├── app.js
├── server.js
├── package.json
└── README.md
```

---

# Prerequisites

- Node.js 18+
- npm
- MySQL / PostgreSQL
- Git

---

# Installation

Clone the repository

```bash
git clone <repository-url>
```

Navigate to the project

```bash
cd spark-grid-crm-nodejs
```

Install dependencies

```bash
npm install
```

---

# Environment Variables

Create a `.env` file.

```env
PORT=5000

NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=spark_grid_crm
DB_USER=root
DB_PASSWORD=password

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000

UPLOAD_PATH=uploads

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

---

# Running the Project

Development

```bash
npm run dev
```

Production

```bash
npm start
```

---

# API Architecture

```
Client
   │
   ▼
Express Router
   │
   ▼
Authentication Middleware
   │
   ▼
Controller
   │
   ▼
Service Layer
   │
   ▼
Database
```

---

# Authentication Flow

```
Login Request
      │
      ▼
Validate Credentials
      │
      ▼
Generate JWT Token
      │
      ▼
Return Token
      │
      ▼
Authenticated API Access
```

---

# Main Modules

## Authentication

- Login
- Logout
- Refresh Token
- Forgot Password
- Reset Password
- Change Password

---

## User Management

- Create User
- Update User
- Delete User
- User Profile
- User Roles
- Permissions

---

## Customer Management

- Add Customer
- Update Customer
- Delete Customer
- Customer Details
- Customer Search

---

## Lead Management

- Create Lead
- Assign Lead
- Lead Status
- Lead Follow-up
- Lead Conversion

---

## Task Management

- Create Task
- Assign Task
- Update Status
- Due Date Tracking
- Task History

---

## Dashboard

- Total Customers
- Active Leads
- Pending Tasks
- Sales Summary
- Monthly Reports

---

## Notifications

- System Notifications
- Email Notifications
- User Alerts

---

# REST API Flow

```
Frontend
    │
    ▼
REST API Request
    │
    ▼
Middleware
    │
    ▼
Controller
    │
    ▼
Database
    │
    ▼
JSON Response
```

---

# Example API Response

```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": []
}
```

---

# Error Response

```json
{
  "success": false,
  "message": "Something went wrong"
}
```

---

# Security

- JWT Authentication
- Password Hashing (bcrypt)
- Role-Based Access Control (RBAC)
- Input Validation
- CORS Protection
- Environment Variable Management
- SQL Injection Prevention
- Secure Password Storage

---

# File Uploads

Supports uploading:

- Profile Images
- Customer Documents
- Lead Attachments
- Reports

Typical flow:

```
Client
   │
Upload File
   │
   ▼
Multer Middleware
   │
   ▼
Storage
   │
   ▼
Database Reference
```

---

# Logging

- API Request Logs
- Error Logs
- Authentication Logs
- Activity Logs

---

# Performance

- Database Connection Pooling
- Pagination
- Optimized SQL Queries
- Lazy Loading
- Efficient Error Handling

---

# Available Scripts

| Command     | Description               |
| ----------- | ------------------------- |
| npm install | Install dependencies      |
| npm run dev | Start development server  |
| npm start   | Start production server   |
| npm test    | Run tests (if configured) |

---

# Deployment

Build and deploy on:

- Linux Server
- Docker
- AWS EC2
- Azure
- DigitalOcean
- Render
- Railway

---

# Best Practices

- Keep business logic inside services.
- Validate all incoming requests.
- Store secrets in environment variables.
- Use async/await for database operations.
- Implement centralized error handling.
- Follow REST API standards.

---

# Troubleshooting

## Database Connection Error

- Verify database credentials in `.env`.
- Ensure the database service is running.

## Port Already in Use

```bash
lsof -i :5000
```

or change the `PORT` value in `.env`.

## Module Not Found

```bash
rm -rf node_modules
npm install
```

---

# Future Enhancements

- WebSocket Integration
- Push Notifications
- Audit Logs
- Multi-Tenant Support
- API Versioning
- Redis Caching
- Background Job Queue

---

# License

This project is proprietary and intended for internal use unless otherwise specified.

---

# Version

**v1.0.0**

---

# Author

**Spark Grid CRM Development Team**
