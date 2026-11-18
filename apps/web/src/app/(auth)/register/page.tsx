'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@bizflow/validation';
import { useAuth } from '../../../context/auth-context';
import { apiClient } from '../../../lib/api-client';
import { Lock, Mail, User, Building, Phone, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      businessName: '',
      phoneNumber: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      setIsSubmitting(true);
      setServerError(null);
      const res: any = await apiClient.post('/auth/register', data);
      if (res && res.data) {
        registerAuth(res.data.tokens, res.data.user);
      }
    } catch (err: any) {
      setServerError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-2xl mx-auto mb-4 shadow-lg shadow-teal-500/20">
            BF
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create BizFlow Account</h2>
          <p className="text-sm text-slate-400 mt-1">Set up your business organization and administrator access</p>
        </div>

        {serverError && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  {...register('fullName')}
                  placeholder="Rahul Sharma"
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
              </div>
              {errors.fullName && (
                <p className="text-xs text-red-400 mt-1">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Business Legal Name
              </label>
              <div className="relative">
                <Building className="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  {...register('businessName')}
                  placeholder="Sharma Enterprises"
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
              </div>
              {errors.businessName && (
                <p className="text-xs text-red-400 mt-1">{errors.businessName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="email"
                {...register('email')}
                placeholder="rahul@sharma-enterprises.com"
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  {...register('password')}
                  placeholder="Password@123"
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="tel"
                  {...register('phoneNumber')}
                  placeholder="+91 9876543210"
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-xs text-red-400 mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Provisioning Organization...
              </>
            ) : (
              <>
                Create Enterprise Account <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700/60 text-center">
          <p className="text-sm text-slate-400">
            Already registered?{' '}
            <Link href="/login" className="text-teal-400 hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
