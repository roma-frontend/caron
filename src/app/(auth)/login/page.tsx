'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Mail, Lock } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { useAuthStore } from '@/store/auth';
import { setAuthCookie } from '@/actions/auth';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const login = useMutation(api.auth.login);
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { toast.error('Խնդրում ենք լրացնել բոլոր դաշտերը'); return; }
    setLoading(true);
    try {
      const result = await login(form);
      setSession(result.sessionToken, { id: result.userId, name: result.name, email: result.email, role: result.role });
      await setAuthCookie(result.sessionToken);
      toast.success(`Բարի գալուստ, ${result.name}!`);
      router.push('/admin');
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''; setError(msg.includes('Uncaught Error:') ? msg.split('Uncaught Error:')[1].split(' at ')[0].trim() : msg || 'Մուտքի սխալ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-[-15%] top-[-20%] h-[600px] w-[600px] rounded-full mesh-orb-1" style={{ background: 'radial-gradient(circle, var(--landing-orb-1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full mesh-orb-2" style={{ background: 'radial-gradient(circle, var(--landing-orb-2) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div className="hero-fade-1 w-full" style={{ maxWidth: '26rem' }}>


        <div className="rounded-2xl border bg-background/80 p-5 sm:p-8 shadow-xl backdrop-blur-sm" style={{ boxShadow: 'var(--shadow-xl)' }}>
          <div className="mb-6 text-center">
            <Link href="/" className="mb-8 flex flex-col items-center gap-3 transition-transform hover:scale-105">
              <Logo size={48} />
              <h1 className="text-2xl font-bold">Մուտք</h1>
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Էլ. փոստ</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="h-11 pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Գաղտնաբառ</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="h-11 pl-10" />
              </div>
            </div>
            {error && <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">{error}</div>}
            <Button type="submit" variant="cta" size="xl" className="w-full" disabled={loading}>
              {loading ? 'Մուտք...' : 'Մուտք'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
