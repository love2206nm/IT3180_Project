/**
 * @file index.ts
 * @description Central export cho toàn bộ Application Interfaces, phân theo danh mục nghiệp vụ chuẩn Clean Architecture.
 * @module application/interfaces
 */

// -----------------------------------------------------------------------------
// 1. Core Framework & Architecture Patterns
// -----------------------------------------------------------------------------
export * from './use-case.interface';
export * from './result.interface';
export * from './security-context.interface';

// -----------------------------------------------------------------------------
// 2. Security & Identity Services
// -----------------------------------------------------------------------------
export * from './password-hasher.service.interface';
export * from './auth-token.service.interface';
