'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Store, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { setAuthCookie } from '@/actions/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const register = useMutation(api.auth.register);
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Заполните обязательные поля'); return; }
    if (form.password !== form.confirm) { toast.error('Пароли не совпадают'); return; }
    if (form.password.length < 6) { toast.error('Пароль минимум 6 символов'); return; }
    setBusy(true);
    try {
      const result = await register({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password });
      setSession(result.sessionToken, { id: result.userId, name: result.name, email: result.email, role: result.role });
      await setAuthCookie(result.sessionToken);
      toast.success('Регистрация успешна');
      router.push('/');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Регистрация</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Имя *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" placeholder="Ваше имя" /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" placeholder="email@example.com" /></div>
            <div><Label>Телефон</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11" placeholder="+374 XX XXX XXX" /></div>
            <div><Label>Пароль *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11" placeholder="Минимум 6 символов" /></div>
            <div><Label>Подтвердите пароль *</Label><Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="h-11" /></div>
            <Button type="submit" disabled={busy} size="lg" className="w-full gap-2">
              <UserPlus className="h-4 w-4" /> {busy ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Уже есть аккаунт? <Link href="/login" className="font-medium text-primary hover:underline">Войти <ArrowRight className="inline h-3 w-3" /></Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
