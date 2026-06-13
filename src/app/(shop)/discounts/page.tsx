import type { Metadata } from 'next';
import DiscountsClient from './_client';

export const metadata: Metadata = {
  title: 'Զեղչեր',
  description: 'Բոլոր զեղչված ապրանքները մեկ տեղում։ Ամենաշահավետ գները ձեզ համար։',
};

export default function Page() {
  return <DiscountsClient />;
}
