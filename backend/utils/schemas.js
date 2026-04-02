const { z } = require('zod');

// Auth Schemas (exisiting)
const registerSchema = z.object({
    no_customer: z.string().min(3),
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(9),
    password: z.string().min(6),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const adminLoginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});

const verifyOTPSchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
});

const resendOTPSchema = z.object({
    email: z.string().email(),
});

// Admin Schemas
const addCustomerSchema = z.object({
    no_customer: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
});

const editCustomerSchema = addCustomerSchema;

const resetPasswordSchema = z.object({
    newPassword: z.string().min(6).optional(),
});

const toggleStatusSchema = z.object({
    status: z.enum(['active', 'inactive']),
});

const adminCreateSchema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['super_admin', 'admin', 'viewer']),
});

const adminEditSchema = z.object({
    email: z.string().email(),
    role: z.enum(['super_admin', 'admin', 'viewer']),
    status: z.enum(['active', 'inactive']),
    password: z.string().optional().or(z.literal(''))
});

// Customer Update Profile Schema
const updateProfileSchema = z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    address: z.string().optional()
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6)
});

module.exports = {
    registerSchema,
    loginSchema,
    adminLoginSchema,
    verifyOTPSchema,
    resendOTPSchema,
    addCustomerSchema,
    editCustomerSchema,
    resetPasswordSchema,
    toggleStatusSchema,
    adminCreateSchema,
    adminEditSchema,
    updateProfileSchema,
    changePasswordSchema
};
