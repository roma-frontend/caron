/** Site-wide Armenian text constants */
export const SITE = {
  name: 'Caroon',
  tagline: 'Ձեր ավտոպահեստամասերի հարթակը Հայաստանում',
  description: 'Caroon-ը Հայաստանի առաջատար ավտոպահեստամասերի առցանց խանութն է, որը առաջարկում է լայն տեսականի բարձրորակ ապրանքների՝ անվադողեր, դիսկեր, յուղեր, ֆիլտրեր և այլ պարագաներ:',
} as const;

export const NAV = {
  catalog: 'Ցանկ',
  categories: 'Կատեգորիաներ',
  promotions: 'Ակցիաներ',
  about: 'Մեր մասին',
  contact: 'Կապ',
  carSelector: 'Ավտոմեքենայի ընտրություն',
  cart: 'Զամբյուղ',
  search: 'Որոնել...',
  login: 'Մուտք',
  register: 'Գրանցվել',
  account: 'Հաշիվ',
  favorites: 'Նախընտրվածներ',
  orderStatus: 'Պատվերի կարգավիճակ',
} as const;

export const PRODUCT = {
  addToCart: 'Ավելացնել զամբյուղ',
  outOfStock: 'Ապահովված չէ',
  featured: 'Նախագծված',
  newArrival: 'Նորամուծություն',
  sale: 'Զեղչված',
  viewAll: 'Դիտել բոլորը',
  sortNewest: 'Նորագույն',
  sortPriceAsc: 'Գինը ↑',
  sortPriceDesc: 'Գինը ↓',
  sortPopular: 'Հայտնի',
  filters: 'Ֆիլտրեր',
  items: 'տարրեր',
} as const;

export const CART = {
  title: 'Զամբյուղ',
  empty: 'Զամբյուղը դատարկ է',
  emptyDesc: 'Ավելացրու որևէ ապրանք զամբյուղում',
  continueShopping: 'Շարունակել գնումները',
  subtotal: 'Ենթագումար',
  shipping: 'Առաքում',
  total: 'Ընդահանուր գին',
  checkout: 'Պատվիրել',
  orderSummary: 'Պատվերի ամփոփում',
} as const;

export const CHECKOUT = {
  title: 'Պատվիրել',
  contactInfo: 'Կոնտակտային տվյալներ',
  fullName: 'Անուն, ազգանուն',
  phone: 'Հեռախոս',
  email: 'Էլ. փոստ',
  address: 'Հասցե',
  notes: 'Նշումներ',
  notesPlaceholder: 'Նշումներ...',
  placeOrder: 'Պատվիրել',
  paymentNote: 'Նկատարկումներ վճարման մասին',
} as const;

export const AUTH = {
  loginTitle: 'Մուտք',
  loginDesc: 'Մուտք գործեք ձեր հաշիվ',
  registerTitle: 'Գրանցվել',
  registerDesc: 'Ստեղծել նոր հաշիվ',
  email: 'Էլ. փոստ',
  password: 'Գաղտնաբառ',
  name: 'Անուն, ազգանուն',
  googleLogin: 'Google-ով մուտք',
  phone: 'Հեռախոս',
  noAccount: 'Չունեք հաշիվ?',
  hasAccount: 'Ունեք հաշիվ?',
} as const;

export const FOOTER = {
  rights: '© 2026 Caroon. Բոլոր իրավունքները պաշտպանված են։',
  navigation: 'Նավիգացիա',
  info: 'Տեղեկատվություն',
  contacts: 'Կապ',
  delivery: 'Առաքում',
  returns: 'Վերադարձ',
  privacy: 'Գաղտնիություն',
  terms: 'Պայմաններ',
} as const;

export const HOME = {
  heroBadge: 'Նորամուծություն',
  heroTitle: 'Ավտոմասեր ձեր մեքենայի համար',
  heroHighlight: 'Նորամուծություն',
  heroDesc: 'Caroon-ը Հայաստանի առաջատար ավտոպահեստամասերի առցանց խանութն է, որը առաջարկում է լայն տեսականի բարձրորակ ապրանքների՝ անվադողեր, դիսկեր, յուղեր, ֆիլտրեր և այլ պարգաներ:',
  ctaCatalog: 'Դիտել ցանկը',
  ctaCategories: 'Դիտել կատեգորիաՆերը',
  categoriesTitle: 'Կատեգորիաներ',
  featuresTitle: 'Նախագծված հատկություններ',
} as const;

export const FEATURES = [
  { key: 'delivery', title: 'Առաքում', desc: 'Առաքում ամեն օր' },
  { key: 'warranty', title: 'Երաշխիք', desc: 'Երաշխիք ամեն ապրանքի համար' },
  { key: 'support', title: '24/7 Աջակցություն', desc: 'Աջակցություն 24 ժամ' },
  { key: 'quality', title: 'Որակ', desc: 'Որակը բարձր է' },
] as const;

export const CATEGORIES_DATA = [
  { name: 'Անիվներ', slug: 'tires', icon: '🛞', count: 124 },
  { name: 'Դիսկեր', slug: 'discs', icon: '⚙️', count: 89 },
  { name: 'Յուղեր', slug: 'oils', icon: '🛢️', count: 56 },
  { name: 'Ֆիլտրեր', slug: 'filters', icon: '🔧', count: 203 },
  { name: 'Անվահեծ', slug: 'brakes', icon: '🚗', count: 78 },
  { name: 'Լամպեր', slug: 'lamps', icon: '💡', count: 145 },
  { name: 'Մարտկոցներ', slug: 'batteries', icon: '🔋', count: 34 },
  { name: 'Ակսեսուարներ', slug: 'accessories', icon: '🎯', count: 312 },
] as const;
