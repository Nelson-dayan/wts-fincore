# Access Control Architecture

## Overview
This document outlines the multi-company access control architecture implemented in Sec-DocuTrade. Access control enforces a hybrid Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC), and Multi-Tenant Resource Scoping model.

## Core Components

### 1. Centralized Authorization Engine (`authorizeResource`)
- **Status**: [VERIFIED]
- **Location**: `src/lib/auth/authorization.ts`
- **Behavior**: Evaluates session authentication, active company context, user company membership, group scope permissions, project assignment scoping (for employees), and fine-grained capability permissions (`ResourceAction`).
- **Enforcement**: Applied across all API handlers (`src/app/api/admin/*`) and resource endpoints.

### 2. Multi-Company Scoping & Context Resolution
- **Status**: [VERIFIED]
- **Location**: `src/lib/auth/company-context.ts`
- **Behavior**: Resolves active company context from request headers (`x-company-id`), cookies, or primary user membership. Automatically derives `effectiveCompanyId` and `assignedProjectIds` for database queries.

### 3. Capability Permission Matrix
- **Status**: [VERIFIED]
- **Location**: `src/lib/auth/permissions.ts`
- **Behavior**: Maps fine-grained capability strings (e.g., `quotations.view`, `quotations.edit`, `clients.delete`, `payments.delete`) to user roles (`admin`, `employee`, `super_admin`).

## Scoping Levels
1. **Public**: Endpoint accessible without session token (`/api/public/quotations/[id]`, `/api/register`, `/api/auth/*`). [VERIFIED]
2. **Authentication**: Enforces valid user session (`requireSession`). [VERIFIED]
3. **Company Scoped**: Scoped strictly to user's active company membership. [VERIFIED]
4. **Group Scoped**: Available only to Group Admins with `groupView.access` enabled. [VERIFIED]
5. **Project Scoped**: Scoped strictly to employee project assignments (`assignedProjectIds`). [VERIFIED]
6. **Resource Scoped**: Directly checks resource document `companyId` and ownership. [VERIFIED]
7. **Super Admin**: Bypasses company restriction for global administration while logging all activities. [VERIFIED]
