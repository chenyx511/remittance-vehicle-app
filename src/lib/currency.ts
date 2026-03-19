export const getCurrencyLocale = (language: string) =>
  language.startsWith('ja') ? 'ja-JP' : 'zh-CN';

export const getDisplayCurrencyCode = (language: string) =>
  language.startsWith('ja') ? 'JPY' : 'CNY';

export const formatMoneyByLanguage = (amount: number, language: string) => {
  const locale = getCurrencyLocale(language);
  const currency = getDisplayCurrencyCode(language);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
