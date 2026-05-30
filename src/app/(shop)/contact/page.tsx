import type { Metadata } from 'next';
import ContactPage from './_client';

export const metadata: Metadata = {
  title: 'Կապ',
  description: 'Կապվեք մեզ հեռախոսով, էլ. փոստով կամ այցելեք մեր խանութը: AutoParts Armenia:',
};

export default function Page() {
  return <ContactPage />;
}
